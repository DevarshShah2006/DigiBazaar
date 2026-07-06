# API Documentation

## Base URL

`http://localhost:8000/api/`

## Auth

- `POST /auth/signup/`
  - Request: `{ "username": "...", "email": "...", "password": "..." }`
  - Response: access token, refresh token, created user

- `POST /auth/login/`
  - Request: `{ "username": "...", "password": "..." }`
  - Response: access token, refresh token, user

- `POST /auth/refresh/`
  - Request: `{ "refresh": "..." }`
  - Response: new access token

## Products

- `GET /products/list/`
  - Returns list of products

- `GET /products/search/?q=<query>`
  - Returns products matching search term

- `GET /products/detail/<id>/`
  - Returns product details

## Shops

- `GET /shops/detail/<id>/`
  - Returns shop details and products

- `GET /shops/ranking/?lat=<lat>&long=<long>`
  - Returns ranked shops using distance, price, rating, and tier

## Orders

- `POST /orders/checkout/`
  - Request: `{ "items": [{ "product_id": 1, "quantity": 2 }] }`
  - Creates orders for the authenticated user

- `GET /orders/my-orders/`
  - Returns authenticated user orders

- `GET /orders/shop-orders/?shop_id=<shop_id>`
  - Returns orders for a shop

- `POST /orders/accept/`
  - Request: `{ "order_id": 1 }`
  - Marks order as accepted

- `POST /orders/reject/`
  - Request: `{ "order_id": 1 }`
  - Marks order as rejected

## Recommendations

- `GET /recommend/<user_id>/`
  - Returns personalized recommendations for a user

- `GET /trending/`
  - Returns trending products

## Notes

- JWT tokens are required for authenticated endpoints.
- Use `Authorization: Bearer <access_token>` header for protected routes.
