# Architecture

## Overview

DigiBazar is built as a decoupled marketplace platform with:

- Django REST backend for data, auth, orders, and ML services
- React/Vite frontend for user-facing browsing and checkout
- ML engine module for recommendations, ranking, and trending analytics

## Backend

- `backend/config/` contains the Django project configuration
- `backend/core/` contains marketplace models, serializers, views, and URLs
- `backend/ml_engine/` contains recommendation, ranking, and analytics logic

## Frontend

- `frontend/src/` contains React pages, components, API clients, and context providers
- `frontend/package.json` and `vite.config.js` power the Vite build and development workflow

## Data Model

- Users can be buyers or shop owners
- Shops have categories, location metadata, ratings, and tiers
- Products belong to shops and categories
- Orders are placed by users and contain order items with snapshot pricing

## ML & Ranking

- Recommendations use purchase history and collaborative filtering
- Trending endpoints surface recent and best-selling products
- Shop ranking combines distance, price, rating, and tier scores

## Deployment Notes

- Use SQLite for development; switch to Postgres for production
- Serve static files from `backend/static/`
- Use `django-rest-framework-simplejwt` for JWT auth
