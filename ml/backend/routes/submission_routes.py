from fastapi import APIRouter, BackgroundTasks

from ..controllers import submission_controller
from ..dependencies import ActorDep, DuplicateModelDep, MatcherDep, RepositoryDep, SettingsDep, SrsServiceDep
from ..models.schemas import AnalyzeRequest, DecisionRequest
from ..repositories.base import SRS_PENDING

router=APIRouter(prefix="/api/submissions", tags=["Submissions"])


@router.post("/analyze")
async def analyze(
    payload:AnalyzeRequest,
    repository:RepositoryDep,
    actor:ActorDep,
    matcher:MatcherDep,
    model:DuplicateModelDep,
    settings:SettingsDep
):
    return await submission_controller.analyze_submission(payload, actor, repository, matcher, model, settings)


@router.post("/{session_id}/decision")
async def decide(
    session_id:str,
    payload:DecisionRequest,
    repository:RepositoryDep,
    actor:ActorDep,
    settings:SettingsDep,
    srs_service:SrsServiceDep,
    background:BackgroundTasks
):
    result=await submission_controller.decide_submission(session_id, payload, actor, repository, settings)
    srs=result.get("srs") or {}

    if srs.get("status") == SRS_PENDING and not result.get("replayed"):
        background.add_task(srs_service.generate_in_background,srs["problem_id"])

    return result
