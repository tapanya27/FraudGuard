from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

import sys
import os


# ============================================================
# ADD DEPLOYMENT DIRECTORY TO PYTHON PATH
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DEPLOYMENT_DIR = os.path.join(
    BASE_DIR,
    "deployment"
)

sys.path.append(DEPLOYMENT_DIR)


# ============================================================
# IMPORT PREDICTOR + EXPLAINABILITY
# ============================================================

from predictor import predict, FEATURE_NAMES
from explainability import explain


# ============================================================
# CREATE FASTAPI APP
# ============================================================

app = FastAPI(
    title="Fraud Intelligence API",
    description="ML inference API for fraud risk prediction",
    version="1.1.0"
)


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

class PredictionRequest(BaseModel):

    features: list[float] = Field(
        ...,
        description="34 transaction features"
    )


class FeatureContribution(BaseModel):

    feature: str

    shap_value: float


class Explanation(BaseModel):

    top_positive: list[FeatureContribution]

    top_negative: list[FeatureContribution]


class PredictionResponse(BaseModel):

    prediction: int

    probability: float

    risk_level: str

    threshold: float

    fold_probabilities: list[float]

    explanation: Optional[Explanation] = None


@app.on_event("startup")
def warmup_explainers():
    """Build SHAP explainers at boot so the first /predict is not a 30s+ cold hit."""
    try:
        zeros = [0.0] * len(FEATURE_NAMES)
        explain(zeros)
        print("SHAP explainers warmed up")
    except Exception as e:
        print("SHAP warmup skipped:", type(e).__name__, str(e))


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def root():

    return {
        "message": "Fraud Intelligence API is running",
        "model": "XGBoost 5-Fold Ensemble",
        "features": len(FEATURE_NAMES),
        "explainability": "ensemble mean SHAP"
    }


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "models_loaded": True,
        "model_count": 5,
        "features": len(FEATURE_NAMES)
    }


# ============================================================
# PREDICTION ENDPOINT
# ============================================================

@app.post(
    "/predict",
    response_model=PredictionResponse
)
def predict_fraud(
    request: PredictionRequest
):

    try:

        result = predict(
            request.features
        )

        # SHAP must never fail the prediction itself
        explanation = explain(request.features)
        result["explanation"] = explanation

        return result

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:
        print("Prediction failed:", type(e).__name__, str(e))
        raise HTTPException(
            status_code=500,
            detail="Prediction failed"
        )
