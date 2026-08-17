# ======================================================================
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import auc, precision_recall_curve, roc_curve, roc_auc_score, confusion_matrix
from sklearn.model_selection import StratifiedKFold
from sklearn.decomposition import PCA
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier

np.random.seed(42)#explain this
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

# Training Constants
N_FOLDS = 5
IMBALANCE_RATIO = 0.00172  # 0.172% positive class in test set
CLASS_WEIGHTS = {0: 1.0, 1: 2.0}
PCA_VARIANCE_RETAINED = 0.95  # Keep enough principal componants to Retain 95% of variance

# ======================================================================
print("Loading data...")
train_df = pd.read_csv('train_smote.csv')
test_df = pd.read_csv('test_smote.csv')

print(f"Train dataset shape: {train_df.shape}")
print(f"Test dataset shape:  {test_df.shape}")

# ======================================================================
x_train_full = train_df.drop(columns=['Class']).to_numpy(dtype=np.float64)
y_train_full = train_df['Class'].to_numpy(dtype=np.float64)
x_test = test_df.drop(columns=['Class']).to_numpy(dtype=np.float64)
y_test = test_df['Class'].to_numpy(dtype=np.float64)

print(f"Original Features: {x_train_full.shape[1]}")#shape[1] gives the number of columns

def downsample_validation(y_val_raw, imbalance_ratio, seed):
    neg_idx = np.where(y_val_raw == 0)[0]#It returns the indices where a condition is True.It retruns tuple ,[0] returns the first element of tuple which is array of indices where condition is true
    pos_idx = np.where(y_val_raw == 1)[0]
    neg_count = len(neg_idx)
    pos_needed = int(round(imbalance_ratio * neg_count / (1.0 - imbalance_ratio)))
    rng = np.random.default_rng(seed)#np.random.choice()
    selected_pos = rng.choice(pos_idx, size=pos_needed, replace=False)#Every selected index is unique.
    indices = np.concatenate([neg_idx, selected_pos])
    rng.shuffle(indices)
    return indices

# ======================================================================
kf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=42)

fold_models = []
fold_pcas = []
fold_thresholds = []
fold_val_f1s = []
fold_test_probs = []

for fold, (train_idx, val_idx) in enumerate(kf.split(x_train_full, y_train_full)):#train idx means the indices of the training set and val_idx means the indices of the validation set for each fold
    print(f"\n{'='*60}")
    print(f"FOLD {fold+1}/{N_FOLDS}")
    print(f"{'='*60}")
    
    x_tr = x_train_full[train_idx]#Training features for the current fold
    y_tr = y_train_full[train_idx]#Training labels for the current fold
    x_val_raw = x_train_full[val_idx]#Validation features for the current fold
    y_val_raw = y_train_full[val_idx]#Validation labels for the current fold
    
    ds_indices = downsample_validation(y_val_raw, IMBALANCE_RATIO, seed=42+fold)
    x_val = x_val_raw[ds_indices]
    y_val = y_val_raw[ds_indices]
    print(f"  Train: {len(x_tr)} | Val (downsampled): {len(x_val)} (Class 1: {int(np.sum(y_val))})")
    
    # 1. Standardize
    mean = x_tr.mean(axis=0)
    std = x_tr.std(axis=0)
    std[std == 0] = 1.0
    
    x_tr_s = (x_tr - mean) / std
    x_val_s = (x_val - mean) / std
    x_test_s = (x_test - mean) / std
    
    # 2. PCA
    print(f"  Applying PCA (retaining {PCA_VARIANCE_RETAINED*100}% variance)...")
    pca = PCA(n_components=PCA_VARIANCE_RETAINED, random_state=42)#means that PCA will retain enough components to explain 95% of the variance in the data. The random_state=42 ensures reproducibility of the results.
    x_tr_pca = pca.fit_transform(x_tr_s)#means that PCA is fitted to the standardized training data and then used to transform the training data into the new PCA space. The result is stored in x_tr_pca, which contains the principal components of the training data.
    x_val_pca = pca.transform(x_val_s)#means that the fitted PCA model is used to transform the standardized validation data into the same PCA space as the training data. The result is stored in x_val_pca, which contains the principal components of the validation data.
    x_test_pca = pca.transform(x_test_s)#means that the fitted PCA model is used to transform the standardized test data into the same PCA space as the training data. The result is stored in x_test_pca, which contains the principal components of the test data.
    fold_pcas.append(pca)#means that the fitted PCA model for the current fold is appended to the fold_pcas list, which will be used later for analysis or visualization.
    
    print(f"  PCA Components Retained: {pca.n_components_}")
    if fold == 0:
        fig = plt.figure(figsize=(8,6))
        ax = fig.add_subplot(111, projection='3d')

        ax.scatter(
            x_tr_pca[:,0],
            x_tr_pca[:,1],
            x_tr_pca[:,2],
            c=y_tr,
            cmap='coolwarm',
            alpha=0.5
        )

        ax.set_xlabel("PC1")
        ax.set_ylabel("PC2")
        ax.set_zlabel("PC3")
        plt.show()
        
   
      # 3. Train XGBoost
    print(f"  Training XGBoost...")

   

    model = XGBClassifier(
    objective='binary:logistic',
    eval_metric='logloss',

    n_estimators=1800,
    learning_rate=0.025,

    max_depth=6,
    min_child_weight=2,#means that a leaf node must have at least 2 instances to be considered for splitting. This helps prevent overfitting by ensuring that the model does not create overly complex trees that fit the training data too closely.

    gamma=0.1,

    subsample=0.85,#means Every tree does not use all training rows uses only 85% of training rows.

    colsample_bytree=0.85,#means that each tree will randomly select 85% of the features (columns) to consider for splitting at each node. This helps reduce overfitting and improves generalization by introducing randomness into the feature selection process.

    reg_alpha=0.1,#means that L1 regularization is applied to the weights of the model. It encourages sparsity in the model by penalizing large weights, which can help prevent overfitting and improve generalization.
    reg_lambda=2,#means that L2 regularization is applied to the weights of the model. It penalizes large weights, which can help prevent overfitting and improve generalization.

    random_state=42,
    n_jobs=-1#means that the model will use all available CPU cores for parallel processing, which can speed up training and prediction times
    )

    model.fit(x_tr, y_tr)
    # =============================================================================
