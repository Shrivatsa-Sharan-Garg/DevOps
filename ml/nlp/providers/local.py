import asyncio
import threading
from pathlib import Path
from typing import Any, Callable

import numpy as np

from ..errors import ProviderBadResponse, ProviderNotConfigured

PROVIDER_NAME = "minilm"
MODEL_ID = "sentence-transformers/paraphrase-MiniLM-L6-v2"


class LocalEmbeddingProvider:
    """CPU-first, local-only SentenceTransformer embedding provider."""

    name = PROVIDER_NAME

    def __init__(
        self,
        model_path: str | Path | None,
        batch_size: int = 32,
        device: str = "cpu",
        model_loader: Callable[..., Any] | None = None,
    ):
        self.model_path = Path(model_path).expanduser() if model_path else None
        self.batch_size = max(1, int(batch_size))
        self.device = device or "cpu"
        self._model_loader = model_loader
        self._model: Any | None = None
        self._load_lock = threading.Lock()
        self.model_id = MODEL_ID

    @property
    def cache_identity(self) -> str:
        return f"{self.name}:{self.model_id}"

    @property
    def is_configured(self) -> bool:
        return self.model_path is not None and self._has_local_model_files(self.model_path)

    @staticmethod
    def _has_local_model_files(path: Path) -> bool:
        if not path.is_dir():
            return False

        has_config = any((path / name).is_file() for name in ("modules.json", "config.json"))
        if not has_config:
            return False

        return any(
            (path / name).is_file()
            for name in ("model.safetensors", "pytorch_model.bin", "model.safetensors.index.json", "pytorch_model.bin.index.json")
        ) or any(path.glob("**/model.safetensors")) or any(path.glob("**/pytorch_model.bin"))

    def _path_error(self) -> ProviderNotConfigured:
        configured = str(self.model_path) if self.model_path else "<unset>"
        return ProviderNotConfigured(
            "MiniLM model files were not found at "
            f"{configured}. Set MINILM_MODEL_PATH in ml/.env to the downloaded model folder "
            "(the folder containing modules.json/config.json and model weights).",
            provider=self.name,
        )

    def _load_model(self) -> Any:
        if self._model is not None:
            return self._model

        with self._load_lock:
            if self._model is not None:
                return self._model
            if self.model_path is None or not self._has_local_model_files(self.model_path):
                raise self._path_error()

            try:
                loader = self._model_loader
                if loader is None:
                    from sentence_transformers import SentenceTransformer

                    loader = SentenceTransformer
                self._model = loader(
                    str(self.model_path),
                    device=self.device,
                    local_files_only=True,
                    trust_remote_code=False,
                )
            except ProviderNotConfigured:
                raise
            except ImportError as error:
                raise ProviderNotConfigured(
                    "The sentence-transformers dependency is missing. Run .\\run-ai.ps1 from the ml folder to install it.",
                    provider=self.name,
                ) from error
            except Exception as error:
                raise ProviderBadResponse(
                    f"Could not load the local MiniLM model from {self.model_path}: {error}",
                    provider=self.name,
                ) from error

        return self._model

    def load(self) -> Any:
        """Load and return the model, raising an actionable error on failure."""
        return self._load_model()

    async def warm_up(self) -> int:
        """Load the local model and run a small real inference; return its dimension."""
        vectors = await self.embed(["DevBridge local embedding verification."])
        return len(vectors[0])

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not isinstance(texts, list) or any(not isinstance(text, str) for text in texts):
            raise ValueError("Embedding input must be a list of strings.")
        if not texts:
            return []
        if any(not text.strip() for text in texts):
            raise ValueError("Embedding input cannot contain blank text.")

        model = self._load_model()

        def encode() -> np.ndarray:
            result = model.encode(
                texts,
                batch_size=self.batch_size,
                convert_to_numpy=True,
                show_progress_bar=False,
                normalize_embeddings=False,
            )
            return np.asarray(result, dtype=np.float64)

        try:
            vectors = await asyncio.to_thread(encode)
        except Exception as error:
            raise ProviderBadResponse(f"MiniLM could not encode the supplied text: {error}", provider=self.name) from error

        if vectors.ndim != 2 or vectors.shape[0] != len(texts) or vectors.shape[1] == 0:
            raise ProviderBadResponse("MiniLM returned embeddings with an invalid shape.", provider=self.name)
        if not np.isfinite(vectors).all() or np.any(np.linalg.norm(vectors, axis=1) == 0):
            raise ProviderBadResponse("MiniLM returned non-finite or zero embeddings.", provider=self.name)

        return vectors.tolist()
