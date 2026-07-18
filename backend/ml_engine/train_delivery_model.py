import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import joblib

def train():
    data_path = os.path.join(os.path.dirname(__file__), "dataset", "delivery_data.csv")
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Run data_generator.py first.")
        return

    print("Loading dataset...")
    df = pd.read_csv(data_path)

    # Encode categorical features
    # rider_availability: Low -> 0, Medium -> 1, High -> 2
    rider_mapping = {"Low": 0, "Medium": 1, "High": 2}
    df['rider_availability'] = df['rider_availability'].map(rider_mapping)

    # Features (X) and Target (y)
    X = df.drop(columns=['delivery_mode'])
    y = df['delivery_mode']

    # Encode target labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Check classes
    classes = label_encoder.classes_
    print(f"Target Classes: {classes}")

    # Split 80/20
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

    print("Training Decision Tree Classifier...")
    model = DecisionTreeClassifier(max_depth=6, random_state=42)
    model.fit(X_train, y_train)

    # Predictions
    y_pred = model.predict(X_test)

    # Evaluation
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    cm = confusion_matrix(y_test, y_pred)

    print("\n--- Evaluation Metrics ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print("\nConfusion Matrix:")
    print(cm)
    
    # Save Model and Encoder
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(models_dir, exist_ok=True)
    
    model_path = os.path.join(models_dir, "delivery_tree.joblib")
    encoder_path = os.path.join(models_dir, "delivery_label_encoder.joblib")
    
    joblib.dump(model, model_path)
    joblib.dump(label_encoder, encoder_path)
    
    print(f"\nModel successfully saved to {model_path}")
    print(f"Encoder successfully saved to {encoder_path}")

if __name__ == "__main__":
    train()
