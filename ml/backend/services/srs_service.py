import asyncio
import logging
from datetime import timedelta
from typing import Any

from nlp.errors import AIProviderError
from nlp.srs import SrsContext, SrsGenerator

from ..config.settings import Settings
from ..repositories.base import (
    SRS_FAILED,
    SRS_GENERATED,
    SRS_GENERATING,
    SRS_NOT_STARTED,
    SRS_PENDING,
    Repository
)
from ..utils import utc_now, utc_now_iso

logger=logging.getLogger("devbridge")

Record=dict[str,Any]

MAX_REPORTS_IN_PROMPT=5
MAX_REPORT_CHARS=800
STALE_AFTER_MINUTES=15


async def build_context(problem:Record,repository:Repository)->SrsContext:
    reports=await repository.list_reports(problem["id"])
    allowed=[report for report in reports if report.get("ai_processing_allowed",False)]
    texts=[report["description"][:MAX_REPORT_CHARS] for report in allowed[:MAX_REPORTS_IN_PROMPT]]

    return SrsContext(
        title=problem["title"],
        description=problem["description"],
        category=problem.get("category",""),
        tags=problem.get("tags",[]),
        outcome=problem.get("outcome",""),
        constraints=problem.get("constraints",""),
        community_reports=texts
    )


def generation_state(problem:Record,has_document:bool)->Record:
    status=problem.get("srs_status")

    if status is None:
        status=SRS_GENERATED if has_document else SRS_NOT_STARTED

    return {
        "status":status,
        "error":problem.get("srs_error"),
        "updated_at":problem.get("srs_updated_at")
    }


def _error_details(error:Exception)->Record:
    if isinstance(error,AIProviderError):
        return {"code":error.code,"message":error.message,"retry_after":error.retry_after}

    return {"code":"srs_failed","message":"The SRS could not be generated.","retry_after":None}


class SrsService:
    def __init__(self,repository:Repository,generator:SrsGenerator,settings:Settings):
        self.repository=repository
        self.generator=generator
        self.settings=settings
        self._tasks:set[asyncio.Task]=set()

    async def generate(self,problem_id:str,pending_only:bool)->Record|None:
        stale_before=(utc_now()-timedelta(minutes=STALE_AFTER_MINUTES)).isoformat()
        problem=await self.repository.claim_srs_generation(problem_id,pending_only,stale_before,utc_now_iso())

        if problem is None:
            return None

        try:
            draft=await self.generator.generate(await build_context(problem,self.repository))
        except Exception as error:
            failure={"srs_status":SRS_FAILED,"srs_error":_error_details(error),"srs_updated_at":utc_now_iso()}
            await self.repository.set_srs_state(problem_id,failure)
            raise

        timestamp=utc_now_iso()
        document=await self.repository.save_srs({
            "problem_id":problem_id,
            "markdown":draft.markdown,
            "status":"ai_draft",
            "model":draft.model,
            "is_complete":draft.is_complete,
            "warnings":draft.warnings,
            "generated_at":timestamp,
            "updated_at":timestamp
        })
        await self.repository.set_srs_state(problem_id,{"srs_status":SRS_GENERATED,"srs_error":None,"srs_updated_at":timestamp})

        return document

    async def generate_in_background(self,problem_id:str)->None:
        try:
            await self.generate(problem_id,pending_only=True)
        except Exception as error:
            logger.warning("SRS generation failed for %s: %s",problem_id,error)

    def schedule(self,problem_id:str)->None:
        task=asyncio.create_task(self.generate_in_background(problem_id))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def resume_unfinished(self)->list[str]:
        problem_ids=await self.repository.problem_ids_with_srs_status((SRS_PENDING,SRS_GENERATING))

        for problem_id in problem_ids:
            await self.repository.set_srs_state(problem_id,{"srs_status":SRS_PENDING})
            self.schedule(problem_id)

        return problem_ids

    async def stop(self)->None:
        for task in list(self._tasks):
            task.cancel()

        await asyncio.gather(*self._tasks,return_exceptions=True)
