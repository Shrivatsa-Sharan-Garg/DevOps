from typing import Any

from nlp.errors import ProviderDisabled

from ..config.settings import Settings
from ..errors import AppError, consent_required, not_found
from ..models.schemas import SrsGenerateRequest, SrsUpdateRequest
from ..repositories.base import Repository
from ..services.serializers import srs_view
from ..services.srs_service import SrsService, generation_state
from ..utils import utc_now_iso
from .problem_controller import require_problem

Record=dict[str, Any]


def _versions_summary(documents:list[Record])->list[Record]:
    return [
        {"version":item["version"],"status":item["status"],"updated_at":item["updated_at"]}
        for item in documents
    ]


async def get_srs(problem_id:str, version:int|None, repository:Repository)->Record:
    problem=await require_problem(problem_id, repository)
    documents=await repository.list_srs_versions(problem_id)
    generation=generation_state(problem,bool(documents))

    if not documents:
        return {"document":None,"versions":[],"generation":generation}

    selected=documents[-1]

    if version is not None:
        selected=next((item for item in documents if item["version"] == version), None)

        if selected is None:
            raise not_found("This SRS version")

    return {"document":srs_view(selected),"versions":_versions_summary(documents),"generation":generation}


async def generate_srs(
    problem_id:str,
    payload:SrsGenerateRequest,
    actor:Record|None,
    repository:Repository,
    service:SrsService,
    settings:Settings
)->Record:
    if not settings.ai_enabled:
        raise ProviderDisabled("AI generation is turned off for this server.", provider="openrouter")

    if not payload.ai_consent:
        raise consent_required()

    problem=await require_problem(problem_id, repository)
    is_author=actor is not None and actor["id"] == problem.get("author_id")

    if not problem.get("ai_processing_allowed", False) and not is_author:
        raise AppError(403, "ai_not_permitted", "The author of this problem did not allow AI processing.")

    document=await service.generate(problem_id,pending_only=False)

    if document is None:
        raise AppError(409, "srs_in_progress", "An SRS is already being generated for this problem.")

    return await get_srs(problem_id, None, repository)


async def update_srs(problem_id:str, version:int, payload:SrsUpdateRequest, repository:Repository)->Record:
    await require_problem(problem_id, repository)
    status="reviewed" if payload.mark_reviewed else "edited"
    changes={"markdown":payload.markdown,"status":status,"updated_at":utc_now_iso()}
    document=await repository.update_srs(problem_id, version, changes)

    if document is None:
        raise not_found("This SRS version")

    return await get_srs(problem_id, version, repository)
