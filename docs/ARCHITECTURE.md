# Architecture Overview

## System Context

```text
Customer Browser
  -> frontend (React + Fabric.js)
  -> backend API (Express)
  -> Cloudinary (design + product image assets)

Admin Browser
  -> admin-frontend (React)
  -> backend API (Express, JWT admin middleware)
  -> Cloudinary (gallery/mockup uploads)

Backend
  -> PostgreSQL (Supabase-hosted)
  -> SMTP provider (order notifications)
```

## High-Level Modules

- `frontend`: customer storefront, product flow, customizer, checkout, local draft lifecycle.
- `admin-frontend`: admin login, product/category settings, visual printable area editor.
- `backend`: centralized API, validation, category rules, image upload abstraction, order email dispatch.

## Request Flow (Product Customization)

1. Customer opens product detail page (`/product/:id`).
2. Customer chooses print sides and enters workspace (`/customize/:id/workspace`).
3. Fabric canvas stores side-wise state in session storage.
4. Checkout page reads draft state, previews designs, submits order.
5. Backend uploads design images to Cloudinary.
6. Backend sends admin email with customer info and design URLs.

## Request Flow (Admin Product Lifecycle)

1. Admin logs in and receives JWT token.
2. Admin creates or edits product from dashboard:
   - select category
   - set sizes/sides
   - upload customer gallery images
   - upload side mockups
   - visually configure printable areas
3. Admin form sends multipart payload to backend.
4. Backend validates against category configuration and persists:
   - `products`
   - `product_sides`
5. Storefront reads product data from `GET /products`.

## State Ownership

- Backend is source of truth for:
  - products
  - categories
  - side mockups + printable coordinates
  - order dispatch
- Frontend session storage is source of truth for in-progress customization drafts.
- Cloudinary is source of truth for uploaded image assets.

## Scalability Notes

- Product-side model is normalized (`products` + `product_sides`) for future side expansion.
- Category-driven side/size configuration keeps future product types extensible.
- Backend upload pipeline is centralized in `cloudinaryService`.
- UI is split into customer/admin apps for deployment and scaling independence.

