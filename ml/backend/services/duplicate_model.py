import logging
from pathlib import Path
from typing import Any

from nlp.classifier.classifier import DuplicateMLPClassifier, ModelUnavailable
from nlp.features import MissingFeatureError
from nlp.matcher import METHOD_EMBEDDING, Candidate

logger=logging.getLogger("devbridge")

Record=dict[str,Any]


class DuplicateModel:
    def __init__(self,classifier:DuplicateMLPClassifier|None,code:str|None=None,message:str|None=None):
        self.classifier=classifier
        self.code=code
        self.message=message

    @classmethod
    def load(cls,path:Path,embedding_model:str,embedding_provider:str|None=None)->"DuplicateModel":
        try:
            return cls(DuplicateMLPClassifier.load(path,embedding_model,embedding_provider))
        except ModelUnavailable as error:
            logger.warning("Duplicate model not loaded: %s",error.message)

            return cls(None,error.code,error.message)

    @property
    def available(self)->bool:
        return self.classifier is not None

    def status(self)->Record:
        if not self.available:
            return {"available":False,"reason":self.code,"message":self.message}

        metadata=self.classifier.metadata

        return {
            "available":True,
            "reason":None,
            "message":None,
            "threshold":self.classifier.threshold,
            "training_dataset_version":metadata.get("training_dataset_version"),
            "embedding_provider":metadata.get("embedding_provider"),
            "embedding_model":metadata.get("embedding_model"),
            "trained_at":metadata.get("trained_at")
        }

    def assess(self,candidate:Candidate)->Record|None:
        if not self.available or candidate.method != METHOD_EMBEDDING:
            return None

        try:
            return self.classifier.assess(candidate.features)
        except MissingFeatureError:
            return None
