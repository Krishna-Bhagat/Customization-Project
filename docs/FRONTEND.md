# Frontend Documentation (Customer App)

## Folder Map

```text
frontend/src/
  api/
    client.js
    index.js
  components/
    FabricDesigner.jsx
    ProductCard.jsx
    ProductImageCarousel.jsx
    PrintLocationSheet.jsx
    StepProgress.jsx
    ...
  constants/
    customizer.js
  pages/
    HomePage.jsx
    ProductsPage.jsx
    ProductDetailPage.jsx
    CustomizerWorkspacePage.jsx
    ReviewCheckoutPage.jsx
  utils/
    customizationSession.js
    productSides.js
    designDownload.js
```

## Route Map

- `/` -> home and featured categories.
- `/products` -> catalog listing with category/search filters.
- `/product/:id` -> product detail + side selection entry.
- `/customize/:id/workspace` -> Fabric editor flow.
- `/customize/:id/checkout` -> review + checkout + design download/finish.

## Component Hierarchy (Product Flow)

```text
ProductDetailPage
  -> ProductImageCarousel
  -> PrintLocationSheet

CustomizerWorkspacePage
  -> FabricDesigner
  -> ProductOptionsSheet

ReviewCheckoutPage
  -> StepProgress
  -> Side preview cards
  -> Order form
  -> Post-order download prompt
```

## Where To Edit Specific UI

- Navbar and global shell: `src/App.jsx`, `src/components/Navbar.jsx`
- Home hero/category sections: `src/pages/HomePage.jsx`, `src/components/HomeHero.jsx`, `src/components/FeaturedCategoryCarousel.jsx`
- Product cards/listing behavior: `src/components/ProductCard.jsx`, `src/pages/ProductsPage.jsx`
- Product details layout: `src/pages/ProductDetailPage.jsx`
- Customizer canvas + controls: `src/components/FabricDesigner.jsx`
- Checkout/review experience: `src/pages/ReviewCheckoutPage.jsx`
- Footer and bottom nav visibility: `src/App.jsx`, `src/components/SiteFooter.jsx`, `src/components/MobileBottomNav.jsx`

## Local Draft System

- Keyed by product ID using `sessionStorage`.
- Utility: `src/utils/customizationSession.js`.
- Persisted fields include:
  - selected size
  - quantity
  - selected sides
  - active side
  - `canvasStates`
  - `designExports`
- Draft cleared after successful order completion (`Finish` action in checkout prompt).

## Design Download System

- Utility: `src/utils/designDownload.js`
- `composeMockupPreview` composes:
  - product mockup image
  - exported design overlay
  - printable area coordinates
- High quality multiplier used for PNG export.
- Download actions available on checkout preview cards and post-order prompt.

## Adding New UI Features Safely

1. Put API calls under `src/api/index.js`.
2. Keep page-level data loading in `pages/*`.
3. Move reusable display/control units to `components/*`.
4. Keep mapping/normalization helpers in `utils/*` and `constants/*`.
5. Preserve per-product draft key strategy to avoid session leakage.

