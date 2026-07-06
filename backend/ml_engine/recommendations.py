from .services import RecommendationService, build_matrix, cosine_similarity


def get_recommendations(user_id=None, limit=10):
    service = RecommendationService()
    return service.recommend(user_id=user_id, limit=limit)


def recommend(user, limit=10):
    service = RecommendationService()
    return service.recommend_for_user(user=user, limit=limit)
