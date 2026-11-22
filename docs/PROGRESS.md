# Progress

## Current sprint
Sprint 0: Design sprint and foundation. Status: done.

## Done
- **Monorepo Structure**: Set up `/client` (Vite, React 18, Tailwind CSS, Lucide icons) and `/server` (Node 20, Express, Mongoose, Zod, Helmet, Rate-limit, Jest/Supertest).
- **Environment & Code Quality**: Added root `.gitignore`, `.prettierrc`, root `package.json` workspaces, `.env.example` templates, ESLint configs (0 errors, 0 warnings across both workspaces).
- **Server Foundation**:
  - Express app configured with `helmet`, `cors` (credentials support & origin validation), `cookie-parser`, JSON payload limit (`1mb`), and `express-rate-limit`.
  - Mongoose connection module with connection lifecycle events and graceful disconnect.
  - Typed error classes in `server/src/errors/`: `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, and `ConflictError`.
  - Central error handling middleware adhering strictly to standard response envelope: `{ success: false, error: { code, message, fields? } }`.
  - Health check endpoint `GET /api/health` returning `{ success: true, data: { status, timestamp, uptime, database } }`.
  - Complete Supertest suite in `server/tests/health.test.js` covering 200 health check, 404 route not found envelope, malformed JSON handling, and all typed AppError classes with expected HTTP codes and payloads (100% passing).
  - Postman collection for Sprint 0 saved to `docs/postman/Roam_Sprint_0.postman_collection.json`.
- **Client Design System & Tokens**:
  - Imported Google Font **Urbanist** (weights 300, 400, 500, 600, 700).
  - Full CSS variable tokens mapped for Light and Dark themes per UI spec sections 2.2 and 13 (`--bg`, `--bg-subtle`, `--surface`, `--tile`, `--border`, `--text`, `--text-muted`, `--text-faint`, `--primary`, `--on-primary`, `--accent`, `--on-accent`, `--star`, `--dark-band-bg`, `--dark-band-text`, `--success`, `--warning`, `--danger`).
  - Mapped tokens directly into Tailwind configuration classes (`bg-surface`, `bg-tile`, `text-muted`, `border-border`, etc.).
  - Zero hard-coded colors in all components.
  - Universal accessible focus ring: `2px --text with 2px offset`.
  - Theme system implemented per UI Section 2.1:
    - Inline no-flash script in `index.html` executing before first paint.
    - Theme persistence in `localStorage: theme = light | dark | system`.
    - `prefers-color-scheme` listener for `system` preference.
    - `prefers-reduced-motion` support.
    - Theme toggle component: 56 × 32 px pill, 24px sliding circular thumb (200ms ease-out), sun/moon icons, `role="switch"`, `aria-checked`, `aria-label="Toggle dark mode"`.
- **UI Component Library (UI Section 7)**:
  - `Button`: pill-shaped, variants (`primary`, `secondary`, `ghost`, `onDark`, `destructive`, `text`, `more`), sizes (`lg` 44px, `sm` 36px).
  - `Input`: pill input (44px), 1px border, 16px padding, 12px faint placeholder, 2px focus ring, 11px muted label, 11px danger error.
  - `Select` & `Textarea`: 16px radius, 1px border, 2px focus ring.
  - `Chip`: 24px high pill on `--tile`.
  - `StatusChip`: 12% tinted background + solid text + semantic icon for all 8 statuses (`Available`, `Pending`, `Negotiating`, `Accepted`, `Rejected`, `Booked`, `Returned`, `Expired`).
  - `Badge`: accent discount badge (`-8% off`, 6px radius) and count/dot badges.
  - `Tabs`: 48px height, 1px baseline border, sliding 2px underline (250ms), superscript count support.
  - `Skeleton`: vehicle cut-out tile skeleton and card skeletons.
  - `EmptyState`: vehicle cut-out illustration on 24px tile, 24px/300 heading, muted body, pill CTA.
  - `Modal`: 24px radius, backdrop blur, keyboard escape handler, focus trapping.
  - `Toast`: accessible notification toasts with auto-dismiss and semantic variants.
  - `AnnouncementBar` (UI 7.1): full-width, 30px height, `--accent` background, 11px white text, divider, inline link, dismiss button.
  - `Header` (UI 7.2): sticky 64px header, blur (12px) and 1px bottom border after 8px scroll, circular logo mark + "Roam" wordmark, center links, right cluster (Theme toggle, language switch, outlined pill), mobile drawer.
  - `Footer` (UI 7.14): dark band, logo + "Request a call back" pill, 4 link columns + location tabs, giant cropped "Roam" wordmark (24vw) filling container width, bottom copyright bar.
- **Design System Showcase Page**:
  - Live `/design-system` route showcasing every token, component, interactive state, and responsive viewport simulators for 375px (Mobile), 768px (Tablet), and 1280px (Desktop).

## Deferred
- None from Sprint 0 scope. (Feature pages and workflows deliberately deferred to Sprint 1+ as specified).

## Decisions made
- Rollup Wasm Fallback: Enabled `@rollup/wasm-node` fallback in npm overrides to ensure seamless Vite development and bundling across environments where native Windows MSVC `.node` binary execution might encounter restrictive host policies.
- Status Chips: Provided 12% opacity color backgrounds paired with full-contrast solid text and unique icons (`CheckCircle2`, `Clock`, `MessageSquare`, `Check`, `XCircle`, `Calendar`, `RotateCcw`, `AlertTriangle`) ensuring WCAG accessibility compliance where color is never the only indicator.

## Open questions
- None blocking Sprint 1.

## How to run
- **Server**:
  ```bash
  cd server
  npm test       # Run Supertest test suite
  npm run dev    # Start API server on http://localhost:5000
  ```
- **Client**:
  ```bash
  cd client
  npm run build  # Verify production bundle build
  npm run dev    # Start Vite dev server on http://localhost:5173
  ```
- **Postman**:
  Import `docs/postman/Roam_Sprint_0.postman_collection.json` into Postman and point `{{baseUrl}}` to `http://localhost:5000`.
