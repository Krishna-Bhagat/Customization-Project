# Backend Documentation

## Folder Map

```text
backend/src/
  app.js
  server.js
  config/
    env.js
  constants/
    productMeta.js
  controllers/
    adminController.js
    categoryController.js
    designController.js
    orderController.js
    productController.js
  db/
    pool.js
    init.js
  middleware/
    adminAuth.js
    errorHandler.js
  routes/
    adminRoutes.js
    categoryRoutes.js
    designRoutes.js
    orderRoutes.js
    productRoutes.js
  services/
    cloudinaryService.js
    emailService.js
  utils/
    sizeParser.js
    sideParser.js
```

## Responsibilities

- Controllers:
  - request parsing
  - validation
  - domain orchestration
  - response mapping
- Services:
  - integrations (`cloudinary`, SMTP)
- Constants:
  - category defaults
  - printable area presets
  - side/size normalization metadata
- DB layer:
  - pooled PostgreSQL connections
  - startup migrations/bootstrapping

## Product Domain

`productController.js` manages:

- list products (`GET /products`)
- create product (`POST /products`)
- update product (`PUT /products/:id`)
- delete product (`DELETE /products/:id`)

Update flow supports:

- category/size changes
- side configuration changes
- gallery replacement
- side mockup replacement
- visual printable area update persistence

## Feature To File Map

- Product CRUD + side/gallery validation: `controllers/productController.js`
- Category CRUD + side/size rules: `controllers/categoryController.js`
- Design upload endpoint: `controllers/designController.js`
- Order email trigger: `controllers/orderController.js`
- Cloudinary upload + HEIC conversion: `services/cloudinaryService.js`
- SMTP transport + order email template: `services/emailService.js`
- Side/size parser helpers: `utils/sideParser.js`, `utils/sizeParser.js`
- Route registration: `routes/*.js`
- Startup schema + defaults: `db/init.js`

## Upload Strategy

`cloudinaryService.js`:

- supports standard image uploads and base64 design uploads.
- handles HEIC/HEIF conversion:
  - mockups -> PNG
  - gallery -> JPEG
- applies optimization for gallery assets.

## Category-Driven Validation

- Category defines:
  - `supports_sizes`
  - `allowed_sizes`
  - `customization_sides`
- Product create/update checks against category constraints.
- Side keys normalized with `toSideKey`.

## Error Handling

- Central error middleware in `middleware/errorHandler.js`.
- Validation errors return explicit `400` messages.
- Admin-protected routes use JWT middleware (`requireAdmin`).