#                        XGBOOST TRAINING PIPELINE
# =============================================================================
#
# Training Data
#       │
#       ▼
# Initialize Predictions
# (All samples start with the same prediction)
#       │
#       ▼
# Compute Binary Log Loss
# (Measure prediction error)
#       │
#       ▼
# Compute Gradients
# (Determine how each prediction should change)
#       │
#       ▼
# Build Decision Tree 1
# (Fit the gradients/residuals)
#       │
#       ▼
# Update Predictions
# New Prediction = Old Prediction +
#                  Learning Rate × Tree Output
#       │
#       ▼
# Compute New Loss
#       │
#       ▼
# Compute New Gradients
#       │
#       ▼
# Build Decision Tree 2
# (Correct remaining errors)
#       │
#       ▼
# Repeat for n_estimators Trees
# (300 Trees in this code)
#       │
#       ▼
# Final Prediction Score
# (Sum of outputs from all trees)
#       │
#       ▼
# Apply Sigmoid Function
#       │
#       ▼
# Probability of Fraud
#       │
#       ▼
# Predict Class
# (Threshold = 0.5 or Tuned Threshold)
#
# =============================================================================

    # Evaluate Validation
    val_probs = model.predict_proba(x_val)[:, 1]#means that the model is used to predict the probabilities of the positive class (class 1) for the validation data. The predict_proba method returns an array of shape (n_samples, n_classes), where n_samples is the number of samples in the validation set and n_classes is the number of classes (2 in this case). The [:, 1] indexing selects the probabilities for class 1 (the positive class) from this array, resulting in a 1D array of probabilities for each sample in the validation set.
    
    best_epoch_f1 = -1.0
    best_epoch_thresh = 0.5
    for thresh in np.arange(0.01, 1.00, 0.01):
        preds = (val_probs >= thresh).astype(int)
        tp = np.sum((y_val == 1) & (preds == 1))
        fp = np.sum((y_val == 0) & (preds == 1))
        fn = np.sum((y_val == 1) & (preds == 0))
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2.0 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0.0
        if f1 > best_epoch_f1:
            best_epoch_f1 = f1
            best_epoch_thresh = thresh
            
    fold_thresholds.append(best_epoch_thresh)
    fold_val_f1s.append(best_epoch_f1)
    
    # Predict Test
    test_probs = model.predict_proba(x_test)[:, 1]
    fold_test_probs.append(test_probs)
    
    print(f"  Best Val F1: {best_epoch_f1:.4f} | Threshold: {best_epoch_thresh:.2f}")

print(f"\n{'='*60}")
print(f"K-Fold Training Complete!")
print(f"{'='*60}")

