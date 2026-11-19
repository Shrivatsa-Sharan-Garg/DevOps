import argparse
import asyncio
import hashlib
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedGroupKFold

from ..features import FEATURE_SCHEMA_VERSION, MODEL_FEATURES, MissingFeatureError, model_feature_vector
from ..text import TEXT_PREP_VERSION
from ..training_data import CONFIRMED_LABEL_SOURCES, LABELS, binary_target, build_training_rows, pair_texts
from .classifier import DEFAULT_MODEL_PATH, DEFAULT_THRESHOLD, HIDDEN_NEURONS, DuplicateMLPClassifier

DEFAULT_SEED=42
TEST_FOLDS=5
VALIDATION_FOLDS=4
CV_FOLDS=5
THRESHOLD_CHOICES=[round(value,2) for value in np.arange(0.30,0.71,0.05)]


class TrainingDataError(Exception):
    pass


def feature_matrix(rows:list[dict[str,Any]])->tuple[np.ndarray,np.ndarray]:
    vectors=[]
    missing=Counter()

    for row in rows:
        try:
            vectors.append(model_feature_vector(row["features"]))
        except MissingFeatureError:
            missing[row["source"]]+=1

    if missing:
        details=", ".join(f"{count} {source}" for source,count in missing.items())
        raise TrainingDataError(f"Some training pairs have no embedding similarity ({details}). Nothing was trained.")

    targets=[binary_target(row["label"]) for row in rows]

    return (np.array(vectors),np.array(targets))


def group_ids(rows:list[dict[str,Any]])->np.ndarray:
    parent:dict[str,str]={}

    def find(key:str)->str:
        parent.setdefault(key,key)

        while parent[key] != key:
            parent[key]=parent[parent[key]]
            key=parent[key]

        return key

    for row in rows:
        first,*others=row["group_keys"]

        for other in others:
            parent[find(other)]=find(first)

    roots={}

    return np.array([roots.setdefault(find(row["group_keys"][0]),len(roots)) for row in rows])


def _first_fold(targets:np.ndarray,groups:np.ndarray,folds:int,seed:int)->tuple[np.ndarray,np.ndarray]:
    splitter=StratifiedGroupKFold(n_splits=folds,shuffle=True,random_state=seed)
    kept,held=next(splitter.split(np.zeros(len(targets)),targets,groups))

    return (kept,held)


def split_by_group(targets:np.ndarray,groups:np.ndarray,seed:int)->dict[str,np.ndarray]:
    if len(np.unique(groups)) < TEST_FOLDS:
        raise TrainingDataError(f"At least {TEST_FOLDS} independent problem groups are needed for a grouped split.")

    rest,test=_first_fold(targets,groups,TEST_FOLDS,seed)
    train_part,validation_part=_first_fold(targets[rest],groups[rest],VALIDATION_FOLDS,seed)
    split={"train":rest[train_part],"validation":rest[validation_part],"test":test}

    for name,indexes in split.items():
        if len(np.unique(targets[indexes])) < 2:
            raise TrainingDataError(f"The {name} split has only one class. More labelled pairs are needed.")

    return split


def evaluate(targets:np.ndarray,predictions:np.ndarray)->dict[str,Any]:
    return {
        "count":int(len(targets)),
        "accuracy":round(float(accuracy_score(targets,predictions)),4),
        "precision":round(float(precision_score(targets,predictions,zero_division=0)),4),
        "recall":round(float(recall_score(targets,predictions,zero_division=0)),4),
        "f1_score":round(float(f1_score(targets,predictions,zero_division=0)),4),
        "confusion_matrix":confusion_matrix(targets,predictions,labels=[0,1]).tolist()
    }


def choose_threshold(targets:np.ndarray,probabilities:np.ndarray)->float:
    def score(threshold:float)->tuple[float,float]:
        accuracy=accuracy_score(targets,probabilities >= threshold)

        return (accuracy,-abs(threshold-DEFAULT_THRESHOLD))

    return max(THRESHOLD_CHOICES,key=score)


