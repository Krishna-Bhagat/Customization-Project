# Custom Clothing Ecommerce + Customizer Platform

Production-ready full-stack platform for personalized clothing/accessories with:

- Customer storefront and mobile-first customization flow
- Admin dashboard for category/product management
- Side-specific customization mockups and visual printable-area editor
- Fabric.js design engine with local drafts, side state persistence, and export/download flow

## Tech Stack

- Frontend (customer): React + Tailwind + Fabric.js + Framer Motion
- Frontend (admin): React + Tailwind
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
      api/
      components/
      constants/
      pages/
      styles/
      utils/
  admin-frontend/
    src/
      api/
      components/
      constants/
      context/
      pages/
      styles/
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
- Multi-step customization flow:
  - Product detail
  - Print location selection
  - Customizer workspace
  - Review and checkout
- Fabric.js customizer:
  - Text/image add, drag, rotate, scale
  - Side-specific canvas state
  - Printable area clipping + movement constraints
  - Snap-to-center guides
  - Draft save in session storage
- Design download:
  - Side-wise downloadable PNG previews with mockup + design overlay
- Order flow:
  - Upload design images to Cloudinary
  - Send order email with customer details and design URLs
  - Post-order prompt to download design before finishing
  - Draft cleanup on finish
- Admin dashboard:
  - Product create/edit/delete
  - Category create/edit/delete
  - Configurable sides and sizes per category
  - Separate customer gallery images vs customization mockup images
  - Visual printable area editor (drag/resize + zoom)

## Quick Start

1. Copy env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin-frontend/.env.example admin-frontend/.env
```

2. Start backend:

```bash
cd backend
npm install
npm run dev
```

3. Start customer frontend:

```bash
cd frontend
npm install
npm run dev
```

4. Start admin frontend:

```bash
cd admin-frontend
npm install
npm run dev
```

Default local URLs:

- Backend: `http://localhost:5000`
- Customer frontend: `http://localhost:5173`
- Admin frontend: `http://localhost:5174` (next available Vite port)

## Documentation Index

- System architecture: `docs/ARCHITECTURE.md`
- Customer frontend structure and edit map: `docs/FRONTEND.md`
- Backend structure and service layers: `docs/BACKEND.md`
- API contracts and payloads: `docs/API.md`
- PostgreSQL schema and migration behavior: `docs/DATABASE.md`
- Fabric.js customization engine deep dive: `docs/CUSTOMIZER_ENGINE.md`
- Admin workflow and product/category management: `docs/ADMIN_WORKFLOW.md`

## Deployment Targets

- Frontend/customer: Vercel
- Frontend/admin: Vercel (separate project/domain)
- Backend: Render
- PostgreSQL: Supabase

## Production Notes

- No AI image generation is included.
- No end-user authentication is included.
- Category/product schema bootstrapping runs automatically on backend startup.
- Configure backend `FRONTEND_URL` with both customer and admin origins (comma-separated).
