# Roam — Deployment Guide

This guide details the production deployment architecture and step-by-step instructions for Roam across cloud hosting providers.

---

## 1. Deployment Architecture

```mermaid
flowchart LR
    Browser["User Browser"] --> |"Same-Origin Requests"| Frontend["Vercel / Netlify (Frontend)"]
    Frontend --> |"Static SPA Assets"| Browser
    Frontend --> |"Proxy Rewrite /api/*"| API["Render / Railway (Express API)"]
    Frontend --> |"Proxy Rewrite /uploads/images/*"| API
    API --> |"Mongoose / TLS"| Atlas[("MongoDB Atlas")]
    API --> |"Optional Public Media"| Cloudinary[("Cloudinary CDN")]
```

### Primary Setup: Same-Origin Reverse Proxy
Modern web browsers (Safari ITP, Chrome Privacy Sandbox) enforce strict third-party cookie restrictions that reject `SameSite=None` cookies on cross-site subdomains or unpartitioned storage.

To guarantee seamless, zero-friction session cookie authentication:
1. **Frontend Host as Single Origin**: Vercel (`vercel.json`) or Netlify (`netlify.toml`) serves the React SPA and proxies all `/api/*` and `/uploads/images/*` requests to the hosted API backend.
2. **First-Party Cookies**: Because the browser communicates exclusively with the frontend domain, session cookies are treated as first-party (`SameSite=Lax`).
3. **No Cross-Origin Header Leaks**: Browser requests require no CORS preflights for same-origin proxy paths.

### Cross-Origin Fallback Setup
If deploying API and frontend on separate apex domains without a proxy rewrite:
- Set `COOKIE_SAMESITE=none` on the server.
- The server automatically enforces `secure: true` on the HTTP-only auth cookie.
- Ensure `CLIENT_ORIGIN` matches the exact frontend URL (including `https://`).

---

## 2. Environment Variables Reference

### Backend API (Render / Railway)

