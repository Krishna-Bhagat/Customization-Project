# Architecture Overview

## System Context

```text
Customer Browser
  -> frontend (React + Fabric.js)
  -> backend API (Express)
  -> Cloudinary (design + product image assets)
  -> local storage (guest cart + guest drafts)

Admin Browser
  -> frontend `/admin` route namespace (React)
  -> backend API (Express, JWT admin middleware)
  -> Cloudinary (gallery/mockup uploads)

Backend
  -> PostgreSQL (Supabase-hosted)
  -> SMTP provider (order notifications)
```

## High-Level Modules

- `frontend`: unified app with customer storefront plus `/admin` route namespace for admin login/dashboard.
- `backend`: centralized API, validation, category rules, image upload abstraction, order email dispatch.
- `auth/cart/drafts/orders`: backend commerce modules for persistent user workflows.

## Request Flow (Customer Customization -> Checkout)

1. Customer opens product detail page (`/product/:id`).
2. Customer chooses print sides and enters workspace (`/customize/:id/workspace`).
3. Fabric canvas stores side-wise state in local draft and (for logged-in users) server draft.
4. Customer adds configured design to cart.
5. Guest users are prompted to login when entering checkout.
6. Checkout submits authenticated order using profile address snapshot.
7. Backend uploads design images to Cloudinary and persists `orders` + `order_items`.
8. Backend sends admin email and optional customer confirmation email.

## Request Flow (Admin Product Lifecycle)

1. Admin visits `/admin/login`, logs in, and receives JWT token.
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

## Request Flow (Order Operations)

1. Admin opens `/admin` and goes to the Orders section.
2. Frontend calls:
   - `GET /admin/orders/stats`
   - `GET /admin/orders?range=...&search=...`
3. Admin updates lifecycle using `PATCH /admin/orders/:id/status`.
4. Customer tracking page (`/orders`) reads `/orders/my` and reflects status updates.

## State Ownership

- Backend is source of truth for:
  - products
  - categories
  - side mockups + printable coordinates
  - users, addresses, carts, drafts, orders
- Frontend local storage is source of truth for guest cart + guest drafts (30-day TTL).
- Cloudinary is source of truth for uploaded image assets.

## Scalability Notes

- Product-side model is normalized (`products` + `product_sides`) for future side expansion.
- Category-driven side/size configuration keeps future product types extensible.
- Backend upload pipeline is centralized in `cloudinaryService`.
- UI is unified in one SPA with route-level separation (`/` customer, `/admin` admin).
