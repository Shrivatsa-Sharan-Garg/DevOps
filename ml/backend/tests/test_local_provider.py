import asyncio

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.config.settings import Settings
from backend.main import build_providers, create_app
from backend.services.duplicate_model import DuplicateModel
from nlp.classifier.classifier import DuplicateMLPClassifier
from nlp.errors import ProviderBadResponse, ProviderNotConfigured
from nlp.providers.local import LocalEmbeddingProvider, MODEL_ID
from nlp.usage_guard import UsageGuard


class FakeSentenceTransformer:
    def __init__(self):
        self.calls=[]

    def encode(self,texts,**kwargs):
        self.calls.append((list(texts),kwargs))
        return np.array([[1.0,float(len(text)),2.0] for text in texts])


def model_folder(tmp_path):
    tmp_path.mkdir(parents=True,exist_ok=True)
    (tmp_path/"modules.json").write_text("[]",encoding="utf-8")
    (tmp_path/"model.safetensors").write_bytes(b"test-only mock weights")
    return tmp_path


def test_local_provider_batches_on_cpu_loads_once_and_never_uses_hub(tmp_path):
    path=model_folder(tmp_path)
    model=FakeSentenceTransformer()
    load_calls=[]

    def loader(model_path,**kwargs):
        load_calls.append((model_path,kwargs))
        return model

    provider=LocalEmbeddingProvider(path,batch_size=8,model_loader=loader)
    first=asyncio.run(provider.embed(["first sentence","second sentence"]))
    second=asyncio.run(provider.embed(["third sentence"]))

    assert provider.is_configured
    assert provider.model_id == MODEL_ID
    assert len(first) == 2 and len(second) == 1
    assert all(len(vector) == 3 for vector in first+second)
    assert len(load_calls) == 1
    assert load_calls[0][1] == {"device":"cpu","local_files_only":True,"trust_remote_code":False}
    assert model.calls[0][1]["batch_size"] == 8


def test_local_provider_empty_batch_does_not_load_model(tmp_path):
    provider=LocalEmbeddingProvider(tmp_path,model_loader=lambda *_args,**_kwargs:pytest.fail("unexpected load"))
    assert asyncio.run(provider.embed([])) == []


def test_missing_local_model_reports_path_and_setting(tmp_path):
    missing=tmp_path/"not-downloaded"
    provider=LocalEmbeddingProvider(missing)

    with pytest.raises(ProviderNotConfigured) as error:
        asyncio.run(provider.embed(["problem description"]))

    assert str(missing) in error.value.message
    assert "MINILM_MODEL_PATH" in error.value.message


def test_invalid_model_directory_is_not_treated_as_a_model(tmp_path):
    (tmp_path/"config.json").write_text("{}",encoding="utf-8")
    provider=LocalEmbeddingProvider(tmp_path,model_loader=lambda *_args,**_kwargs:pytest.fail("unexpected load"))
    assert not provider.is_configured


def test_invalid_or_zero_model_output_is_rejected(tmp_path):
    model_folder(tmp_path)

    class InvalidModel:
        def encode(self,texts,**_kwargs):
            return np.zeros((len(texts),3))

    provider=LocalEmbeddingProvider(tmp_path,model_loader=lambda *_args,**_kwargs:InvalidModel())
    with pytest.raises(ProviderBadResponse,match="zero embeddings"):
        asyncio.run(provider.embed(["text"]))


def test_blank_text_is_rejected(tmp_path):
    provider=LocalEmbeddingProvider(tmp_path)
    with pytest.raises(ValueError,match="blank text"):
        asyncio.run(provider.embed(["  "]))


def test_local_mode_is_default_and_needs_no_cloudflare_or_openrouter(tmp_path):
    settings=Settings(_env_file=None,minilm_model_path=tmp_path)
    guard=UsageGuard(tmp_path/"usage.json",{})
    embedding,text=build_providers(settings,guard)

    assert settings.ai_provider_mode == "local"
    assert embedding.name == "minilm"
    assert embedding.model_id == MODEL_ID
    assert embedding.model_path == tmp_path
    assert not text.is_configured
    assert not settings.cloudflare_account_id and not settings.cloudflare_api_token


def test_settings_accept_new_path_and_legacy_model_path(monkeypatch,tmp_path):
    monkeypatch.setenv("MINILM_MODEL_PATH",str(tmp_path/"new"))
    assert Settings(_env_file=None).minilm_model_path == tmp_path/"new"
    monkeypatch.delenv("MINILM_MODEL_PATH")
    monkeypatch.setenv("MODEL_PATH",str(tmp_path/"legacy"))
    assert Settings(_env_file=None).minilm_model_path == tmp_path/"legacy"


def test_backend_starts_with_mocked_local_embeddings_and_no_external_keys(tmp_path,settings):
    path=model_folder(tmp_path/"minilm")
    model=FakeSentenceTransformer()
    provider=LocalEmbeddingProvider(path,model_loader=lambda *_args,**_kwargs:model)
    classifier=DuplicateMLPClassifier.fit(
        np.array([[0.1,0.2,0.3,0.0],[0.9,0.8,0.7,1.0],[0.4,0.6,0.2,0.5],[0.8,0.7,0.6,0.8]]),
        np.array([0,1,0,1]),
        random_state=7,
    )
    classifier.metadata={"embedding_provider":"minilm","embedding_model":MODEL_ID}
    settings.minilm_model_path=path
    app=create_app(settings=settings,embedding_provider=provider,duplicate_model=DuplicateModel(classifier))

    with TestClient(app) as client:
        assert client.get("/docs").status_code == 200
        assert app.state.embedding_provider.name == "minilm"
        assert not app.state.text_provider.is_configured

    assert len(model.calls) == 1