| Variable | Description | Example / Default | Required in Production |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` | **Yes** |
| `PORT` | API server listen port | `5000` (auto-assigned by host) | Host assigned |
| `MONGODB_URI` | MongoDB Atlas replica set connection string | `mongodb+srv://user:pass@cluster.mongodb.net/roam?retryWrites=true&w=majority` | **Yes** |
| `JWT_SECRET` | 64+ char cryptographic secret for signing JWTs | *(random 64-char hex string)* | **Yes** |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` | No |
| `CLIENT_ORIGIN` | Allowed CORS origin (frontend apex or proxy domain) | `https://roam-market.vercel.app` | **Yes** |
| `COOKIE_SAMESITE` | Auth cookie SameSite policy (`lax` for proxy, `none` for cross-site) | `lax` | No (defaults to `lax`) |
| `STORAGE_PROVIDER` | Media storage provider (`local` or `cloudinary`) | `local` | No (defaults to `local`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name (if using Cloudinary) | `roam-market` | Only if `STORAGE_PROVIDER=cloudinary` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` | Only if `STORAGE_PROVIDER=cloudinary` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | *(secret)* | Only if `STORAGE_PROVIDER=cloudinary` |
| `LOG_RESET_LINKS` | Log password reset tokens/links to stdout | `true` | Recommended for demo |
| `INIT_ADMIN` | Idempotently create platform admin account on startup | `true` | Recommended for first deploy |
| `ADMIN_EMAIL` | Initial admin account email | `admin@roam.local` | If `INIT_ADMIN=true` |
| `ADMIN_PASSWORD` | Initial admin account password (**no default in prod**) | *(strong password)* | **Yes** (if `INIT_ADMIN=true`) |
| `ALLOW_DEMO_SEED` | Allows running `npm run seed` in production | `true` | Only if seeding demo data |
| `SEED_PASSWORD` | Password for sample users (**no default in prod**) | *(demo password)* | Only if `ALLOW_DEMO_SEED=true` |

### Frontend Web (Vercel / Netlify)

| Variable | Description | Example / Default | Required |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base API URL if bypassing proxy (leave empty or set `/api` when proxied) | *(empty)* | Optional (defaults to relative `/api`) |

---

## 3. Step-by-Step Deployment Instructions

### Phase 1: Database Setup (MongoDB Atlas)
1. Sign up for a free MongoDB Atlas account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free **M0 Shared Cluster** (choose AWS or Google Cloud in your closest region).
3. Under **Security → Database Access**, add a database user with `readWriteAnyDatabase` privileges. Note down the password.
4. Under **Security → Network Access**, add IP address `0.0.0.0/0` (Allow access from anywhere) so cloud dynamic container IPs can connect.
5. Under **Deployment → Database → Connect**, choose **Drivers → Node.js** and copy the connection string.
6. Replace `<password>` with your database user password and specify the database name `roam`:
   ```text
   mongodb+srv://roam_user:<password>@cluster0.abcde.mongodb.net/roam?retryWrites=true&w=majority
   ```

---

### Phase 2: API Deployment (Render)
1. Sign up for a free account at [render.com](https://render.com).
2. Click **New + → Web Service** and link your Git repository.
3. Configure the service settings:
   - **Name**: `roam-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Plan**: `Free`
4. Add the Environment Variables:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = *(your Atlas connection string)*
   - `JWT_SECRET` = *(generate a secure random 64-character string)*
   - `CLIENT_ORIGIN` = `https://<your-frontend-subdomain>.vercel.app`
   - `COOKIE_SAMESITE` = `lax`
   - `LOG_RESET_LINKS` = `true`
   - `INIT_ADMIN` = `true`
   - `ADMIN_EMAIL` = `admin@roam.local`
   - `ADMIN_PASSWORD` = `AdminSecure2026!`
5. Click **Create Web Service** and wait for the deployment build to complete.
6. Note the public service URL: `https://roam-api.onrender.com`.

> [!NOTE] Free Tier Cold-Start Behavior
> Render free-tier instances sleep automatically after 15 minutes of inactivity. When a new request arrives, waking the container takes between 30 to 60 seconds. Roam includes an automatic catch-up check on startup (`checkListingExpiry()`) so any midnight expirations missed while the container was sleeping run immediately upon first wake.

---

### Phase 3: Frontend Deployment (Vercel)
1. Sign up for a free account at [vercel.com](https://vercel.com).
2. Click **Add New… → Project** and import the repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In `client/vercel.json`, ensure the proxy destination points to your live Render backend:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://roam-api.onrender.com/api/:path*" },
       { "source": "/uploads/images/:path*", "destination": "https://roam-api.onrender.com/uploads/images/:path*" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
5. Click **Deploy**. Vercel will build the frontend and provide your production URL: `https://roam-market.vercel.app`.

---

### Phase 4: Alternative Frontend Deployment (Netlify)
If deploying on Netlify instead of Vercel:
1. Sign up at [netlify.com](https://netlify.com) and click **Add new site → Import an existing project**.
2. Select repository, set **Base directory** to `client`, **Build command** to `npm run build`, and **Publish directory** to `dist`.
3. In `client/netlify.toml`, verify redirect rules:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://roam-api.onrender.com/api/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/uploads/images/*"
     to = "https://roam-api.onrender.com/uploads/images/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
4. Click **Deploy Site**.

---

## 4. Media & Cloud Storage (Cloudinary)

### What to Sign Up For
1. Sign up for a free Cloudinary account at [cloudinary.com](https://cloudinary.com).
2. Go to the **Cloudinary Console Dashboard** and locate:
   - **Cloud Name** (e.g., `roam-media`)
   - **API Key** (e.g., `837194628371928`)
   - **API Secret** (e.g., `aBcDeF-GhIjKlMnOpQrStUvWxYz`)
3. Set the following environment variables on your API host:
   ```bash
   STORAGE_PROVIDER=cloudinary
   CLOUDINARY_CLOUD_NAME=roam-media
   CLOUDINARY_API_KEY=837194628371928
   CLOUDINARY_API_SECRET=aBcDeF-GhIjKlMnOpQrStUvWxYz
   ```

### Important Privacy & Security Architecture
- **Public Vehicle Images & Dealership Logos**: Uploaded directly to Cloudinary and served over worldwide CDN.
- **Sensitive Private Verification Documents**: Verification documents (Vehicle Registration Certificates, Dealer Trade Certificates, Aadhaar/PAN identity cards) are **never uploaded to public Cloudinary buckets**. They are stored on private disk storage and streamed exclusively through authenticated, role-gated routes (`/api/vehicles/:id/documents/:docId/download` and `/api/dealers/:id/documents/:docId/download`).
- **Free-Tier Limitation**: On free container hosts with ephemeral filesystems (Render free tier), files saved to local disk reset when the container spins down. In an academic prototype, this limitation is accepted to ensure zero leakage of confidential student or sample identity documents to public cloud storage.

---

## 5. Operations & Password Reset in Demo Mode

Because external SMTP integration is out of scope for this academic prototype:
1. When a user requests a password reset (`POST /api/auth/forgot-password`), the server generates a cryptographically secure token and logs the reset link to standard output if `LOG_RESET_LINKS=true`.
2. The demo operator or evaluator opens the Render / Railway host logs, views the logged URL:
   ```text
   [Auth] Password reset link for rahul.sharma@roam.local: http://localhost:5173/reset-password?token=...
   ```
3. Navigating to this URL allows completing the password reset workflow without requiring live email infrastructure.
