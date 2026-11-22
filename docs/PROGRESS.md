# Progress

## Current sprint
Sprint 1: Authentication, capabilities, profiles. Status: done.

## Done
- **Backend User Model**:
  - Implemented `User` Mongoose schema in `server/src/models/user.model.js` supporting `fullName`, `email` (unique, lowercase), `mobile` (unique, validated format), `passwordHash` (bcrypt salt 12), `capabilities[]` (`buyer`, `renter`, `seller`, `dealer`, `admin`), `accountStatus` (`active`, `deactivation_requested`, `deactivated`, `blocked`), `contactVisibility` (`email`, `mobile`), `profilePhoto`, `resetPasswordToken` (SHA-256 hashed), `resetPasswordExpires`, and timestamps.
  - Model methods: `comparePassword`, `createPasswordResetToken` (single-use with 15-minute expiry), `toSafeObject` and `toJSON` transform (stripping password hash and reset tokens).
- **Authentication & User REST Endpoints**:
  - `POST /api/auth/register`: registration with duplicate email and duplicate mobile checks, bcrypt hashing, safe capabilities initialization, and JWT issued in `httpOnly` cookie.
  - `POST /api/auth/login`: credential authentication, password comparison, blocked account prevention, rate limiting, and JWT cookie issue.
  - `POST /api/auth/logout`: clears httpOnly auth cookie.
  - `POST /api/auth/forgot-password`: single-use token generation with console print in development.
  - `POST /api/auth/reset-password`: validates single-use token, checks 15-min expiry, updates password hash, and invalidates token.
  - `GET /api/users/profile`: returns authenticated user profile.
  - `PUT /api/users/profile`: updates full name, mobile (with uniqueness re-check), contact visibility flags, and profile photo.
  - `PUT /api/users/password`: validates current password and updates to new bcrypt-hashed password.
  - `PATCH /api/users/account-status`: records user deactivation request (`deactivation_requested`) for administrative review.
  - `POST /api/users/capabilities`: enables multi-role capability addition (e.g. adding `seller`).
- **Security & Middleware**:
  - `requireAuth`: validates JWT from httpOnly cookie or `Bearer` token header, handles expired sessions with clear `AUTH_ERROR` code, and verifies account is not blocked.
  - `requireCapability(...caps)`: enforces role permissions with `FORBIDDEN_ERROR` (e.g. buyers cannot hit seller endpoints; admins bypass role restrictions).
  - `requireActiveAccount`: blocks deactivated or blocked users from performing mutating create/write actions.
  - Rate limiting on `/api/auth/login` and `/api/auth/forgot-password`.
  - Zod validation for every request body with typed `ValidationError` and field-level error mapping.
- **Admin Seeding Script**:
  - `server/scripts/seedAdmin.js`: creates or updates an admin user with all capabilities from environment variables.
- **Supertest Test Suite**:
  - `server/tests/auth.test.js`: 21 tests covering duplicate email (409), duplicate mobile (409), invalid credentials (401), missing required fields (400), password mismatch (400), expired/invalid tokens (401/400), profile updates, password change, deactivation request, capability addition, seller endpoint protection (403 for buyer-only), and deactivated account write blocking (403). Total 28 tests passing across test suites.
- **Postman Collection**:
  - Exported complete Sprint 1 collection to `docs/postman/Roam_Sprint_1.postman_collection.json`.
- **Frontend Auth & Onboarding (UI 8.10)**:
  - Split-screen auth layout (`AuthLayout.jsx`) with 420px form column, pill inputs, right-side dark brand panel with vehicle cut-out silhouette, responsive stacking on mobile.
  - `LoginPage.jsx`: email/password login with redirect handling.
  - `RegisterPage.jsx`: multi-role onboarding tiles (`Buyer / Renter`, `Individual Seller`, `Dealer`) with instant capability pre-selection, full name, mobile, and terms validation.
  - `ForgotPasswordPage.jsx` & `ResetPasswordPage.jsx`: password recovery flow with query-param token auto-fill.
  - Inline error messages beneath all fields (11px `--danger`).
- **Frontend Architecture & Navigation (UI 7.2 & 8.8)**:
  - `AuthProvider.jsx` powered by TanStack Query for session management.
  - `ProtectedRoute.jsx` and `CapabilityRoute.jsx` with automatic redirect and return after login.
  - Header logged-in cluster: Notification bell with red accent dot, avatar circle with dropdown menu showing user details, capability badges, navigation links, and sign out.
  - `DashboardLayout.jsx`: Slim sidebar with 2px solid left active line, top bar (search, theme toggle, bell, avatar), mobile bottom tab bar (< 768px), and capability-based navigation items.
  - `DashboardPage.jsx`: Welcome banner with status chip, stat cards (40px/300 number, 11px label), multi-role upgrade banner, and activity timeline placeholder.
  - `ProfilePage.jsx`: Contact info editing, public contact visibility switches (`Show email on public listings`, `Show mobile on public listings`), and capability status management.
  - `SettingsPage.jsx`: Password change form, account lifecycle card with status chip, and account deactivation request with confirmation modal.

## Deferred
- Vehicle models, photo uploader wizard, and listing management (Sprint 2).
- Public marketplace discovery, vehicle browse, and search filters (Sprint 3).

## Decisions made
- Token Storage: Stored JWT in `httpOnly`, `SameSite=Lax` (or `None` in cross-origin production) cookie named `roam_token`, with fallback support for `Authorization: Bearer <token>` in automated tools/Postman.
- Multi-Role Support: Registered users maintain an array of `capabilities[]`. Any user can add the `seller` capability at any time from their profile or dashboard without needing a separate account.
- Deactivation Flow: Deactivation requests set `accountStatus: 'deactivation_requested'` so administrators can review pending transactions before finalizing deactivation, retaining data needed for legal settlement and active bookings.

## Open questions
- None blocking Sprint 2.

## How to run
- **Server**:
  ```bash
  cd server
  npm test              # Run 28 unit and integration tests
  npm run dev           # Start Express API server (http://localhost:5000)
  node scripts/seedAdmin.js  # Seed platform administrator account
  ```
- **Client**:
  ```bash
  cd client
  npm run build         # Verify client build
  npm run dev           # Start Vite dev server (http://localhost:5173)
  ```
- **Postman**:
  Import `docs/postman/Roam_Sprint_1.postman_collection.json` and set `{{baseUrl}}` to `http://localhost:5000`.
