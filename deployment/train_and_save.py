import os
import json
import numpy as np
import pandas as pd

from sklearn.model_selection import StratifiedKFold
from xgboost import XGBClassifier


# ============================================================
# CONFIG
# ============================================================

N_FOLDS = 5
IMBALANCE_RATIO = 0.00172

MODEL_DIR = "models"

os.makedirs(MODEL_DIR, exist_ok=True)


# ============================================================
# LOAD DATA
# ============================================================

print("Loading data...")

train_df = pd.read_csv("train_smote.csv")
test_df = pd.read_csv("test_smote.csv")

print("Train shape:", train_df.shape)
print("Test shape :", test_df.shape)


# ============================================================
# FEATURES / TARGET
# ============================================================

feature_names = [
    col for col in train_df.columns
    if col != "Class"
]

x_train_full = train_df[feature_names].to_numpy(
    dtype=np.float64
)

y_train_full = train_df["Class"].to_numpy(
    dtype=np.float64
)

x_test = test_df[feature_names].to_numpy(
    dtype=np.float64
)

y_test = test_df["Class"].to_numpy(
    dtype=np.float64
)

print("Number of features:", len(feature_names))


# ============================================================
# VALIDATION DOWNSAMPLING
# ============================================================

def downsample_validation(
    y_val_raw,
    imbalance_ratio,
    seed
):

    neg_idx = np.where(
        y_val_raw == 0
    )[0]

    pos_idx = np.where(
        y_val_raw == 1
    )[0]

    neg_count = len(neg_idx)

    pos_needed = int(
        round(
            imbalance_ratio * neg_count /
            (1.0 - imbalance_ratio)
        )
    )

    rng = np.random.default_rng(seed)

    selected_pos = rng.choice(
        pos_idx,
        size=pos_needed,
        replace=False
    )

    indices = np.concatenate([
        neg_idx,
        selected_pos
    ])

    rng.shuffle(indices)

    return indices


# ============================================================
# 5-FOLD TRAINING
# ============================================================

kf = StratifiedKFold(
    n_splits=N_FOLDS,
    shuffle=True,
    random_state=42
)

fold_thresholds = []
fold_val_f1s = []

fold_models = []
fold_test_probs = []


for fold, (train_idx, val_idx) in enumerate(
    kf.split(
        x_train_full,
        y_train_full
    )
):

    print("\n" + "=" * 60)
    print(f"FOLD {fold + 1}/{N_FOLDS}")
    print("=" * 60)


    # --------------------------------------------------------
    # TRAINING DATA
    # --------------------------------------------------------

    x_tr = x_train_full[train_idx]
    y_tr = y_train_full[train_idx]


    # --------------------------------------------------------
    # VALIDATION DATA
    # --------------------------------------------------------

    x_val_raw = x_train_full[val_idx]
    y_val_raw = y_train_full[val_idx]

    ds_indices = downsample_validation(
        y_val_raw,
        IMBALANCE_RATIO,
        seed=42 + fold
    )

    x_val = x_val_raw[ds_indices]
    y_val = y_val_raw[ds_indices]

    print(
        f"Train: {len(x_tr)} | "
        f"Val: {len(x_val)} | "
        f"Class 1: {int(np.sum(y_val))}"
    )


    # ========================================================
    # XGBOOST
    # ========================================================

    model = XGBClassifier(

        objective="binary:logistic",

        eval_metric="logloss",

        n_estimators=1800,

        learning_rate=0.025,

        max_depth=6,

        min_child_weight=2,

        gamma=0.1,

        subsample=0.85,

        colsample_bytree=0.85,

        reg_alpha=0.1,

        reg_lambda=2,

        random_state=42,

        n_jobs=-1
    )


    # IMPORTANT:
    # This exactly matches your original code.
    # XGBoost is trained on the ORIGINAL 34 FEATURES.

    model.fit(
        x_tr,
        y_tr
    )


    # ========================================================
    # VALIDATION PREDICTION
    # ========================================================

    val_probs = model.predict_proba(
        x_val
    )[:, 1]


    # ========================================================
    # FIND BEST F1 THRESHOLD
    # ========================================================

    best_f1 = -1.0
    best_threshold = 0.5


    for threshold in np.arange(
        0.01,
        1.00,
        0.01
    ):

        preds = (
            val_probs >= threshold
        ).astype(int)


        tp = np.sum(
            (y_val == 1) &
            (preds == 1)
        )

        fp = np.sum(
            (y_val == 0) &
            (preds == 1)
        )

        fn = np.sum(
            (y_val == 1) &
            (preds == 0)
        )


        precision = (
            tp / (tp + fp)
            if (tp + fp) > 0
            else 0.0
        )

        recall = (
            tp / (tp + fn)
            if (tp + fn) > 0
            else 0.0
        )


        f1 = (
            2 * precision * recall /
            (precision + recall)
            if (precision + recall) > 0
            else 0.0
        )


        if f1 > best_f1:

            best_f1 = f1
            best_threshold = threshold


    fold_thresholds.append(
        float(best_threshold)
    )

    fold_val_f1s.append(
        float(best_f1)
    )


    # ========================================================
    # SAVE MODEL
    # ========================================================

    model_path = os.path.join(
        MODEL_DIR,
        f"xgb_fold_{fold + 1}.json"
    )

    model.save_model(
        model_path
    )

    print(
        f"Saved: {model_path}"
    )

    print(
        f"Best Val F1: {best_f1:.4f}"
    )

    print(
        f"Threshold: {best_threshold:.2f}"
    )


    # Store model
    fold_models.append(model)


    # ========================================================
    # TEST PROBABILITY
    # ========================================================

    test_probs = model.predict_proba(
        x_test
    )[:, 1]

    fold_test_probs.append(
        test_probs
    )


