# Admin Workflow Documentation

## Main UI Files

- `frontend/src/admin/pages/AdminDashboardPage.jsx`
- `frontend/src/admin/components/PrintableAreaSelector.jsx`
- `frontend/src/admin/components/AdminSidebar.jsx`
- `frontend/src/admin/components/AdminTopbar.jsx`

## Order Management Workflow

Orders are managed from the `Orders` sidebar section in `AdminDashboardPage`.

Capabilities:

- dashboard cards:
  - orders today
  - orders this week
  - pending orders
  - total products
- filters:
  - today / this week / this month / all
- search by:
  - order number
  - customer name
  - customer phone
- status actions:
  - pending -> confirm
  - confirmed -> dispatch
  - dispatched -> mark delivered

Backend endpoints used:

- `GET /admin/orders/stats`
- `GET /admin/orders`
- `PATCH /admin/orders/:id/status`

## Product Create Workflow

1. Choose category.
2. Pick sizes (if category supports sizes).
3. Select enabled customization sides.
4. Add optional search slugs (keywords like `krishna-tee`) for storefront search.
5. Upload side mockup image for each enabled side.
6. Visually drag/resize printable area per side.
7. Upload customer gallery images.
8. Submit product.

## Product Edit Workflow

- Triggered from product list card `Edit` action.
- Form is prefilled with:
  - name/description/price/category
  - available sizes
  - enabled sides
  - existing side mockups + printable area
  - existing gallery images
- Admin can:
  - replace any side mockup image
  - adjust printable area visually
  - replace gallery images
  - update metadata/sizes/sides

## Visual Printable Area Editor

- Component: `PrintableAreaSelector`
- Features:
  - drag printable rectangle
  - corner resize handles
  - automatic coordinate update (`x/y/width/height`)
  - zoom slider for precision
- Coordinates are never manually typed in admin flow.

## Category Settings Workflow

Category configuration controls product behavior:

- `supportsSizes`
- `allowedSizes`
- `customizationSides`

When category config changes, backend enforces consistency for:

- product available sizes
- allowed side keys
- side rows in `product_sides`

## How To Add New Product Types

1. Create category in admin settings.
2. Configure:
   - whether sizes are enabled
   - size options
   - customization sides
3. Add products under that category with side mockups and printable areas.

## How To Add New Sides

1. Add side label in category settings.
2. Provide mockup + printable area when creating/editing products.
3. Optional: add frontend display alias in:
   - `frontend/src/constants/customizer.js`
   - `frontend/src/utils/productSides.js`
4. Optional: add backend printable preset in `backend/src/constants/productMeta.js`.