def cross_validate(features:np.ndarray,targets:np.ndarray,groups:np.ndarray,seed:int)->dict[str,Any]:
    splitter=StratifiedGroupKFold(n_splits=CV_FOLDS,shuffle=True,random_state=seed)
    predictions=np.zeros(len(targets),dtype=int)
    fold_accuracy=[]

    for train,held in splitter.split(features,targets,groups):
        model=DuplicateMLPClassifier.fit(features[train],targets[train],seed)
        predictions[held]=model.probabilities(features[held]) >= DEFAULT_THRESHOLD
        fold_accuracy.append(round(float(accuracy_score(targets[held],predictions[held])),4))

    return {
        **evaluate(targets,predictions),
        "folds":CV_FOLDS,
        "threshold":DEFAULT_THRESHOLD,
        "fold_accuracy":fold_accuracy,
        "fold_accuracy_mean":round(float(np.mean(fold_accuracy)),4),
        "fold_accuracy_std":round(float(np.std(fold_accuracy)),4)
    }


def _distribution(rows:list[dict[str,Any]],indexes:np.ndarray)->dict[str,int]:
    counts=Counter(rows[index]["label"] for index in indexes)

    return {label:counts.get(label,0) for label in LABELS}


def train_and_evaluate(rows:list[dict[str,Any]],seed:int=DEFAULT_SEED)->tuple[DuplicateMLPClassifier,dict[str,Any]]:
    features,targets=feature_matrix(rows)
    groups=group_ids(rows)
    split=split_by_group(targets,groups,seed)
    train,validation,test=split["train"],split["validation"],split["test"]

    model=DuplicateMLPClassifier.fit(features[train],targets[train],seed)
    model.threshold=choose_threshold(targets[validation],model.probabilities(features[validation]))

    def scored(indexes:np.ndarray)->dict[str,Any]:
        return evaluate(targets[indexes],model.probabilities(features[indexes]) >= model.threshold)

    report={
        "architecture":{
            "inputs":list(MODEL_FEATURES),
            "hidden_layer":{"neurons":HIDDEN_NEURONS,"activation":"relu"},
            "output":"one logistic (sigmoid) unit",
            "loss":"binary cross-entropy (log loss)",
            "optimizer":"adam",
            "iterations":int(model.network.n_iter_),
            "final_loss":round(float(model.network.loss_),4)
        },
        "seed":seed,
        "threshold":model.threshold,
        "groups":int(len(np.unique(groups))),
        "split_counts":{name:int(len(indexes)) for name,indexes in split.items()},
        "split_groups":{name:int(len(np.unique(groups[indexes]))) for name,indexes in split.items()},
        "class_distribution":{name:_distribution(rows,indexes) for name,indexes in split.items()},
        "validation":scored(validation),
        "test":scored(test),
        "grouped_cross_validation":cross_validate(features,targets,groups,seed)
    }

    return (model,report)


def usable_feedback(feedback:list[dict[str,Any]],embedding_model:str)->tuple[list[dict[str,Any]],dict[str,int]]:
    kept=[]
    skipped=Counter()

    for record in feedback:
        features=record.get("features") or {}

        if record.get("label") not in LABELS:
            skipped["no_label"]+=1
        elif record.get("label_source") not in CONFIRMED_LABEL_SOURCES:
            skipped["not_user_confirmed"]+=1
        elif record.get("embedding_model") != embedding_model:
            skipped["other_embedding_model"]+=1
        elif features.get("schema_version") != FEATURE_SCHEMA_VERSION:
            skipped["other_feature_schema"]+=1
        elif any(features.get(name) is None for name in MODEL_FEATURES):
            skipped["missing_features"]+=1
        else:
            kept.append(record)

    return (kept,dict(skipped))


def dataset_version(dataset:dict[str,Any],feedback:list[dict[str,Any]])->str:
    content=json.dumps(dataset.get("labelled_pairs",[]),sort_keys=True).encode("utf-8")
    digest=hashlib.sha256(content).hexdigest()[:12]

    return f"{dataset.get('version','unknown')}+{digest}+feedback{len(feedback)}"


