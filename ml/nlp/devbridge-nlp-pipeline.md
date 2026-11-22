# Natural Language Processing (NLP) Technical Specification & Implementation Report

This document outlines the core Natural Language Processing (NLP) algorithms, feature engineering pipelines, semantic matching architectures, and supervised machine learning classifiers implemented across the codebase. Each section details the underlying theory, file locations, and searchable references for code auditability.

---

### 1. Text Preprocessing & Lexical Normalization

* **File Location:** `ml/nlp/text.py`
* **NLP Theory:** Raw text normalization, case-folding, whitespace collapsing, tokenization, stopword removal, and rule-based morphological stemming.
* **Implementation Details:**
* Converts unstructured strings into uniform lowercase tokens using regex pattern matching.
* Filters out high-frequency, semantically empty syntactic words (stopwords) to isolate domain-specific content words.
* Applies heuristic suffix-stripping to collapse plural nouns and inflected variants into canonical root forms.

**Searchable References & Code Snippets:**

* Normalize text and tokenization:

```python
def normalize_text(text: str) -> str:
    return " ".join(text.lower().split())

def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())

```

* Keyword extraction and stopword filtering:

```python
def extract_keywords(text: str) -> set[str]:
    keywords = set()
    for token in tokenize(text):
        if len(token) > 2 and token not in STOPWORDS:
            keywords.add(_light_stem(token))
    return keywords

```

---

### 2. Lexical Metrics & Vector Similarity Engineering

* **File Location:** `ml/nlp/features.py`
* **NLP Theory:** String distance metrics, set-based lexical overlap (Jaccard similarity), dense vector space modeling, and geometric similarity measures (Cosine similarity).
* **Implementation Details:**
* **Jaccard Similarity:** Measures set overlap ratio (`intersection / union`) for extracted keywords and categorical tags.
* **String Ratio:** Utilizes Python's `SequenceMatcher` to calculate character-level edit distance and title similarity.
* **Cosine Similarity:** Computes the normalized dot product between multi-dimensional dense sentence embeddings to quantify semantic relatedness independent of text length.

**Searchable References & Code Snippets:**

* Jaccard similarity and keyword overlap:

```python
def jaccard(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)

def keyword_overlap(left: str, right: str) -> float:
    return jaccard(extract_keywords(left), extract_keywords(right))

```

* Vector cosine similarity:

```python
def cosine_similarity(left: np.ndarray, right: np.ndarray) -> float:
    denominator = float(np.linalg.norm(left) * np.linalg.norm(right))
    if denominator == 0.0:
        raise ValueError("Cosine similarity cannot be computed from a zero embedding.")
    return float(np.dot(left, right) / denominator)

```

---

### 3. Semantic Retrieval & Fallback Matching Engine

* **File Location:** `ml/nlp/matcher.py`
* **NLP Theory:** Dense vector retrieval, candidate pool pre-filtering, and hybrid fallback routing (Semantic embedding matching vs. Lexical keyword matching).
* **Implementation Details:**
* Implements `SemanticMatcher` to manage text comparison workflows.
* Pre-filters a large candidate corpus down to a manageable pool using fast lexical keyword overlap before executing costly dense vector comparisons.
* MiniLM is the default local provider. A MiniLM loading or inference error is surfaced to the caller; it does not silently switch to keyword-only results. Cloudflare remains an explicit optional provider.

**Searchable References & Code Snippets:**

* Core matcher class and routing:

```python
class SemanticMatcher:
    async def match(self, submission: Submission, problems: list[dict[str, Any]], use_ai: bool) -> MatchOutcome:
        pool = self._select_pool(submission, problems)
        if not use_ai:
            return self._keyword_match(submission, pool)
        try:
            return await self._embedding_match(submission, pool)
        except AIProviderError as error:
            outcome = self._keyword_match(submission, pool)
            outcome.ai_error = error
            return outcome

```

---

### 4. Persistent Vector Caching & Version Control

* **File Location:** `ml/nlp/embedding_cache.py`
* **NLP Theory:** Hash-based memoization for high-dimensional vector representations to avoid redundant model inference computations.
* **Implementation Details:**
* Implements `EmbeddingCache` to store computed sentence vectors on disk as atomic JSON payloads.
* Incorporates model identifiers and text preparation version tags (`TEXT_PREP_VERSION`) into cryptographic hashes (`SHA-256`) to automatically invalidate stale caches whenever models or preprocessing rules change.

**Searchable References & Code Snippets:**

* Cache key generation and lookup:

```python
class EmbeddingCache:
    def key_for(self, text: str) -> str:
        raw = f"{self.model_id}\0{TEXT_PREP_VERSION}\0{text}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, text: str) -> list[float] | None:
        with self._lock:
            return self._entries.get(self.key_for(text))

```

---

### 5. Prompt Engineering & Contextual Generation (RAG)

* **File Location:** `ml/nlp/srs.py`
* **NLP Theory:** Retrieval-Augmented Generation (RAG), structured prompt templating, and automated output validation against engineering standards.
* **Implementation Details:**
* Uses `SrsGenerator` to encapsulate problem metadata, descriptions, constraints, and crowdsourced community reports into standardized XML-delimited prompt structures (`<problem>`).
* Enforces compliance checks against structured sections (ISO/IEC/IEEE 29148 requirements) to parse, clean, and validate generated technical specifications.

