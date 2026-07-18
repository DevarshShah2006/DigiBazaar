import os
# pyrefly: ignore [missing-import]
import joblib
import pandas as pd

class DeliveryPredictor:
    """Singleton service to load the Delivery ML model and predict optimal modes."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DeliveryPredictor, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.encoder = None
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        models_dir = os.path.join(os.path.dirname(__file__), "models")
        model_path = os.path.join(models_dir, "delivery_tree.joblib")
        encoder_path = os.path.join(models_dir, "delivery_label_encoder.joblib")

        try:
            self.model = joblib.load(model_path)
            self.encoder = joblib.load(encoder_path)
        except Exception as e:
            print(f"Failed to load ML Delivery model: {e}")

    def predict(self, feature_dict):
        """
        Predict delivery mode.
        Args:
            feature_dict: dict with keys matching training data
                - distance_km
                - order_value
                - rider_availability ("Low", "Medium", "High")
                - shop_delivery_enabled
                - pickup_enabled
                - digibazaar_delivery_enabled
                - shop_rating
                - avg_prep_time_mins
                - current_pending_orders
                - shop_delivery_radius_km
        Returns:
            (predicted_mode: str, confidence_score: float)
        """
        if not self.model or not self.encoder:
            return None, 0.0

        try:
            # Map categorical string to integer
            rider_mapping = {"Low": 0, "Medium": 1, "High": 2}
            feature_dict["rider_availability"] = rider_mapping.get(
                feature_dict.get("rider_availability", "Medium"), 1
            )

            # Ensure all required features are present
            required_features = [
                "distance_km", "order_value", "rider_availability",
                "shop_delivery_enabled", "pickup_enabled", "digibazaar_delivery_enabled",
                "shop_rating", "avg_prep_time_mins", "current_pending_orders",
                "shop_delivery_radius_km"
            ]

            # Construct DataFrame for prediction
            df = pd.DataFrame([{feature: feature_dict.get(feature, 0) for feature in required_features}])

            # Predict probabilities
            probabilities = self.model.predict_proba(df)[0]
            
            # Predict class
            class_idx = self.model.predict(df)[0]
            predicted_mode = self.encoder.inverse_transform([class_idx])[0]
            confidence_score = round(probabilities[class_idx] * 100, 2)

            return predicted_mode, confidence_score

        except Exception as e:
            print(f"ML Prediction failed: {e}")
            return None, 0.0

# Export a single instance to be imported and used globally
delivery_predictor = DeliveryPredictor()
