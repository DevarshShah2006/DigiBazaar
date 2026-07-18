from django.db import models
from .shop import Shop
from .product import Product

class DemandForecast(models.Model):
    """Stores daily product demand predictions and actual sales metrics."""
    shop = models.ForeignKey(
        Shop, 
        on_delete=models.CASCADE, 
        related_name="demand_forecasts"
    )
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name="demand_forecasts"
    )
    date = models.DateField(db_index=True)
    
    # ML prediction values
    predicted_quantity = models.FloatField(default=0.0)
    actual_quantity = models.FloatField(null=True, blank=True)
    
    # Model evaluation metrics snapshot at train time
    mae = models.FloatField(default=0.0)
    mse = models.FloatField(default=0.0)
    r2_score = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Demand Forecast"
        verbose_name_plural = "Demand Forecasts"
        unique_together = ("shop", "product", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.shop.name} — {self.product.name} ({self.date}): Pred={self.predicted_quantity}, Act={self.actual_quantity}"
