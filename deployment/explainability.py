"""
Ensemble SHAP explainability for the 5-fold XGBoost fraud models.

Uses the same models loaded by predictor.py. Mean SHAP values across folds
explain the ensemble-averaged prediction, not a single fold.
"""

import numpy as np

from predictor import FEATURE_NAMES, models


# ============================================================
# BUILD TREE EXPLAINERS ONCE (per loaded fold model)
# ============================================================

_explainers = None


def _get_explainers():
    global _explainers

    if _explainers is not None:
        return _explainers

    import shap

    explainers = []

    for model in models:
        explainers.append(shap.TreeExplainer(model))

    _explainers = explainers
    return _explainers


def _shap_for_fraud_class(shap_output):
    """
    Normalize TreeExplainer output to a 1D array of fraud-class SHAP values.
    """
    values = shap_output

    # Newer shap may return Explanation objects
    if hasattr(values, "values"):
        values = values.values

    values = np.array(values)

    # Binary classifiers sometimes return [neg_class, pos_class]
    if isinstance(shap_output, list) and len(shap_output) == 2:
        values = np.array(shap_output[1])

    # Shape (1, n_features, 2) → take positive class
    if values.ndim == 3 and values.shape[-1] == 2:
        values = values[0, :, 1]
    elif values.ndim == 2 and values.shape[0] == 1:
        values = values[0]
    elif values.ndim == 2 and values.shape[1] == len(FEATURE_NAMES):
        # (n_classes?, n_features) uncommon; prefer last row if 2 rows
        if values.shape[0] == 2:
            values = values[1]
        else:
            values = values[0]
    elif values.ndim != 1:
        values = values.reshape(-1)[: len(FEATURE_NAMES)]

    return np.asarray(values, dtype=np.float64).reshape(-1)


def explain(features, top_k=5):
    """
    Compute mean SHAP contributions across the 5-fold ensemble.

    Returns dict with top_positive / top_negative feature contributions,
    or None on failure (caller should keep prediction working).
    """
    try:
        X = np.array(features, dtype=np.float64).reshape(1, -1)

        if X.shape[1] != len(FEATURE_NAMES):
            return None

        explainers = _get_explainers()
        fold_shap = []

        for explainer in explainers:
            raw = explainer.shap_values(X)
            fold_shap.append(_shap_for_fraud_class(raw))

        mean_shap = np.mean(np.vstack(fold_shap), axis=0)

        if mean_shap.shape[0] != len(FEATURE_NAMES):
            return None

        contributions = [
            {
                "feature": FEATURE_NAMES[i],
                "shap_value": float(mean_shap[i]),
            }
            for i in range(len(FEATURE_NAMES))
        ]

        positive = sorted(
            [c for c in contributions if c["shap_value"] > 0],
            key=lambda c: c["shap_value"],
            reverse=True,
        )[:top_k]

        negative = sorted(
            [c for c in contributions if c["shap_value"] < 0],
            key=lambda c: c["shap_value"],
        )[:top_k]

        return {
            "top_positive": positive,
            "top_negative": negative,
        }

    except Exception:
        return None
