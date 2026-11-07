from typing import Annotated, Any

from fastapi import Depends, Header, Request

from nlp.matcher import SemanticMatcher
from nlp.srs import SrsGenerator

from .config.settings import Settings
from .errors import sign_in_required
from .repositories.base import Repository


def get_repository(request:Request)->Repository:
    return request.app.state.repository


def get_app_settings(request:Request)->Settings:
    return request.app.state.settings


def get_matcher(request:Request)->SemanticMatcher:
    return request.app.state.matcher


def get_srs_generator(request:Request)->SrsGenerator:
    return request.app.state.srs_generator


RepositoryDep=Annotated[Repository, Depends(get_repository)]
SettingsDep=Annotated[Settings, Depends(get_app_settings)]
MatcherDep=Annotated[SemanticMatcher, Depends(get_matcher)]
SrsGeneratorDep=Annotated[SrsGenerator, Depends(get_srs_generator)]


async def get_actor(
    repository:RepositoryDep,
    x_demo_user_id:Annotated[str|None, Header()]=None
)->dict[str, Any]|None:
    if not x_demo_user_id:
        return None

    return await repository.get_user(x_demo_user_id)


ActorDep=Annotated[dict[str, Any]|None, Depends(get_actor)]


async def require_actor(actor:ActorDep)->dict[str, Any]:
    if actor is None:
        raise sign_in_required()

    return actor


RequiredActorDep=Annotated[dict[str, Any], Depends(require_actor)]
