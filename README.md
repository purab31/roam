# Roam — Pre-Owned Vehicle Marketplace

> *Your journey starts here*

Roam is a multi-role web application for pre-owned vehicle buying, selling, and renting designed as an academic Web Technologies project. It connects individual vehicle owners, registered second-hand dealerships, buyers, and renters through a quiet, minimalist, high-craft digital marketplace.

## Monorepo Architecture

```text
roam/
├── AGENTS.md               # Master engineering prompt & workflow rules
├── docs/                   # Specifications, UI designs, and progress logs
│   ├── functional-spec.md  # Business logic & requirements (Sections 18 & 22)
│   ├── ui-design.md        # Tokens, layout, component specs, typography
│   ├── PROJECT_PLAN.md     # Sprint breakdown & Definition of Done
│   ├── PROGRESS.md         # Sprint delivery ledger
│   └── postman/            # Postman API collections
├── server/                 # Express, Mongoose, Zod, Helmet, Rate-limit, Jest/Supertest
└── client/                 # React 18, Vite, Tailwind CSS, Lucide Icons
```

## Quick Start

### 1. Requirements
- Node.js 20+
- npm 10+
- MongoDB instance (local or Atlas replica set)

### 2. Environment Setup
Copy the environment template in both `server/` and `client/`:
```bash
cp .env.example server/.env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Install Dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 4. Run Development Servers
- Backend API (runs on `http://localhost:5000`):
  ```bash
  cd server && npm run dev
  ```
- Frontend Web App (runs on `http://localhost:5173`):
  ```bash
  cd client && npm run dev
  ```

### 5. Running Tests
```bash
cd server && npm test
```

## Design System
Explore all tokens, components, and responsive views in both Light and Dark themes at:
`http://localhost:5173/design-system`
