import os
import json
import numpy as np
import pandas as pd
from xgboost import XGBClassifier


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)


# ============================================================
# LOAD METADATA
# ============================================================

metadata_path = os.path.join(
    MODEL_DIR,
    "metadata.json"
)

with open(metadata_path, "r") as f:
    metadata = json.load(f)


FEATURE_NAMES = metadata["feature_names"]

N_FOLDS = metadata["n_folds"]

THRESHOLD = metadata["average_threshold"]


print("=" * 60)
print("FRAUD PREDICTOR")
print("=" * 60)

print(
    f"Number of features: {len(FEATURE_NAMES)}"
)

print(
    f"Number of models: {N_FOLDS}"
)

print(
    f"Decision threshold: {THRESHOLD:.6f}"
)


# ============================================================
# LOAD 5 XGBOOST MODELS
# ============================================================

models = []


for fold in range(1, N_FOLDS + 1):

    model_path = os.path.join(
        MODEL_DIR,
        f"xgb_fold_{fold}.json"
    )

    print(
        f"Loading model {fold}: {model_path}"
    )

    model = XGBClassifier()

    model.load_model(model_path)

    models.append(model)


print(
    f"\nSuccessfully loaded {len(models)} models."
)


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict(features):

    # --------------------------------------------------------
    # Convert input to numpy
    # --------------------------------------------------------

    X = np.array(
        features,
        dtype=np.float64
    ).reshape(1, -1)


    # --------------------------------------------------------
    # Validate feature count
    # --------------------------------------------------------

    if X.shape[1] != len(FEATURE_NAMES):

        raise ValueError(
            f"Expected {len(FEATURE_NAMES)} features, "
            f"but received {X.shape[1]}"
        )


    # --------------------------------------------------------
    # Get probability from each fold model
    # --------------------------------------------------------

    fold_probabilities = []


    for model in models:

        probability = model.predict_proba(
            X
        )[0][1]

        fold_probabilities.append(
            float(probability)
        )


    # --------------------------------------------------------
    # Average probabilities
    # --------------------------------------------------------

    average_probability = float(
        np.mean(fold_probabilities)
    )


    # --------------------------------------------------------
    # Apply trained threshold
    # --------------------------------------------------------

    prediction = int(
        average_probability >= THRESHOLD
    )


    # --------------------------------------------------------
    # Application-level risk
    # --------------------------------------------------------

    if average_probability >= 0.80:

        risk_level = "HIGH"

    elif average_probability >= 0.50:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"


    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {

        "prediction": prediction,

        "probability": average_probability,

        "risk_level": risk_level,

        "threshold": THRESHOLD,

        "fold_probabilities": fold_probabilities
    }


# ============================================================
# TEST SAVED MODELS
# ============================================================

if __name__ == "__main__":

    # --------------------------------------------------------
    # Load test dataset
    # --------------------------------------------------------

    test_path = os.path.join(
        BASE_DIR,
        "test_smote.csv"
    )

    print(
        f"\nLoading test dataset: {test_path}"
    )

    test_df = pd.read_csv(
        test_path
    )


    # --------------------------------------------------------
    # Verify required columns
    # --------------------------------------------------------

    missing_features = [
        feature
        for feature in FEATURE_NAMES
        if feature not in test_df.columns
    ]

    if missing_features:

        raise ValueError(
            "Missing features in test dataset: "
            + str(missing_features)
        )


    X_test = test_df[
        FEATURE_NAMES
    ]

    y_test = test_df["Class"]


    print(
        f"Test dataset rows: {len(test_df)}"
    )


    # ========================================================
    # TEST 10 TRANSACTIONS
    # ========================================================

    print("\n")
    print("=" * 80)
    print("TESTING FIRST 10 TRANSACTIONS")
    print("=" * 80)


    for i in range(
        min(10, len(test_df))
    ):

        sample = X_test.iloc[i].tolist()

        result = predict(sample)


        actual = int(
            y_test.iloc[i]
        )


        print("\n" + "-" * 80)

        print(
            f"Row: {i}"
        )

        print(
            f"Actual Class: {actual}"
        )

        print(
            f"Prediction: {result['prediction']}"
        )

        print(
            f"Probability: "
            f"{result['probability']:.10f}"
        )

        print(
            f"Risk Level: "
            f"{result['risk_level']}"
        )

        print(
            f"Threshold: "
            f"{result['threshold']:.6f}"
        )


        print(
            "Fold probabilities:"
        )


        for fold, probability in enumerate(
            result["fold_probabilities"],
            start=1
        ):

            print(
                f"  Fold {fold}: "
                f"{probability:.10f}"
            )


    # ========================================================
    # TEST KNOWN FRAUD TRANSACTIONS
    # ========================================================

    fraud_indices = np.where(
        y_test.to_numpy() == 1
    )[0]


    print("\n")
    print("=" * 80)
    print("TESTING KNOWN FRAUD TRANSACTIONS")
    print("=" * 80)


    if len(fraud_indices) == 0:

        print(
            "No fraud transactions found."
        )

    else:

        for i in fraud_indices[:10]:

            sample = X_test.iloc[i].tolist()

            result = predict(sample)


            print("\n" + "-" * 80)

            print(
                f"Row: {i}"
            )

            print(
                "Actual Class: 1 (FRAUD)"
            )

            print(
                f"Prediction: "
                f"{result['prediction']}"
            )

            print(
                f"Probability: "
                f"{result['probability']:.10f}"
            )

            print(
                f"Risk Level: "
                f"{result['risk_level']}"
            )

            print(
                f"Threshold: "
                f"{result['threshold']:.6f}"
            )


            print(
                "Fold probabilities:"
            )


            for fold, probability in enumerate(
                result["fold_probabilities"],
                start=1
            ):

                print(
                    f"  Fold {fold}: "
                    f"{probability:.10f}"
                )


    # ========================================================
    # SUMMARY
    # ========================================================

    print("\n")
    print("=" * 80)
    print("PREDICTOR TEST COMPLETE")
    print("=" * 80)

    print(
        f"Models loaded: {len(models)}"
    )

    print(
        f"Features expected: "
        f"{len(FEATURE_NAMES)}"
    )

    print(
        f"Threshold: "
        f"{THRESHOLD:.6f}"
    )

    print(
        "\nThe predictor is ready to be connected "
        "to FastAPI if the predictions look correct."
    )