# ======================================================================
fold_summary = pd.DataFrame({
    'Fold': [f'Fold {i+1}' for i in range(N_FOLDS)],
    'Val F1-Score': fold_val_f1s,
    'Tuned Threshold': fold_thresholds
})
print(fold_summary.to_string(index=False))
print(f"\nMean Val F1:     {np.mean(fold_val_f1s):.4f} +/- {np.std(fold_val_f1s):.4f}")
print(f"Mean Threshold:  {np.mean(fold_thresholds):.4f}")


# ======================================================================
avg_test_probs = np.mean(fold_test_probs, axis=0)
avg_threshold = np.mean(fold_thresholds)

def print_report(y_true, probabilities, threshold, name="Model"):
    preds = (probabilities >= threshold).astype(int)
    cm = confusion_matrix(y_true, preds)
    tp, fp, fn, tn = cm[1, 1], cm[0, 1], cm[1, 0], cm[0, 0]
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2.0 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / len(y_true)
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    
    roc_auc = roc_auc_score(y_true, probabilities)
    p_c, r_c, _ = precision_recall_curve(y_true, probabilities)
    pr_auc = auc(r_c, p_c)
    
    print(f"=== {name} (Threshold = {threshold:.4f}) ===")
    print(f"Accuracy:    {accuracy:.4f}")
    print(f"Precision:   {precision:.4f}")
    print(f"Recall:      {recall:.4f}")
    print(f"F1-Score:    {f1:.4f}")
    print(f"Specificity: {specificity:.4f}")
    print(f"ROC AUC:     {roc_auc:.4f}")
    print(f"PR AUC:      {pr_auc:.4f}")
    print(f"\nConfusion Matrix:")
    print(f"  TP={tp:5d} | FP={fp:5d}")
    print(f"  FN={fn:5d} | TN={tn:5d}\n")
    return cm, precision, recall, f1

print("\n--- Default Threshold ---")
_, _, _, _ = print_report(y_test, avg_test_probs, 0.50, name="Ensemble SVM (Default)")

print("--- Tuned Threshold ---")
cm_best, prec_best, rec_best, f1_best = print_report(y_test, avg_test_probs, avg_threshold, name="Ensemble SVM (Tuned)")

# ======================================================================
fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(cm_best, interpolation='nearest', cmap=plt.cm.Blues)
ax.figure.colorbar(im, ax=ax)
ax.set(
    xticks=np.arange(cm_best.shape[1]), yticks=np.arange(cm_best.shape[0]),
    xticklabels=['Non-Fraud', 'Fraud'], yticklabels=['Non-Fraud', 'Fraud'],
    title=f'Ensemble Confusion Matrix (Threshold = {avg_threshold:.4f})',
    ylabel='True Label', xlabel='Predicted Label'
)
thresh_cm = cm_best.max() / 2.
for i in range(cm_best.shape[0]):
    for j in range(cm_best.shape[1]):
        ax.text(j, i, format(cm_best[i, j], 'd'),
                ha='center', va='center',
                color='white' if cm_best[i, j] > thresh_cm else 'black')
plt.tight_layout()
plt.show()

# ======================================================================
fpr, tpr, _ = roc_curve(y_test, avg_test_probs)
p_curve, r_curve, _ = precision_recall_curve(y_test, avg_test_probs)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
ax1.plot(fpr, tpr, label=f'ROC (AUC = {roc_auc_score(y_test, avg_test_probs):.4f})', color='steelblue', linewidth=2.5)
ax1.plot([0, 1], [0, 1], 'k--', alpha=0.5)
ax1.set_xlabel('False Positive Rate', fontsize=12)
ax1.set_ylabel('True Positive Rate', fontsize=12)
ax1.set_title('ROC Curve (5-Fold Ensemble)', fontsize=13, fontweight='bold')
ax1.legend(fontsize=10, loc='lower right')
ax1.grid(True, alpha=0.3)

ax2.plot(r_curve, p_curve, label=f'PR (AUC = {auc(r_curve, p_curve):.4f})', color='teal', linewidth=2.5)
ax2.scatter(rec_best, prec_best, color='crimson', zorder=5, s=80, label=f'Operating Point (F1={f1_best:.4f})')
ax2.set_xlabel('Recall', fontsize=12)
ax2.set_ylabel('Precision', fontsize=12)
ax2.set_title('Precision-Recall Curve (5-Fold Ensemble)', fontsize=13, fontweight='bold')
ax2.legend(fontsize=10, loc='lower left')
ax2.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
