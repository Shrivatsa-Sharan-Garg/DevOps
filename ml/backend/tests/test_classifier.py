import joblib
import numpy as np
import pytest

from backend.config.settings import ML_ROOT
from backend.services.duplicate_model import DuplicateModel
from nlp.classifier.classifier import DuplicateMLPClassifier, ModelUnavailable
from nlp.classifier.train_model import (
    TrainingDataError,
    feature_matrix,
    group_ids,
    split_by_group,
    train_and_evaluate,
    usable_feedback
)
from nlp.features import MODEL_FEATURES, MissingFeatureError, model_feature_vector
from nlp.json_files import read_json
from nlp.matcher import METHOD_KEYWORD, Candidate
from nlp.training_data import build_training_rows

from .conftest import FakeEmbedder, fake_training_rows

COMPLETE={"cosine_similarity":0.9,"title_similarity":0.8,"keyword_overlap":0.4,"tag_overlap":1.0}


@pytest.fixture(scope="module")
def dataset():
    return read_json(ML_ROOT/"data"/"synthetic_dataset.json")


def test_feature_order_is_fixed():
    assert MODEL_FEATURES == ("cosine_similarity", "title_similarity", "keyword_overlap", "tag_overlap")
    assert model_feature_vector(COMPLETE) == [0.9, 0.8, 0.4, 1.0]


def test_missing_cosine_is_never_turned_into_zero():
    with pytest.raises(MissingFeatureError):
        model_feature_vector({**COMPLETE,"cosine_similarity":None})


def test_dataset_rows_without_embeddings_leave_cosine_empty(dataset):
    rows=build_training_rows(dataset,[])["rows"]

    assert len(rows) == 59
    assert all(row["features"]["cosine_similarity"] is None for row in rows)

    with pytest.raises(TrainingDataError):
        feature_matrix(rows)


def test_dataset_rows_with_embeddings_have_all_four_features():
    rows=fake_training_rows()
    features,targets=feature_matrix(rows)

    assert features.shape == (59, 4)
    assert int(targets.sum()) == 31
    assert {row["label"] for row in rows} == {"same_underlying", "related_different", "unrelated"}


def test_grouped_split_shares_no_problem_record_between_partitions():
    rows=fake_training_rows()
    _,targets=feature_matrix(rows)
    split=split_by_group(targets,group_ids(rows),42)
    keys={name:{key for index in indexes for key in rows[index]["group_keys"]} for name,indexes in split.items()}

    assert sum(len(indexes) for indexes in split.values()) == 59
    assert not keys["train"] & keys["test"]
    assert not keys["train"] & keys["validation"]
    assert not keys["validation"] & keys["test"]


def test_training_report_describes_the_ann(trained_classifier):
    report=trained_classifier.metadata["report"]

    assert report["architecture"]["inputs"] == list(MODEL_FEATURES)
    assert report["architecture"]["hidden_layer"] == {"neurons":8,"activation":"relu"}
    assert trained_classifier.network.out_activation_ == "logistic"
    assert sum(report["split_counts"].values()) == 59

    for name in ("validation", "test", "grouped_cross_validation"):
        assert set(report[name]) >= {"accuracy", "precision", "recall", "f1_score", "confusion_matrix"}


def test_saved_model_loads_with_the_same_predictions(tmp_path, trained_classifier):
    path=tmp_path/"model.pkl"
    trained_classifier.save(path)
    loaded=DuplicateMLPClassifier.load(path,FakeEmbedder.model_id)

    assert loaded.threshold == trained_classifier.threshold
    assert loaded.assess(COMPLETE) == trained_classifier.assess(COMPLETE)


def test_missing_model_is_reported(tmp_path):
    with pytest.raises(ModelUnavailable) as error:
        DuplicateMLPClassifier.load(tmp_path/"nothing.pkl")

    assert error.value.code == "model_missing"


def test_old_artifact_format_is_rejected(tmp_path):
    path=tmp_path/"old.pkl"
    joblib.dump({"mlp":None,"scaler":None,"feature_names":list(MODEL_FEATURES),"threshold":0.5},path)

    with pytest.raises(ModelUnavailable) as error:
        DuplicateMLPClassifier.load(path)

    assert error.value.code == "model_incompatible"


def test_model_from_other_embeddings_is_rejected(tmp_path, trained_classifier):
    path=tmp_path/"model.pkl"
    trained_classifier.save(path)

    with pytest.raises(ModelUnavailable) as error:
        DuplicateMLPClassifier.load(path,"@cf/other/model")

    assert error.value.code == "model_incompatible"


def test_runtime_model_skips_keyword_candidates(trained_classifier):
    model=DuplicateModel(trained_classifier)
    candidate=Candidate(problem={},rank=1,score=0.5,method=METHOD_KEYWORD,features=COMPLETE,candidate_text_hash="x")

    assert model.assess(candidate) is None


def test_only_confirmed_embedding_feedback_is_used():
    base={"label":"same_underlying","label_source":"user_explicit","embedding_model":"m","features":{**COMPLETE,"schema_version":"1.1.0"}}
    records=[
        {**base,"id":"keep"},
        {**base,"id":"unlabelled","label":None},
        {**base,"id":"not-chosen","label_source":"shown_not_selected"},
        {**base,"id":"other-model","embedding_model":"other"},
        {**base,"id":"keyword","features":{**base["features"],"cosine_similarity":None}}
    ]
    kept,skipped=usable_feedback(records,"m")

    assert [record["id"] for record in kept] == ["keep"]
    assert sum(skipped.values()) == 4


def test_training_is_repeatable():
    rows=fake_training_rows()
    first,_=train_and_evaluate(rows,7)
    second,_=train_and_evaluate(rows,7)
    sample=np.array([[0.9,0.8,0.4,1.0]])

    assert first.probabilities(sample)[0] == second.probabilities(sample)[0]
