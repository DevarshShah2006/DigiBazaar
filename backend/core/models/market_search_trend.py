from django.db import models

class MarketSearchTrend(models.Model):
    keyword = models.CharField(max_length=100, unique=True)
    trend_score = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.keyword} ({self.trend_score})"