async def _load_feedback(settings)->list[dict[str,Any]]:
    from backend.repositories.factory import build_repository

    repository=build_repository(settings)

    try:
        await repository.prepare()
        return await repository.list_feedback()
    finally:
        await repository.close()


async def _embed_dataset(settings,texts:list[str])->tuple[dict[str,list[float]],str]:
    from nlp.embedding_cache import EmbeddingCache, embed_with_cache
    from nlp.providers.cloudflare import CloudflareEmbeddingProvider
    from nlp.usage_guard import UsageGuard

    guard=UsageGuard(settings.usage_path,{"cloudflare":settings.cloudflare_daily_neuron_budget})
    provider=CloudflareEmbeddingProvider(
        settings.cloudflare_account_id,
        settings.cloudflare_api_token,
        settings.cloudflare_embedding_model,
        settings.ai_request_timeout,
        settings.embedding_batch_size,
        guard
    )
    cache=EmbeddingCache(settings.embedding_cache_path,provider.model_id)

    return (await embed_with_cache(provider,cache,texts),provider.model_id)


async def run(arguments:argparse.Namespace)->int:
    from backend.config.settings import get_settings
    from nlp.errors import AIProviderError
    from nlp.json_files import atomic_write_json, read_json

    settings=get_settings()
    dataset=read_json(settings.dataset_path,default={}) or {}
    texts=pair_texts(dataset,settings.embedding_max_chars)

    try:
        vectors,embedding_model=await _embed_dataset(settings,texts)
    except AIProviderError as error:
        print(f"Could not get Cloudflare embeddings ({error.code}): {error.message}")
        print("Nothing was trained. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in ml/.env and try again.")
        return 1

    feedback,skipped=[],{}

    if arguments.feedback:
        try:
            feedback,skipped=usable_feedback(await _load_feedback(settings),embedding_model)
        except Exception as error:
            print(f"Could not read feedback from the {settings.data_store} store: {error}")
            print("Fix the database connection, or run again with --no-feedback.")
            return 1

    rows=build_training_rows(dataset,feedback,vectors,settings.embedding_max_chars)["rows"]

    try:
        model,report=train_and_evaluate(rows,arguments.seed)
    except TrainingDataError as error:
        print(error)
        return 1

    model.metadata={
        "embedding_model":embedding_model,
        "text_prep_version":TEXT_PREP_VERSION,
        "training_dataset_version":dataset_version(dataset,feedback),
        "trained_at":datetime.now(timezone.utc).isoformat(),
        "row_count":len(rows),
        "feedback_rows":len(feedback),
        "feedback_skipped":skipped,
        "report":report
    }
    output=Path(arguments.output)
    model.save(output)
    atomic_write_json(output.with_name("training_report.json"),model.metadata)
    print_report(model.metadata)
    print(f"\nSaved the model to {output}")

    return 0


def print_report(metadata:dict[str,Any])->None:
    report=metadata["report"]

    print(f"Rows: {metadata['row_count']} ({metadata['feedback_rows']} from user feedback)")
    print(f"Embedding model: {metadata['embedding_model']}")
    print(f"Independent problem groups: {report['groups']}")

    for name in ("train","validation","test"):
        print(f"  {name:10} {report['split_counts'][name]:3} pairs  {report['class_distribution'][name]}")

    print(f"Threshold chosen on validation: {report['threshold']}")

    for name in ("validation","test","grouped_cross_validation"):
        result=report[name]
        print(
            f"{name:25} accuracy={result['accuracy']:.4f} precision={result['precision']:.4f} "
            f"recall={result['recall']:.4f} f1={result['f1_score']:.4f} confusion={result['confusion_matrix']}"
        )


def parse_arguments(argv:list[str]|None=None)->argparse.Namespace:
    parser=argparse.ArgumentParser(description="Train the DevBridge duplicate-problem ANN.")
    parser.add_argument("--no-feedback",dest="feedback",action="store_false",help="Use only the labelled synthetic pairs.")
    parser.add_argument("--seed",type=int,default=DEFAULT_SEED)
    parser.add_argument("--output",default=str(DEFAULT_MODEL_PATH))

    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(asyncio.run(run(parse_arguments())))
