import pandas as pd, numpy as np, json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, roc_auc_score, confusion_matrix, classification_report)

df = pd.read_excel("/mnt/user-data/outputs/upi_fraud_synthetic_dataset.xlsx", sheet_name="Transactions")

df["is_p2m"] = (df["txn_type"] == "P2M").astype(int)
df["device_changed"] = df["device_changed"].astype(bool).astype(int)
df["sim_swap_flag"] = df["sim_swap_flag"].astype(bool).astype(int)
df["unverified_merchant"] = ((df["is_p2m"] == 1) & (df["merchant_verified"] == False)).astype(int)
df["amount_log"] = np.log1p(df["amount_inr"])
df["label"] = df["risk_level"].isin(["high", "critical"]).astype(int)

FEATURES = ["amount_log", "otp_failed_attempts", "txns_last_90s_same_user",
            "device_changed", "sim_swap_flag", "unverified_merchant", "is_p2m"]
LABELS = {
    "amount_log": "Transaction amount (log)",
    "otp_failed_attempts": "Failed OTP attempts",
    "txns_last_90s_same_user": "Transfers in last 90s (velocity)",
    "device_changed": "Device change",
    "sim_swap_flag": "Active SIM-swap window",
    "unverified_merchant": "Unverified / fake merchant",
    "is_p2m": "P2M transaction type",
}

X = df[FEATURES].values
y = df["label"].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

scaler = StandardScaler().fit(X_train)
X_train_s, X_test_s = scaler.transform(X_train), scaler.transform(X_test)

# Interpretable model -> deployed for investigators
lr = LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)
lr.fit(X_train_s, y_train)
lr_pred = lr.predict(X_test_s)
lr_proba = lr.predict_proba(X_test_s)[:, 1]

# Black-box benchmark -> performance comparison only, NOT deployed (kept for reference)
rf = RandomForestClassifier(n_estimators=300, max_depth=6, class_weight="balanced", random_state=42)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)
rf_proba = rf.predict_proba(X_test)[:, 1]

def metrics(y_true, y_pred, y_proba):
    return {
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred), 4),
        "recall": round(recall_score(y_true, y_pred), 4),
        "f1": round(f1_score(y_true, y_pred), 4),
        "roc_auc": round(roc_auc_score(y_true, y_proba), 4),
    }

lr_metrics = metrics(y_test, lr_pred, lr_proba)
rf_metrics = metrics(y_test, rf_pred, rf_proba)
cm = confusion_matrix(y_test, lr_pred).tolist()

print("Logistic Regression (deployed, explainable):", lr_metrics)
print("Random Forest (benchmark, black-box):", rf_metrics)
print("Confusion matrix (LR):", cm)
print(classification_report(y_test, lr_pred, target_names=["not_fraud", "fraud"]))

# Export coefficients for client-side (browser) scoring, fully reproducing sklearn's math
export = {
    "features": FEATURES,
    "feature_labels": [LABELS[f] for f in FEATURES],
    "scaler_mean": scaler.mean_.tolist(),
    "scaler_scale": scaler.scale_.tolist(),
    "coefficients": lr.coef_[0].tolist(),
    "intercept": float(lr.intercept_[0]),
    "metrics": {"logistic_regression": lr_metrics, "random_forest_benchmark": rf_metrics},
    "confusion_matrix": cm,
    "train_rows": int(len(X_train)),
    "test_rows": int(len(X_test)),
    "fraud_rate_train": round(float(y_train.mean()), 4),
}
with open("/home/claude/model_export.json", "w") as f:
    json.dump(export, f, indent=2)

print("\nExported coefficients:")
for f, lbl, c in zip(FEATURES, export["feature_labels"], export["coefficients"]):
    print(f"  {lbl:38s} coef={c:+.3f}")
print(f"  intercept = {export['intercept']:+.3f}")
