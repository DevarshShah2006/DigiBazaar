# Report

## Project Summary

DigiBazar is a digital marketplace prototype combining a Django REST backend with a React/Vite frontend. The platform supports product search, shop ranking, order checkout, authentication, and personalized recommendations.

## What was built

- Django backend with REST API endpoints for auth, products, shops, orders, recommendations, and trending
- ML engine module for shop ranking, collaborative filtering, and analytics
- React frontend scaffold with routing, API client stubs, and context providers
- Documentation for ER model, API, architecture, sprint plan, and screenshots

## Key Decisions

- Used `djangorestframework-simplejwt` for JWT authentication
- Represented shop and product data with explicit models and relationships
- Implemented shop ranking using distance, price, rating, and tier score
- Added collaborative filtering recommendations using cosine similarity on order history

## Next steps

- Build full frontend UI for product/product detail, checkout, orders, and shop dashboard
- Add tests for backend APIs and ML services
- Replace SQLite with PostgreSQL for production readiness
- Add deployment configuration and Docker compose
