import os
import sys
from pathlib import Path

ML_ROOT=Path(__file__).resolve().parents[2]/"ml"
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0,str(ML_ROOT))

from nlp.providers.local import LocalEmbeddingProvider as _ProductionLocalEmbeddingProvider
from nlp.providers.local import MODEL_ID, PROVIDER_NAME


class LocalEmbeddingProvider(_ProductionLocalEmbeddingProvider):
    """Compatibility import for the experiment; inference uses the production provider."""

    def __init__(self,model_path:str|None=None,model_id:str=MODEL_ID):
        if model_id != MODEL_ID:
            raise ValueError(f"This local provider supports {MODEL_ID}, not {model_id}.")
        configured_path=model_path or os.getenv("MINILM_MODEL_PATH") or os.getenv("MODEL_PATH")
        super().__init__(configured_path)


__all__=["LocalEmbeddingProvider","PROVIDER_NAME","MODEL_ID"]
