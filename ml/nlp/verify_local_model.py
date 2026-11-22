import asyncio

from backend.config.settings import get_settings
from nlp.providers.local import LocalEmbeddingProvider


async def main() -> None:
    settings = get_settings()
    provider = LocalEmbeddingProvider(settings.minilm_model_path, settings.embedding_batch_size)
    vectors = await provider.embed([
        "A clear sentence embedding smoke test.",
        "A second sentence verifies batched inference.",
    ])
    if len(vectors) != 2 or len(vectors[0]) != len(vectors[1]):
        raise RuntimeError("MiniLM returned an unexpected batch or vector shape.")
    print(f"Loaded {provider.model_id} from {provider.model_path}")
    print(f"Generated {len(vectors)} real local embeddings with dimension {len(vectors[0])}.")


if __name__ == "__main__":
    asyncio.run(main())
