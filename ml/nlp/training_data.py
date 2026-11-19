from typing import Any

import numpy as np

from .features import FEATURE_SCHEMA_VERSION, compute_pair_features
from .text import build_embedding_text, text_hash


LABEL_SAME = "same_underlying"
LABEL_RELATED = "related_different"
LABEL_UNRELATED = "unrelated"

LABELS = (
    LABEL_SAME,
    LABEL_RELATED,
    LABEL_UNRELATED
)

CONFIRMED_LABEL_SOURCES=("user_explicit","user_rejected_suggestion")

DEFAULT_MAX_CHARS=6000


def binary_target(label:str)->int:
    return 1 if label == LABEL_SAME else 0


def side_text(side:dict[str,Any],max_chars:int)->str:
    return build_embedding_text(side["title"],side["description"],max_chars)


def pair_texts(dataset:dict[str,Any],max_chars:int=DEFAULT_MAX_CHARS)->list[str]:
    texts=[]

    for pair in dataset.get("labelled_pairs",[]):
        texts.append(side_text(pair["left"],max_chars))
        texts.append(side_text(pair["right"],max_chars))

    return list(dict.fromkeys(texts))


def _vector(vectors:dict[str,list[float]]|None,text:str)->np.ndarray|None:
    if vectors is None or text not in vectors:
        return None

    return np.array(vectors[text],dtype=np.float64)


def row_from_labelled_pair(
    pair: dict[str, Any],
    max_chars:int=DEFAULT_MAX_CHARS,
    vectors:dict[str,list[float]]|None=None
) -> dict[str, Any]:

    left = pair["left"]
    right = pair["right"]

    left_text=side_text(left,max_chars)
    right_text=side_text(right,max_chars)

    features = compute_pair_features(
        left["title"],
        left_text,
        left.get("tags", []),
        right["title"],
        right_text,
        right.get("tags", []),
        _vector(vectors,left_text),
        _vector(vectors,right_text)
    )

    return {
        "pair_id": pair["id"],
        "label": pair["label"],
        "source": pair.get("source", "synthetic"),
        "label_source": "dataset",
        "group_keys":[text_hash(left_text),text_hash(right_text)],
        "features": features
    }


def row_from_feedback(
    record: dict[str, Any]
) -> dict[str, Any] | None:

    if record.get("label") not in LABELS:
        return None

    group_keys=[
        record.get("submission_text_hash") or f"feedback:{record['id']}",
        record.get("candidate_text_hash") or record.get("candidate_problem_id") or f"candidate:{record['id']}"
    ]

    return {
        "pair_id": record["id"],
        "label": record["label"],
        "source": "user_feedback",
        "label_source": record.get("label_source"),
        "group_keys":group_keys,
        "features": record.get("features") or {},
        "embedding_model": record.get("embedding_model"),
        "match_method": record.get("match_method")
    }


def build_training_rows(
    dataset: dict[str, Any],
    feedback: list[dict[str, Any]],
    vectors:dict[str,list[float]]|None=None,
    max_chars:int=DEFAULT_MAX_CHARS
) -> dict[str, Any]:

    rows = [
        row_from_labelled_pair(pair,max_chars,vectors)
        for pair in dataset.get("labelled_pairs", [])
    ]

    for record in feedback:

        row = row_from_feedback(record)

        if row is not None:
            rows.append(row)

    return {
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "labels": list(LABELS),
        "row_count": len(rows),
        "rows": rows
    }
