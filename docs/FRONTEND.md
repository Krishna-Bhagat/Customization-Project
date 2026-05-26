# Frontend Documentation (Unified Customer + Admin App)

## Folder Map

```text
frontend/src/
  admin/
    AdminRoutes.jsx
    api/
      client.js
      index.js
    components/
      AdminSidebar.jsx
      AdminTopbar.jsx
      PrintableAreaSelector.jsx
      ProtectedRoute.jsx
      ...
    constants/
      productMeta.js
    context/
      AdminAuthContext.jsx
    pages/
      AdminLoginPage.jsx
      AdminDashboardPage.jsx
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
- `/cart` -> persistent cart (guest/user-aware).
- `/checkout` -> login-gated checkout with profile address snapshot.
- `/orders` -> customer order tracking.
- `/profile` -> customer profile and address management.
- `/customize/:id/checkout` -> legacy review route retained for compatibility.
- `/admin/login` -> admin login.
- `/admin` -> protected admin dashboard.

## Deployment Routing

This app is a client-side routed SPA. Production hosting must rewrite all routes to `index.html`.

- Rewrite file: `frontend/vercel.json`
- Admin access path: `/admin` (share this exact URL with admins and ask them to bookmark it)

If rewrites are missing, route refresh/direct open can fail for non-root URLs.

## Component Hierarchy (Product Flow)

```text
ProductDetailPage
  -> ProductImageCarousel
  -> PrintLocationSheet

CustomizerWorkspacePage
  -> FabricDesigner
  -> ProductOptionsSheet

CartPage
  -> cart item list
  -> order summary + checkout gate

CheckoutPage
  -> delivery snapshot from profile
  -> cart summary
  -> place order
  -> post-order download prompt + final cleanup
```

## Where To Edit Specific UI

- Navbar and global shell: `src/App.jsx`, `src/components/Navbar.jsx`
- Home hero/category sections: `src/pages/HomePage.jsx`, `src/components/HomeHero.jsx`, `src/components/FeaturedCategoryCarousel.jsx`
- Product cards/listing behavior: `src/components/ProductCard.jsx`, `src/pages/ProductsPage.jsx`
- Product details layout: `src/pages/ProductDetailPage.jsx`
- Customizer canvas + controls: `src/components/FabricDesigner.jsx`
- Cart + checkout flow: `src/pages/CartPage.jsx`, `src/pages/CheckoutPage.jsx`
- User account pages: `src/pages/ProfilePage.jsx`, `src/pages/MyOrdersPage.jsx`
- Auth modal and flows: `src/components/AuthModal.jsx`
- User/cart state: `src/context/UserAuthContext.jsx`, `src/context/CartContext.jsx`
- Footer and bottom nav visibility: `src/App.jsx`, `src/components/SiteFooter.jsx`, `src/components/MobileBottomNav.jsx`
- Admin route shell: `src/admin/AdminRoutes.jsx`, `src/App.jsx`
- Admin auth/session: `src/admin/context/AdminAuthContext.jsx`, `src/admin/components/ProtectedRoute.jsx`
- Admin dashboard UI/workflow: `src/admin/pages/AdminDashboardPage.jsx`

## Local Draft System

- Keyed by product ID in local storage with 30-day expiry.
- Utility: `src/utils/customizationSession.js`.
- Persisted fields include:
  - selected size
  - quantity
  - selected sides
  - active side
  - `canvasStates`
  - `designExports`
- Logged-in users can sync/import drafts to server (`drafts` table).
- Draft is cleared after successful order completion (`Finish` action in checkout prompt).

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

## Troubleshooting Reload/Flicker

- In development, React `StrictMode` can double-run mounts/effects and look like reload behavior.
- To keep behavior predictable, `StrictMode` is intentionally not used in:
  - `frontend/src/main.jsx`