**Searchable References & Code Snippets:**

* Context building and document review:

```python
def build_user_prompt(context: SrsContext) -> str:
    lines = [
        "<problem>",
        f"Title: {context.title}",
        f"Description: {context.description}",
        f"Desired outcome: {context.outcome or 'TBD'}"
    ]
    lines.append("</problem>")
    return "\n".join(lines)

class SrsGenerator:
    async def generate(self, context: SrsContext) -> SrsDraft:
        result = await self.provider.generate(SYSTEM_PROMPT, build_user_prompt(context))
        markdown = clean_model_output(result.text)
        return SrsDraft(markdown=markdown, model=result.model, ...)

```

---

### 6. Pairwise Similarity Dataset Construction & Feature Maps

* **File Location:** `ml/nlp/training_data.py`
* **NLP Theory:** Supervised dataset assembly, feature vector serialization, and human-in-the-loop feedback aggregation for semantic classifier calibration.
* **Implementation Details:**
* Maps annotated problem pairs into structured training rows containing multi-dimensional feature dictionaries, using the same text preparation as live matching.
* Generates local MiniLM embeddings for labeled dataset pairs before calculating cosine similarity. Without vectors, `cosine_similarity` stays `None` and training refuses to run.
* Adds user-confirmed feedback (`user_explicit` or `user_rejected_suggestion`) only when the provider, model and feature schema match the active MiniLM training run.
* Keeps the three original labels; training maps `same_underlying` to 1 and the other two to 0.
* Records `group_keys` (hashes of each side's text) so pairs sharing a problem stay in the same split.

**Searchable References & Code Snippets:**

* Training row builder:

```python
def build_training_rows(dataset, feedback, vectors=None, max_chars=DEFAULT_MAX_CHARS):
    rows = [row_from_labelled_pair(pair, max_chars, vectors) for pair in dataset.get("labelled_pairs", [])]
    ...
```

---

### 7. Supervised Multi-Layer Perceptron (MLP) Classifier & Evaluation

* **File Locations:** `ml/nlp/classifier/classifier.py`, `ml/nlp/classifier/train_model.py`
* **ML Theory:** Feed-forward artificial neural network trained via backpropagation with an Adam optimizer and ReLU activation, classifying candidate pairs into binary duplicate states (`1` for same underlying issue, `0` for unrelated/different).
* **Implementation Details:**
* **Input Layer:** Accepts a strict 4-feature vector: `[cosine_similarity, title_similarity, keyword_overlap, tag_overlap]`.
* **Hidden Layer:** 8 neurons with ReLU activation.
* **Output Layer:** 1 neuron with Sigmoid activation.
* **Loss and optimiser:** Binary cross-entropy (log loss) minimised with Adam, through scikit-learn's `MLPClassifier`.
* **Evaluation:** Pairs are grouped by shared problem records, then split into training, validation and test sets with `StratifiedGroupKFold`. The decision threshold is chosen on validation only, and the test set is scored once. Grouped 5-fold cross-validation is reported as a steadier estimate. The earlier 83.33% figure came from a random pair-level split with the cosine feature set to zero, so it is not used.
* **Model Persistence:** `artifact_mlp_model.pkl` holds the network, scaler, exact feature order/schema, provider/model identity, architecture, threshold, scikit-learn version and evaluation report. Old or mismatched artifacts are rejected; local-mode startup requires a compatible checkpoint.
* **Live use:** `analyze_submission` scores every embedding candidate and returns the result as `model_assessment`. The user still makes the final choice.

**Searchable References & Code Snippets:**

* MLP Architecture and Feature Extraction:

```python
def build_network(random_state):
    return MLPClassifier(hidden_layer_sizes=(8,), activation="relu", solver="adam", max_iter=2000, random_state=random_state)


def model_feature_vector(features):
    # Raises MissingFeatureError instead of substituting zero.
    return [float(features[name]) for name in MODEL_FEATURES]
```

---

### Current local MiniLM runtime

`ml/nlp/providers/local.py` implements the production `LocalEmbeddingProvider`. It loads `sentence-transformers/paraphrase-MiniLM-L6-v2` from `MINILM_MODEL_PATH` with `local_files_only=True` and CPU inference by default. The model is loaded once per process and its embeddings use the existing `EmbeddingCache`; cache identities contain both provider and model ID, so prior Cloudflare vectors are not reused.

The four ANN inputs remain ordered as `cosine_similarity`, `title_similarity`, `keyword_overlap`, `tag_overlap`. MiniLM emits the sentence vectors; `features.py` derives cosine similarity from each vector pair. Missing, zero or non-finite embeddings are errors, not substitute scores.

From `ml/`, run `./run-ai.ps1` in PowerShell. The script creates `.env` from `.env.example` if needed, installs dependencies, verifies a real local embedding, checks the ANN artifact, trains only when it is missing/incompatible, verifies the resulting artifact, and starts FastAPI. Use `./run-ai.ps1 -Retrain` to force training. Initial package installation may need internet; model inference after setup is local. SRS is separate and continues to use OpenRouter.
