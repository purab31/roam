# Roam — Pre-Owned Vehicle Marketplace

> *A multi-role pre-owned vehicle marketplace (buy, sell, rent) built as an academic Web Technologies project (TY BTech).*

Roam connects individual vehicle owners, registered second-hand dealerships, buyers, and renters through a quiet, minimalist, high-craft digital marketplace.

---

## 1. Monorepo Structure

```text
roam/
├── docs/                   # Specifications, deployment guides, and architecture
│   ├── functional-spec.md  # Core business requirements and domain rules
│   ├── ui-design.md        # Tokens, layout, component specs, typography
│   ├── ARCHITECTURE.md     # System layers, state machines, and data model
│   ├── DEPLOYMENT.md       # Production hosting on Vercel/Netlify + Render/Railway + Atlas
│   ├── TEST_REPORT.md      # Automated test suites, integration journeys, 35-module checklist
│   ├── KNOWN_LIMITATIONS.md# Audit vulnerabilities, technical boundaries, and trade-offs
│   ├── PROGRESS.md         # Sprint delivery ledger and decision log
│   └── postman/            # Postman API collections and local/hosted environments
├── server/                 # Express API (Node 20, Mongoose, Zod, Helmet, Multer, Jest)
│   ├── src/                # Routes, controllers, services, models, domain state machines
│   ├── scripts/            # Database seed and admin initialization utilities
│   └── tests/              # 18 Supertest integration and unit test suites
└── client/                 # React 18 SPA (Vite, Tailwind CSS, TanStack Query, React Router)
    ├── src/                # Pages, components, contexts, hooks, design tokens
    └── public/             # Static placeholder SVGs and sample assets
```

---

## 2. Quick Start

### Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/roam_dev`) or MongoDB Atlas URI

### Installation
Clone the repository and install dependencies in both packages:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Environment Configuration
Create a `.env` file in `server/`:
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/roam_dev
JWT_SECRET=roam-super-secret-jwt-key-for-development-mode
COOKIE_SAMESITE=lax
STORAGE_PROVIDER=local
LOG_RESET_LINKS=true
```

*(Optional)* Create a `.env` in `client/` if targeting a remote backend directly without a proxy:
```env
VITE_API_URL=http://localhost:5000
```

---

## 3. Database Seeding

Roam provides two database seeding scripts:

1. **Seed Platform Administrator**:
   ```bash
   cd server
   npm run seed:admin
   ```
   Creates the initial admin account (`admin@roam.local` / `Admin@Roam2026`) with full administrative permissions.

2. **Seed Marketplace Demo Dataset**:
   ```bash
   cd server
   npm run seed
   ```
   Seeds sample verified sellers, dealerships, 42 vehicles across all categories (SUV, Sedan, Hatchback, Luxury, Electric), and active marketplace listings.

---

## 4. Development & Running

Start backend and frontend in separate terminals:

```bash
# Terminal 1: Start Express API server (http://localhost:5000)
cd server
npm run dev

# Terminal 2: Start Vite React SPA (http://localhost:5173)
cd client
npm run dev
```

Visit `http://localhost:5173` to explore the marketplace.
Explore all typography, color tokens, and components in both Light and Dark modes at `http://localhost:5173/design-system`.

---

## 5. Available Scripts

### Server (`/server`)
- `npm run dev`: Runs Express API with Nodemon live reload.
- `npm start`: Starts production Node server (`node src/server.js`).
- `npm run seed`: Seeds sample sellers, vehicles, and listings.
- `npm run seed:admin`: Initializes platform admin credentials.
- `npm test`: Runs all 18 Jest test suites in-band.
- `npm run lint`: Runs ESLint on server source files.

### Client (`/client`)
- `npm run dev`: Starts Vite development server.
- `npm run build`: Compiles production React bundle into `client/dist`.
- `npm run preview`: Previews compiled production build locally.
- `npm run lint`: Runs ESLint across client JSX and JS source files.

---

## 6. Testing

The backend includes 18 automated test suites covering positive, negative, and concurrent transactional workflows using Supertest and in-memory MongoDB replica sets:
```bash
cd server
npm test
```

For full test results and the 35-module functional scope checklist, refer to [TEST_REPORT.md](docs/TEST_REPORT.md).

---

## 7. Documentation Index

- [Functional Specification](docs/functional-spec.md) — Business logic & core requirements.
- [UI Design Specification](docs/ui-design.md) — Semantic design tokens, typography, and component specs.
- [System Architecture](docs/ARCHITECTURE.md) — 4-tier layer pattern, state machines, and polymorphic ownership.
- [Deployment Guide](docs/DEPLOYMENT.md) — Production deployment on Vercel/Netlify, Render/Railway, and Atlas.
- [Test Report](docs/TEST_REPORT.md) — Test suites breakdown and 35-module checklist.
- [Known Limitations](docs/KNOWN_LIMITATIONS.md) — Audit advisories and technical boundaries.
- [Progress Ledger](docs/PROGRESS.md) — Chronological sprint delivery and architectural decisions.
