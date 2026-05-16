# Admin Workflow Documentation

## Main UI Files

- `admin-frontend/src/pages/AdminDashboardPage.jsx`
- `admin-frontend/src/components/PrintableAreaSelector.jsx`
- `admin-frontend/src/components/AdminSidebar.jsx`
- `admin-frontend/src/components/AdminTopbar.jsx`

## Product Create Workflow

1. Choose category.
2. Pick sizes (if category supports sizes).
3. Select enabled customization sides.
4. Upload side mockup image for each enabled side.
5. Visually drag/resize printable area per side.
6. Upload customer gallery images.
7. Submit product.

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