# ============================================================
# ENSEMBLE
# ============================================================

avg_test_probs = np.mean(
    fold_test_probs,
    axis=0
)

avg_threshold = np.mean(
    fold_thresholds
)


# ============================================================
# SAVE METADATA
# ============================================================

metadata = {

    "model_type": "XGBoost",

    "ensemble_type": "5-fold probability averaging",

    "n_folds": N_FOLDS,

    "num_features": len(feature_names),

    "feature_names": feature_names,

    "fold_thresholds": fold_thresholds,

    "average_threshold": float(
        avg_threshold
    ),

    "fold_validation_f1": fold_val_f1s,

    "mean_validation_f1": float(
        np.mean(fold_val_f1s)
    ),

    "std_validation_f1": float(
        np.std(fold_val_f1s)
    ),

    "xgboost_parameters": {

        "n_estimators": 1800,

        "learning_rate": 0.025,

        "max_depth": 6,

        "min_child_weight": 2,

        "gamma": 0.1,

        "subsample": 0.85,

        "colsample_bytree": 0.85,

        "reg_alpha": 0.1,

        "reg_lambda": 2
    },

    "input_type": "original_34_features",

    "pca_used_for_xgboost": False
}


with open(
    os.path.join(
        MODEL_DIR,
        "metadata.json"
    ),
    "w"
) as f:

    json.dump(
        metadata,
        f,
        indent=4
    )


# ============================================================
# FINAL TEST RESULT
# ============================================================

test_predictions = (
    avg_test_probs >= avg_threshold
).astype(int)


tp = np.sum(
    (y_test == 1) &
    (test_predictions == 1)
)

fp = np.sum(
    (y_test == 0) &
    (test_predictions == 1)
)

fn = np.sum(
    (y_test == 1) &
    (test_predictions == 0)
)

tn = np.sum(
    (y_test == 0) &
    (test_predictions == 0)
)


precision = (
    tp / (tp + fp)
    if (tp + fp) > 0
    else 0
)

recall = (
    tp / (tp + fn)
    if (tp + fn) > 0
    else 0
)

f1 = (
    2 * precision * recall /
    (precision + recall)
    if precision + recall > 0
    else 0
)

accuracy = (
    (tp + tn) / len(y_test)
)


# ============================================================
# OUTPUT
# ============================================================

print("\n" + "=" * 60)
print("MODEL SAVING COMPLETE")
print("=" * 60)

print("\nSaved models:")

for i in range(1, N_FOLDS + 1):

    print(
        f"  models/xgb_fold_{i}.json"
    )

print(
    "\nAverage threshold:",
    round(avg_threshold, 4)
)

print(
    "Test Accuracy:",
    f"{accuracy:.4f}"
)

print(
    "Test Precision:",
    f"{precision:.4f}"
)

print(
    "Test Recall:",
    f"{recall:.4f}"
)

print(
    "Test F1:",
    f"{f1:.4f}"
)

print(
    "\nMetadata saved to:",
    "models/metadata.json"
)