# Custom Clothing Ecommerce + Customizer Platform

Production-ready full-stack platform for personalized clothing/accessories with:

- Customer storefront and mobile-first customization flow
- Admin dashboard for category/product management
- Side-specific customization mockups and visual printable-area editor
- Fabric.js design engine with local drafts, side state persistence, and export/download flow

## Tech Stack

- Frontend (single app): React + Tailwind + Fabric.js + Framer Motion
- Backend: Node.js + Express
- Database: PostgreSQL (Supabase-compatible)
- Asset storage: Cloudinary
- Notifications: SMTP via Nodemailer

## Monorepo Layout

```text
Customization Project/
  backend/
    src/
      config/
      constants/
      controllers/
      db/
      middleware/
      routes/
      services/
      utils/
  frontend/
    src/
      admin/
        api/
        components/
        constants/
        context/
        pages/
      api/
      components/
      constants/
      pages/
      styles/
      utils/
  docs/
    ARCHITECTURE.md
    FRONTEND.md
    BACKEND.md
    API.md
    DATABASE.md
    CUSTOMIZER_ENGINE.md
    ADMIN_WORKFLOW.md
```

## Core Features

- Premium storefront with category sections, product detail, and product flow pages
- Entire product/category cards clickable for mobile-first UX
- User account system (phone + password, optional email)
- Forgot password flow (phone/email based reset without OTP)
- Profile page with editable default address/email/password
- Persistent cart:
  - guest cart in local storage (30 days)
  - user cart in PostgreSQL
  - automatic guest-to-user cart merge on login
- Persistent draft system:
  - guest drafts in local storage (30 days)
  - user drafts in PostgreSQL
  - draft import prompt after login
- Multi-step customization flow:
  - Product detail
  - Print side selection
  - Customizer workspace
  - Cart + Checkout
- Fabric.js customizer:
  - Text/image add, drag, rotate, scale
  - Side-specific canvas state
  - Printable area clipping + movement constraints
  - Snap-to-center guides
  - Draft save (local + server for logged-in users)
- Design download:
  - Side-wise downloadable PNG previews with mockup + design overlay
- Ecommerce order flow:
  - login-gated checkout
  - address snapshot from user profile
  - design uploads to Cloudinary
  - order + order_items persistence in PostgreSQL
  - admin email notification
  - optional customer confirmation email
  - post-order download prompt before final cleanup
- Order tracking:
  - customer "My Orders" page with status tracker
  - admin order management with range filters, search, and status actions
- Admin dashboard:
  - Product create/edit/delete
  - Optional product search slug tags (for cross-category keyword search)
  - Category create/edit/delete
  - Configurable sides and sizes per category
  - Separate customer gallery images vs customization mockup images
  - Visual printable area editor (drag/resize + zoom)

## Quick Start

1. Copy env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Start backend:

```bash
cd backend
npm install
npm run dev
```

3. Start frontend:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:

- Backend: `http://localhost:5000`
- Frontend app: `http://localhost:5173`
- Admin dashboard route: `http://localhost:5173/admin` (manual URL entry)

## Documentation Index

- System architecture: `docs/ARCHITECTURE.md`
- Customer frontend structure and edit map: `docs/FRONTEND.md`
- Backend structure and service layers: `docs/BACKEND.md`
- API contracts and payloads: `docs/API.md`
- PostgreSQL schema and migration behavior: `docs/DATABASE.md`
- Fabric.js customization engine deep dive: `docs/CUSTOMIZER_ENGINE.md`
- Admin workflow and product/category management: `docs/ADMIN_WORKFLOW.md`

## Deployment Targets

- Frontend (customer + admin): Vercel
- Backend: Render
- PostgreSQL: Supabase

## Post-Deployment Checklist

- Verify customer pages load from root URL.
- Verify admin login loads at `https://your-domain.com/admin`.
- Ask admin team to bookmark `https://your-domain.com/admin` for direct access.

## SPA Routing (Important)

Frontend is a React SPA and requires route rewrites in production to prevent refresh/login route breaks.

- Rewrite config:
  - `frontend/vercel.json`

Each file rewrites all paths to `index.html`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Without this, direct visits or refresh on routes like `/product/:id`, `/customize/:id/workspace`, or `/admin/login` can fail.

## Production Notes

- No AI image generation is included.
- Category/product schema bootstrapping runs automatically on backend startup.
- Product pricing UI is shown in `NPR`.
- Configure backend `FRONTEND_URL` with your frontend origin.

## Troubleshooting

- React app appears to "reload" or flicker in dev:
  - `React.StrictMode` was intentionally removed from:
    - `frontend/src/main.jsx`
  - This avoids double-mount behavior in React dev mode that can look like reloads.
