from pathlib import Path
from typing import Any

import joblib
import numpy as np
import sklearn
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler

from ..features import FEATURE_SCHEMA_VERSION, MODEL_FEATURES, model_feature_vector

ARTIFACT_VERSION=2
DEFAULT_MODEL_PATH=Path(__file__).with_name("artifact_mlp_model.pkl")
DEFAULT_THRESHOLD=0.5
HIDDEN_NEURONS=8
MAX_ITERATIONS=2000

PREDICTION_SAME="same_underlying"
PREDICTION_NOT_SAME="not_same"


class ModelUnavailable(Exception):
    def __init__(self,code:str,message:str):
        super().__init__(message)
        self.code=code
        self.message=message


def build_network(random_state:int)->MLPClassifier:
    return MLPClassifier(
        hidden_layer_sizes=(HIDDEN_NEURONS,),
        activation="relu",
        solver="adam",
        max_iter=MAX_ITERATIONS,
        random_state=random_state
    )


def _minor_version(version:str)->str:
    return ".".join(version.split(".")[:2])


class DuplicateMLPClassifier:
    def __init__(self,network:MLPClassifier,scaler:StandardScaler,threshold:float=DEFAULT_THRESHOLD,metadata:dict[str,Any]|None=None):
        self.network=network
        self.scaler=scaler
        self.threshold=threshold
        self.metadata=metadata or {}

    @classmethod
    def fit(cls,features:np.ndarray,targets:np.ndarray,random_state:int,threshold:float=DEFAULT_THRESHOLD)->"DuplicateMLPClassifier":
        if len(np.unique(targets)) < 2:
            raise ValueError("Training data must contain at least one positive and one negative example.")

        scaler=StandardScaler().fit(features)
        network=build_network(random_state).fit(scaler.transform(features),targets)

        return cls(network,scaler,threshold)

    def probabilities(self,features:np.ndarray)->np.ndarray:
        return self.network.predict_proba(self.scaler.transform(features))[:,1]

    def assess(self,features:dict[str,Any])->dict[str,Any]:
        vector=np.array([model_feature_vector(features)])
        probability=float(self.probabilities(vector)[0])
        prediction=PREDICTION_SAME if probability >= self.threshold else PREDICTION_NOT_SAME

        return {
            "prediction":prediction,
            "probability":round(probability,4),
            "threshold":self.threshold
        }

    def save(self,path:Path=DEFAULT_MODEL_PATH)->None:
        payload={
            "artifact_version":ARTIFACT_VERSION,
            "network":self.network,
            "scaler":self.scaler,
            "feature_names":list(MODEL_FEATURES),
            "feature_schema_version":FEATURE_SCHEMA_VERSION,
            "threshold":self.threshold,
            "sklearn_version":sklearn.__version__,
            "metadata":self.metadata
        }
        joblib.dump(payload,path)

    @classmethod
    def load(cls,path:Path=DEFAULT_MODEL_PATH,embedding_model:str|None=None)->"DuplicateMLPClassifier":
        if not Path(path).exists():
            raise ModelUnavailable("model_missing","No trained duplicate model was found. Run the training command first.")

        try:
            payload=joblib.load(path)
        except Exception as error:
            raise ModelUnavailable("model_unreadable",f"The duplicate model file could not be read: {error}") from error

        if not isinstance(payload,dict) or payload.get("artifact_version") != ARTIFACT_VERSION:
            raise ModelUnavailable("model_incompatible","The duplicate model was made by an older training script. Retrain it.")

        if payload.get("feature_names") != list(MODEL_FEATURES):
            raise ModelUnavailable("model_incompatible","The duplicate model expects different input features. Retrain it.")

        if payload.get("feature_schema_version") != FEATURE_SCHEMA_VERSION:
            raise ModelUnavailable("model_incompatible","The duplicate model was trained with an older feature schema. Retrain it.")

        if _minor_version(payload.get("sklearn_version","")) != _minor_version(sklearn.__version__):
            raise ModelUnavailable("model_incompatible","The duplicate model was saved with a different scikit-learn version. Retrain it.")

        metadata=payload.get("metadata") or {}
        trained_with=metadata.get("embedding_model")

        if embedding_model is not None and trained_with != embedding_model:
            raise ModelUnavailable("model_incompatible",f"The duplicate model was trained with {trained_with} embeddings, not {embedding_model}. Retrain it.")

        return cls(payload["network"],payload["scaler"],float(payload["threshold"]),metadata)
