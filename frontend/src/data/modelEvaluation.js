/**
 * Offline experiment evaluation results.
 * These are static completed-experiment metrics — not live production KPIs.
 * Do not invent or alter these values.
 */

export const EVALUATION_NOTE =
  "Evaluation Results — offline experiment metrics from completed model comparisons. Not live production KPIs.";

export const PRODUCTION_MODEL = {
  name: "5-Fold XGBoost Ensemble",
  status: "PRODUCTION",
  accuracy: 99.96,
  precision: 94.12,
  recall: 81.63,
  f1: 87.43,
  threshold: 0.928,
  thresholdPercent: 92.8,
};

export const MODEL_COMPARISON = [
  {
    model: "SLP",
    accuracy: 99.88,
    precision: 60.74,
    recall: 83.67,
    f1: 70.39,
    selected: false,
  },
  {
    model: "MLP",
    accuracy: 99.93,
    precision: 80.61,
    recall: 80.61,
    f1: 80.61,
    selected: false,
  },
  {
    model: "Keras Tuner",
    accuracy: 99.92,
    precision: 75.49,
    recall: 78.57,
    f1: 77.0,
    selected: false,
  },
  {
    model: "SMOTE-Tomek + Keras HPO",
    shortLabel: "SMOTE-Tomek",
    accuracy: 99.93,
    precision: 81.52,
    recall: 76.53,
    f1: 78.95,
    selected: false,
  },
  {
    model: "PCA + Linear SVM",
    shortLabel: "Linear SVM",
    accuracy: 99.81,
    precision: 47.34,
    recall: 81.63,
    f1: 59.93,
    selected: false,
  },
  {
    model: "PCA + Nystroem SVM",
    shortLabel: "Nystroem SVM",
    accuracy: 99.83,
    precision: 50.96,
    recall: 81.63,
    f1: 62.75,
    selected: false,
  },
  {
    model: "PCA + RBF SVM",
    shortLabel: "RBF SVM",
    accuracy: 99.62,
    precision: 26.38,
    recall: 68.37,
    f1: 38.07,
    selected: false,
  },
  {
    model: "Random Forest",
    accuracy: 99.94,
    precision: 97.01,
    recall: 66.33,
    f1: 78.79,
    selected: false,
  },
  {
    model: "XGBoost",
    accuracy: 99.96,
    precision: 94.12,
    recall: 81.63,
    f1: 87.43,
    selected: true,
  },
];

export const PIPELINE_STEPS = [
  "Dataset",
  "Feature preparation (34 features)",
  "5-fold training",
  "XGBoost fold models",
  "Probability averaging",
  "Threshold = 0.928",
  "Fraud / Legitimate",
  "SHAP explanation",
  "PostgreSQL storage",
];

export const SELECTION_RATIONALE = [
  "Among the tested models, XGBoost achieved the highest F1 score (87.43%).",
  "It balanced high precision (94.12%) with stronger recall (81.63%) than Random Forest.",
  "Accuracy alone is not the primary selection criterion for fraud detection because the class distribution is highly imbalanced.",
  "The production system deploys a 5-fold XGBoost ensemble that averages fold probabilities before applying the production threshold.",
];
