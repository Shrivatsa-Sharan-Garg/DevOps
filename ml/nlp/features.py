from difflib import SequenceMatcher
import math
from typing import Any

import numpy as np

try:
    from .text import extract_keywords, normalize_text
except ImportError:
    from text import extract_keywords, normalize_text

FEATURE_SCHEMA_VERSION="1.1.0"

MODEL_FEATURES=("cosine_similarity","title_similarity","keyword_overlap","tag_overlap")


class MissingFeatureError(ValueError):
    pass


def model_feature_vector(features:dict[str,Any])->list[float]:
    vector=[]

    for name in MODEL_FEATURES:
        value=features.get(name)

        if value is None:
            raise MissingFeatureError(f"The {name} feature is missing.")

        try:
            numeric=float(value)
        except (TypeError,ValueError) as error:
            raise MissingFeatureError(f"The {name} feature must be a finite number.") from error
        if not math.isfinite(numeric):
            raise MissingFeatureError(f"The {name} feature must be finite.")
        vector.append(numeric)

    return vector


def jaccard(left:set[str], right:set[str])->float:
    if not left or not right:
        return 0.0

    return len(left & right)/len(left | right)


def title_similarity(left:str, right:str)->float:
    return SequenceMatcher(None, normalize_text(left), normalize_text(right)).ratio()


def keyword_overlap(left:str, right:str)->float:
    return jaccard(extract_keywords(left), extract_keywords(right))


def tag_overlap(left:list[str], right:list[str])->float:
    return jaccard({normalize_text(tag) for tag in left}, {normalize_text(tag) for tag in right})


def cosine_similarity(left:np.ndarray, right:np.ndarray)->float:
    left=np.asarray(left,dtype=np.float64)
    right=np.asarray(right,dtype=np.float64)

    if left.ndim != 1 or right.ndim != 1 or left.shape != right.shape or left.size == 0:
        raise ValueError("Cosine similarity requires same-sized non-empty embedding vectors.")
    if not np.isfinite(left).all() or not np.isfinite(right).all():
        raise ValueError("Cosine similarity requires finite embedding values.")

    denominator=float(np.linalg.norm(left)*np.linalg.norm(right))

    if denominator == 0.0:
        raise ValueError("Cosine similarity cannot be computed from a zero embedding.")

    return float(np.dot(left, right)/denominator)


def embedding_difference_summary(left:np.ndarray, right:np.ndarray)->dict[str, float]:
    difference=np.abs(left-right)

    return {
        "mean":float(difference.mean()),
        "std":float(difference.std()),
        "max":float(difference.max()),
        "l2":float(np.linalg.norm(difference))
    }


def embedding_product_summary(left:np.ndarray, right:np.ndarray)->dict[str, float]:
    product=left*right

    return {
        "mean":float(product.mean()),
        "std":float(product.std()),
        "min":float(product.min()),
        "max":float(product.max())
    }


def compute_pair_features(
    left_title:str,
    left_text:str,
    left_tags:list[str],
    right_title:str,
    right_text:str,
    right_tags:list[str],
    left_vector:np.ndarray|None=None,
    right_vector:np.ndarray|None=None
)->dict[str, Any]:
    features:dict[str, Any]={
        "schema_version":FEATURE_SCHEMA_VERSION,
        "cosine_similarity":None,
        "title_similarity":round(title_similarity(left_title, right_title), 6),
        "keyword_overlap":round(keyword_overlap(left_text, right_text), 6),
        "tag_overlap":round(tag_overlap(left_tags, right_tags), 6),
        "embedding_abs_difference":None,
        "embedding_product":None
    }

    if left_vector is None or right_vector is None:
        return features

    features["cosine_similarity"]=round(cosine_similarity(left_vector, right_vector), 6)
    features["embedding_abs_difference"]=_rounded(embedding_difference_summary(left_vector, right_vector))
    features["embedding_product"]=_rounded(embedding_product_summary(left_vector, right_vector))

    return features


def _rounded(values:dict[str, float])->dict[str, float]:
    return {name:round(value, 6) for name, value in values.items()}
