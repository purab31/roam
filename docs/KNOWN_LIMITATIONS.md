# Roam — Known Limitations & Technical Constraints

This document catalogs technical trade-offs, scope boundaries, third-party dependency advisories, and architecture limits for Roam. As an academic Web Technologies project (TY BTech), scope and effort have been kept proportionate while upholding strict security and data integrity.

---

## 1. Third-Party Dependency Vulnerabilities (`npm audit`)

Running `npm audit` flags the following advisories that cannot be resolved without breaking major version upgrades:

### High Vulnerabilities:
1. **`zod` (<4.6.6) — Server**
   - **Advisory**: [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — Zod can exhaust memory while validating oversized constrained collections.
   - **Impact on Roam**: Minimal. Express payload bodies are strictly capped at `1mb` (`express.json({ limit: '1mb' })`), preventing oversized attack payloads from reaching Zod validation schemas.
   - **Resolution Constraint**: Requires upgrading to `zod@4.x`, which introduces breaking changes to existing schema validators across all 18 route definitions.

2. **`vite` (<=6.4.3) — Client**
   - **Advisory**: [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) — `launch-editor` `fs.existsSync()` existence check bypass on Windows.
   - **Impact on Roam**: Development only. In production, Vite compiles the React application into static HTML/CSS/JS bundles served by Vercel or Netlify; `launch-editor` code is never included in the production runtime.
   - **Resolution Constraint**: Requires upgrading to `vite@8.x` and `esbuild@0.25+`, which introduces breaking plugin API changes.

### Moderate Vulnerabilities:
- `react-router` / `react-router-dom` (6.0 - 7.17.0): Open redirect advisory on backslash paths and SSR hydration constructor injection (Roam is a pure client-side SPA with no SSR).
- `minimatch` (via dev dependency `nodemon`): ReDoS in globparts amplification during local file watching.

---

## 2. Security & Session Architecture Limitations

### No CSRF Tokens
- **Current Defense**: Authentication tokens are stored in `httpOnly`, `SameSite=Lax` cookies (for same-origin proxy setups) and accept `Authorization: Bearer <token>` headers.
- **Limitation**: The application does not issue double-submit anti-CSRF tokens or synchronize synchronizer token patterns. For typical top-level GET/POST navigation, `SameSite=Lax` prevents cross-site request forgery in modern browsers, but explicit CSRF token verification is omitted to keep complexity appropriate for academic review.

### In-Memory Rate Limiting
- **Current Defense**: `express-rate-limit` is configured with `apiLimiter` (300 req/15m), `authLimiter` (20 req/15m), and `reportLimiter` (30 req/15m).
- **Limitation**: Rate counters are tracked in-process using Node.js MemoryStore. If the API is horizontally scaled across multiple cluster instances or restarted, counters are not synchronized across instances (a production deployment would back rate limiting with a shared Redis cache).

---

## 3. Storage & Document Handling

### Private Documents on Ephemeral Cloud Containers
- **Current Defense**: Vehicle registration certificates, dealer trade certificates, and identity documents are strictly excluded from public CDN buckets (`uploads/images`) and are streamed exclusively through authenticated, role-verified routes (`/api/vehicles/:id/documents/:docId/download`).
- **Limitation**: When deployed on free-tier container platforms with ephemeral filesystems (such as Render free tier), files saved to local disk do not persist across container spin-downs. In an enterprise system, private documents would be stored in private AWS S3 / Google Cloud Storage buckets and streamed via presigned URLs.

---

## 4. Communication & Live Services

### Out-of-Scope Infrastructure
Per the Project Specification and academic scope limits:
- **No Live Email / SMS Integration**: Third-party mailers (SendGrid, Mailgun, AWS SES, Twilio) are intentionally not configured. Password reset workflows use standard token generation with `LOG_RESET_LINKS=true` outputting the reset URL to host server logs.
- **No Online Payment Gateway**: Real money transactions, card processing, and escrow payments happen outside the platform; Roam records agreed amounts, security deposits, and handover states without processing live fiat currency.
- **No Real-Time WebSockets**: Notifications, offers, and chat use REST polling and TanStack Query cache invalidation rather than continuous WebSocket connections.

---

## 5. Free-Tier Cloud Hosting Constraints

### Free API Cold Starts & Sleeping Instances
- Free-tier API hosts (Render, Railway free) spin down containers after 15 minutes of inactivity.
- **Cold Start Delay**: The first incoming request after idle takes 30 to 60 seconds to boot the Node runtime and establish TLS connection to MongoDB Atlas.
- **Cron Catch-Up**: Because the container may be sleeping at midnight UTC when the daily expiry cron job triggers, an idempotent catch-up check (`checkListingExpiry()`) is executed on server startup to immediately process any expired listings upon container wake.
