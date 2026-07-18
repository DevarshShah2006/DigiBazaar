import pandas as pd
import random
import os

def generate_delivery_dataset(num_samples=5000, output_path="dataset/delivery_data.csv"):
    data = []
    
    for _ in range(num_samples):
        distance_km = round(random.uniform(0.1, 15.0), 2)
        order_value = round(random.uniform(50, 3000), 2)
        rider_availability = random.choice(["Low", "Medium", "High"])
        shop_delivery_enabled = random.choice([0, 1])
        pickup_enabled = random.choice([0, 1])
        digibazaar_delivery_enabled = random.choice([0, 1])
        
        # Ensure at least one is enabled
        if not (shop_delivery_enabled or pickup_enabled or digibazaar_delivery_enabled):
            digibazaar_delivery_enabled = 1
            
        shop_rating = round(random.uniform(2.5, 5.0), 1)
        avg_prep_time_mins = random.randint(5, 30)
        current_pending_orders = random.randint(0, 50)
        shop_delivery_radius_km = round(random.uniform(2.0, 8.0), 1) if shop_delivery_enabled else 0.0
        
        # Heuristic target assignment (mimicking real-world business logic)
        mode = "digibazaar_delivery" # Default fallback
        
        # Rule 1: Very close + small order -> Pickup (if enabled)
        if pickup_enabled and distance_km < 1.0 and order_value < 150:
            mode = "pickup"
        # Rule 2: Within shop radius + not too busy + shop delivery enabled
        elif shop_delivery_enabled and distance_km <= shop_delivery_radius_km and current_pending_orders < 15:
            # If riders are low, shop handles it. If riders are high and order is big, maybe platform handles it.
            if rider_availability == "Low" or order_value < 400:
                mode = "shop_delivery"
            else:
                mode = "digibazaar_delivery" if digibazaar_delivery_enabled else "shop_delivery"
        # Rule 3: Far distance or busy shop -> Platform delivery
        elif distance_km > shop_delivery_radius_km or current_pending_orders >= 15:
            if digibazaar_delivery_enabled and rider_availability in ["Medium", "High"]:
                mode = "digibazaar_delivery"
            elif shop_delivery_enabled and distance_km <= shop_delivery_radius_km:
                mode = "shop_delivery"
            elif pickup_enabled:
                mode = "pickup"
        
        # Failsafe overrides if the chosen mode is disabled
        if mode == "pickup" and not pickup_enabled:
            mode = "digibazaar_delivery" if digibazaar_delivery_enabled else "shop_delivery"
        if mode == "shop_delivery" and not shop_delivery_enabled:
            mode = "digibazaar_delivery" if digibazaar_delivery_enabled else "pickup"
        if mode == "digibazaar_delivery" and not digibazaar_delivery_enabled:
            mode = "shop_delivery" if shop_delivery_enabled else "pickup"
            
        # Add some noise (5% chance of random valid choice)
        if random.random() < 0.05:
            valid_modes = []
            if pickup_enabled: valid_modes.append("pickup")
            if shop_delivery_enabled: valid_modes.append("shop_delivery")
            if digibazaar_delivery_enabled: valid_modes.append("digibazaar_delivery")
            if valid_modes:
                mode = random.choice(valid_modes)

        data.append({
            "distance_km": distance_km,
            "order_value": order_value,
            "rider_availability": rider_availability,
            "shop_delivery_enabled": shop_delivery_enabled,
            "pickup_enabled": pickup_enabled,
            "digibazaar_delivery_enabled": digibazaar_delivery_enabled,
            "shop_rating": shop_rating,
            "avg_prep_time_mins": avg_prep_time_mins,
            "current_pending_orders": current_pending_orders,
            "shop_delivery_radius_km": shop_delivery_radius_km,
            "delivery_mode": mode
        })

    df = pd.DataFrame(data)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {num_samples} samples at {output_path}")

if __name__ == "__main__":
    generate_delivery_dataset()
