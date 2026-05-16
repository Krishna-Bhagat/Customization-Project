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
    - `availableSizes`
    - `sides[]` with `printableArea`

- `POST /products` (admin, multipart/form-data)
  - required fields:
    - `name`
    - `price`
    - `category`
    - `enabledSides` (JSON array)
    - `availableSizes` (JSON array when category supports sizes)
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

## Order

- `POST /order`
  - body:
    - `name`, `phone`, `address`
    - `productId`, `productName`, `category`
    - `selectedSize`, `selectedSides`
    - `designUrls` (or legacy side fields)
  - behavior:
    - sends SMTP email to configured admin recipient

