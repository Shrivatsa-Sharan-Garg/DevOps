import asyncio
import time

from fastapi.testclient import TestClient

from backend.main import create_app
from nlp.errors import ProviderUnavailable

from .conftest import MEMBER, draft

CANONICAL="syn-prob-001"


def analyze(client, **changes):
    response=client.post("/api/submissions/analyze", json=draft(**changes), headers=MEMBER)
    assert response.status_code == 200

    return response.json()


def decide(client, session, decision, target=None):
    body={"decision":decision,"target_problem_id":target}
    response=client.post(f"/api/submissions/{session['session_id']}/decision", json=body, headers=MEMBER)
    assert response.status_code == 200

    return response.json()


def srs_of(client, problem_id):
    return client.get(f"/api/problems/{problem_id}/srs").json()


def stored_session(client, session_id):
    return asyncio.run(client.app.state.repository.get_match_session(session_id))


def test_ann_runs_during_live_analysis(model_client):
    session=analyze(model_client)

    assert session["match_method"] == "embedding"
    assert session["model"]["used"] is True
    assert session["candidates"]

    for candidate in session["candidates"]:
        assessment=candidate["model_assessment"]
        assert assessment["prediction"] in ("same_underlying", "not_same")
        assert 0.0 <= assessment["probability"] <= 1.0


def test_ann_output_is_kept_with_feedback(model_client):
    session=analyze(model_client)
    decide(model_client, session, "none")
    feedback=asyncio.run(model_client.app.state.repository.list_feedback())

    assert feedback
    assert all(item["model_assessment"] is not None for item in feedback)


def test_ann_never_decides_for_the_user(model_client):
    session=analyze(model_client)
    before=model_client.get("/api/problems?page_size=1").json()["total"]

    assert stored_session(model_client, session["session_id"])["status"] == "open"
    assert model_client.get("/api/problems?page_size=1").json()["total"] == before


def test_scenario_a_same_problem_reuses_the_canonical_srs(model_client, text_provider):
    model_client.post(f"/api/problems/{CANONICAL}/srs", json={"ai_consent":True})
    prompts=len(text_provider.prompts)
    before=model_client.get(f"/api/problems/{CANONICAL}").json()
    session=analyze(model_client)
    result=decide(model_client, session, "same", CANONICAL)
    after=model_client.get(f"/api/problems/{CANONICAL}").json()

    assert result["report_id"]
    assert result["problem_id"] == CANONICAL
    assert result["srs"] == {"problem_id":CANONICAL,"status":"generated","shared":True}
    assert len(text_provider.prompts) == prompts
    assert [item["version"] for item in srs_of(model_client, CANONICAL)["versions"]] == [1]
    assert after["description"] == before["description"]
    assert after["upvote_count"] == before["upvote_count"]
    assert after["report_count"] == before["report_count"]+1


def test_scenario_b_related_problem_gets_its_own_srs(model_client, text_provider):
    session=analyze(model_client)
    result=decide(model_client, session, "related", CANONICAL)
    created=result["problem_id"]

    assert created != CANONICAL
    assert result["relationship_id"]
    assert result["srs"]["shared"] is False
    assert srs_of(model_client, created)["document"]["version"] == 1
    assert srs_of(model_client, created)["generation"]["status"] == "generated"
    assert srs_of(model_client, CANONICAL)["document"] is None
    assert len(text_provider.prompts) == 1


def test_scenario_c_new_problem_gets_an_srs_automatically(model_client, text_provider):
    session=analyze(model_client, title="Village library has no catalogue of its books", tags=["library"])
    result=decide(model_client, session, "none")

    assert result["srs"]["status"] == "pending"
    assert srs_of(model_client, result["problem_id"])["generation"]["status"] == "generated"
    assert "Village library" in text_provider.prompts[0]


def test_scenario_d_openrouter_down_keeps_the_problem_and_allows_retry(model_client, text_provider):
    text_provider.error=ProviderUnavailable("OpenRouter is down.", provider="openrouter")
    session=analyze(model_client)
    created=decide(model_client, session, "none")["problem_id"]

    assert model_client.get(f"/api/problems/{created}").status_code == 200

    failed=srs_of(model_client, created)
    assert failed["generation"]["status"] == "failed"
    assert failed["generation"]["error"]["code"] == "ai_unavailable"
    assert failed["versions"] == []

    text_provider.error=None
    retried=model_client.post(f"/api/problems/{created}/srs", json={"ai_consent":True}, headers=MEMBER)

    assert retried.status_code == 201
    assert [item["version"] for item in retried.json()["versions"]] == [1]


def test_scenario_e_missing_model_keeps_candidate_review_working(client):
    session=analyze(client)

    assert session["candidates"]
    assert session["model"]["used"] is False
    assert session["model"]["reason"] == "model_missing"
    assert all(candidate["model_assessment"] is None for candidate in session["candidates"])
    assert decide(client, session, "same", session["candidates"][0]["problem"]["id"])["report_id"]


def test_scenario_f_cloudflare_down_never_fabricates_cosine(model_client, embedder):
    embedder.error=ProviderUnavailable("Cloudflare is down.", provider="cloudflare")
    session=analyze(model_client)
    saved=stored_session(model_client, session["session_id"])

    assert session["match_method"] == "keyword"
    assert session["ai"]["used"] is False
    assert session["model"]["reason"] == "needs_embeddings"
    assert all(candidate["features"]["cosine_similarity"] is None for candidate in saved["candidates"])
    assert all(candidate["model_assessment"] is None for candidate in session["candidates"])
    assert decide(model_client, session, "none")["problem_id"]


def test_no_consent_means_no_automatic_srs(client, text_provider):
    session=analyze(client, ai_consent=False)
    result=decide(client, session, "none")

    assert result["srs"]["status"] == "not_requested"
    assert srs_of(client, result["problem_id"])["generation"]["status"] == "not_requested"
    assert text_provider.prompts == []


def test_pending_srs_resumes_after_a_restart(settings, embedder, text_provider):
    text_provider.error=ProviderUnavailable("Down.", provider="openrouter")

    with TestClient(create_app(settings=settings, embedding_provider=embedder, text_provider=text_provider)) as first:
        created=decide(first, analyze(first), "none")["problem_id"]
        asyncio.run(first.app.state.repository.set_srs_state(created, {"srs_status":"pending"}))

    text_provider.error=None

    with TestClient(create_app(settings=settings, embedding_provider=embedder, text_provider=text_provider)) as second:
        deadline=time.monotonic()+10

        while srs_of(second, created)["generation"]["status"] != "generated" and time.monotonic() < deadline:
            time.sleep(0.05)

        assert srs_of(second, created)["generation"]["status"] == "generated"
        assert [item["version"] for item in srs_of(second, created)["versions"]] == [1]
