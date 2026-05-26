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
    authController.js
    cartController.js
    categoryController.js
    designController.js
    draftController.js
    orderController.js
    productController.js
  db/
    pool.js
    init.js
  middleware/
    adminAuth.js
    errorHandler.js
    userAuth.js
  routes/
    adminRoutes.js
    authRoutes.js
    cartRoutes.js
    categoryRoutes.js
    designRoutes.js
    draftRoutes.js
    orderRoutes.js
    productRoutes.js
  services/
    cloudinaryService.js
    emailService.js
  utils/
    auth.js
    sizeParser.js
    sideParser.js
    userProfile.js
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
- keyword search slug changes
- side configuration changes
- gallery replacement
- side mockup replacement
- visual printable area update persistence

## User Commerce Domain

Added production ecommerce user flows:

- `authController.js`
  - register/login/forgot-password
  - profile read/update
  - password update
- `cartController.js`
  - database cart item CRUD
  - guest cart merge endpoint
- `draftController.js`
  - user draft list/get/upsert/delete by product
- `orderController.js`
  - authenticated order creation (`orders` + `order_items`)
  - user order tracking API
  - admin order list/stats/status update APIs
  - legacy `/order` kept for backward compatibility

## Feature To File Map

- Product CRUD + side/gallery validation: `controllers/productController.js`
- Category CRUD + side/size rules: `controllers/categoryController.js`
- Design upload endpoint: `controllers/designController.js`
- User auth + profile: `controllers/authController.js`
- User cart persistence + merge: `controllers/cartController.js`
- User draft persistence: `controllers/draftController.js`
- Order lifecycle + admin order APIs: `controllers/orderController.js`
- Cloudinary upload + HEIC conversion: `services/cloudinaryService.js`
- SMTP transport + admin/customer order email templates: `services/emailService.js`
- User JWT/password helpers: `utils/auth.js`
- User profile mapper: `utils/userProfile.js`
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
- User-protected routes use JWT middleware (`requireUser`).
