# API Documentation

Base URL examples:

- Local: `http://localhost:5000`
- Production: Render backend URL

## Health

- `GET /health`
  - response: `{ status: "ok" }`

## Admin Auth

- `POST /admin/login`
  - body: `{ username, password }`
  - response: `{ token }`

## Products

- `GET /products`
  - query: `search`, `category`, `size`
  - returns product list with:
    - `galleryImages`
    - `imageUrls`
    - `searchSlugs`
    - `availableSizes`
    - `sides[]` with `printableArea`

- `POST /products` (admin, multipart/form-data)
  - required fields:
    - `name`
    - `price`
    - `category`
    - `enabledSides` (JSON array)
    - `availableSizes` (JSON array when category supports sizes)
    - `searchSlugs` (JSON array, optional)
    - `sideConfigs` (JSON object keyed by side key)
    - `galleryImages` (1+ files)
    - `sideMockup_<sideKey>` for each enabled side

- `PUT /products/:id` (admin, multipart/form-data)
  - supports updating:
    - `name`
    - `description`
    - `price`
    - `category`
    - `enabledSides`
    - `availableSizes`
    - `searchSlugs`
    - `sideConfigs`
  - optional uploads:
    - `galleryImages` to replace existing gallery
    - `sideMockup_<sideKey>` to replace specific side mockups

- `DELETE /products/:id` (admin)

## Categories

- `GET /categories`
- `POST /categories` (admin)
- `PUT /categories/:id` (admin)
- `DELETE /categories/:id` (admin)
- `GET /sizes`

Category payload fields:

- `name`
- `supportsSizes`
- `allowedSizes`
- `customizationSides`

## Design Upload

- `POST /upload-design`
  - body:
    - preferred: `{ designs: { front: dataUrl, back: dataUrl, ... } }`
    - legacy fields still accepted (`frontDesign`, `backDesign`, etc.)
  - response:
    - `designUrls` object keyed by side key

## User Auth + Profile

- `POST /auth/register`
  - required:
    - `fullName`, `phone`, `password`
    - `province`, `district`, `municipalityCity`, `wardNumber`, `streetTole`
  - optional:
    - `email`
  - response:
    - `{ token, user }`

- `POST /auth/login`
  - body: `{ phone, password }`
  - response:
    - `{ token, user }`

- `POST /auth/forgot-password`
  - body: `{ phoneOrEmail, newPassword }`

- `GET /auth/me` (user token)
- `PUT /auth/profile` (user token)
- `PUT /auth/password` (user token)

## Cart (User Token Required)

- `GET /cart/items`
- `POST /cart/items`
  - body includes:
    - `productId`, `selectedSize`, `quantity`, `selectedSides`
    - `customizationState`
    - `previewImage`
    - `unitPrice`
    - `productSnapshot` (optional)
- `PUT /cart/items/:id`
- `DELETE /cart/items/:id`
- `DELETE /cart/items`
- `POST /cart/merge`
  - body:
    - `{ items: [...] }` guest cart payload

## Drafts (User Token Required)

- `GET /drafts`
- `GET /drafts/:productId`
- `PUT /drafts/:productId`
- `DELETE /drafts/:productId`

Draft payload fields:

- `selectedSize`
- `quantity`
- `selectedSides`
- `activeSide`
- `canvasStates`
- `designExports`
- `previewImage`
- `savedAt`

## Orders

- `POST /orders` (user token)
  - body:
    - `addressSnapshot`
    - `items[]`:
      - `productId`
      - `quantity`
      - `selectedSize`
      - `selectedSides`
      - `customizationData`
      - `designUrls` (optional if `customizationData.designExports` provided)
  - behavior:
    - validates products
    - stores `orders` + `order_items`
    - sends admin email
    - sends customer confirmation email if user email exists

- `GET /orders/my` (user token)
  - returns authenticated user orders with items and status.

## Admin Orders (Admin Token Required)

- `GET /admin/orders`
  - query:
    - `range` in `today | week | month | all`
    - `search` (order number/customer name/phone)
- `GET /admin/orders/stats`
  - returns:
    - `ordersToday`
    - `ordersThisWeek`
    - `pendingOrders`
- `PATCH /admin/orders/:id/status`
  - body:
    - `{ status }` where transitions are:
      - `pending -> confirmed -> dispatched -> delivered`

## Legacy Endpoint

- `POST /order`
  - legacy non-account flow kept for backward compatibility.
