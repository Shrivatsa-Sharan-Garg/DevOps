import asyncio

import pytest

from nlp.embedding_cache import EmbeddingCache, embed_with_cache


class Provider:
    name="minilm"
    model_id="sentence-transformers/paraphrase-MiniLM-L6-v2"
    cache_identity=f"{name}:{model_id}"

    def __init__(self,vectors=None):
        self.vectors=vectors or [[1.0,0.25,0.5]]
        self.calls=[]

    async def embed(self,texts):
        self.calls.append(list(texts))
        return self.vectors[:len(texts)]


def test_cache_identity_separates_providers_and_model_ids(tmp_path):
    path=tmp_path/"embeddings.json"
    cloud=EmbeddingCache(path,"cloudflare:@cf/qwen/qwen3-embedding-0.6b")
    cloud.put_many({"example text":[0.1,0.2]})

    minilm=EmbeddingCache(path,"minilm:sentence-transformers/paraphrase-MiniLM-L6-v2")

    assert len(minilm) == 0
    assert minilm.key_for("example text") != cloud.key_for("example text")


def test_repeated_texts_are_cached_and_batch_embed_only_once(tmp_path):
    provider=Provider()
    cache=EmbeddingCache(tmp_path/"embeddings.json",provider.cache_identity)

    result=asyncio.run(embed_with_cache(provider,cache,["same text","same text"]))
    cached=asyncio.run(embed_with_cache(provider,cache,["same text"]))

    assert result == cached == {"same text":[1.0,0.25,0.5]}
    assert provider.calls == [["same text"]]


@pytest.mark.parametrize("vectors",[[],[[0.0,0.0]],[[float("nan"),1.0]],[[1.0],[1.0,2.0]]])
def test_invalid_embedding_provider_results_are_rejected(tmp_path,vectors):
    provider=Provider(vectors)
    cache=EmbeddingCache(tmp_path/"embeddings.json",provider.cache_identity)
    with pytest.raises(ValueError):
        asyncio.run(embed_with_cache(provider,cache,["first","second"]))
