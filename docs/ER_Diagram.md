# DigiBazar ER Diagram

This document describes the key entities and relationships in the DigiBazar backend data model.

## Entities

- `User`
- `UserProfile`
- `ShopOwner`
- `Category`
- `Product`
- `Shop`
- `Order`
- `OrderItem`

## Relationships

- `User` has one `UserProfile`
- `User` has one `ShopOwner` (for sellers)
- `Category` has many `Products`
- `Category` has many `Shops`
- `Shop` has many `Products`
- `Shop` has many `Orders`
- `Order` belongs to one `User`
- `Order` belongs to one `Shop`
- `Order` has many `OrderItems`
- `OrderItem` belongs to one `Product`

## Diagram Notes

- Shop owners are represented separately from regular customers.
- Products can be displayed across categories and shops.
- Orders capture marketplace transactions and snapshot pricing in `OrderItem.price_at_order`.

## Relationship Summary

- `User` → `UserProfile` (1:1)
- `User` → `ShopOwner` (1:1)
- `Category` → `Product` (1:N)
- `Category` → `Shop` (1:N)
- `Shop` → `Product` (1:N)
- `Shop` → `Order` (1:N)
- `Order` → `OrderItem` (1:N)
- `OrderItem` → `Product` (N:1)
