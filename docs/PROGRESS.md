# Progress

## Current sprint
Part B2: Deployment Preparation & Documentation (Steps 8 and 9). Status: complete.

## Done

### Part B2: Deployment Preparation & Documentation (Steps 8 & 9) (Complete)
- **Same-Origin Proxy & Configurable Cookie SameSite**:
  - Made cookie SameSite configurable via `COOKIE_SAMESITE` (`lax` for same-origin proxy, `none` + `secure: true` for cross-site fallback).
  - Auth cookie options dynamically compute `secure` and `sameSite` policy (`server/src/middleware/auth.js`).
  - Added `vercel.json` and `netlify.toml` configuring `/api/*` and `/uploads/images/*` proxy rewrites to Render/Railway API.
  - Confirmed SPA client fetch calls use relative `/api/*` uniformly.
- **Storage Abstraction & Cloudinary Provider**:
  - Implemented `CloudinaryStorageProvider` (`server/src/services/storage/cloudinary.service.js`) implementing `StorageProvider`.
  - Active provider dynamically selected via `STORAGE_PROVIDER=local|cloudinary` (`server/src/services/storage/index.js`).
  - Updated `vehicle.service.js` and `dealer.service.js` to consume active storage provider.
  - Public vehicle images and dealership logos upload to Cloudinary CDN; private legal documents remain on local disk and stream through authenticated, role-verified routes (`/api/vehicles/:id/documents/:docId/download`).
- **Image URL Resolution in Production**:
  - Added fallback handler for `/images/cars/*` in `server/src/app.js` serving SVG silhouette fallbacks.
  - Updated `client/src/utils/imageUrl.js` to resolve both `/uploads/*` and `/images/cars/*`.
  - Updated `seed.js` to map real images from `samplePhotoMappings` and fallback to valid placeholders.
  - Copied placeholder SVG assets into `client/public/uploads/images/placeholders/`.
- **Seed Script & Admin Hardening**:
  - Guarded `seed.js`: Refuses `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true`, and enforces explicit `SEED_PASSWORD` with no default.
  - Hardened `seedAdmin.js`: Requires `ADMIN_PASSWORD` via environment variable in production with no default.
  - Added `INIT_ADMIN=true` auto-creation on server startup (`server/src/server.js`) for headless cloud deploys.
- **Expiry Cron & Sleeping Free Host Catch-Up**:
  - Guarded `startExpiryCron()` to never schedule timers under `NODE_ENV=test`.
  - Added an idempotent catch-up run of `checkListingExpiry()` on server startup in `server.js` so sleeping free hosts catch up missed midnight expirations upon wake.
- **Documentation Complete**:
  - `README.md`: Setup, scripts, monorepo layout, env variables, seeding commands.
  - `docs/ARCHITECTURE.md`: Layers, state machines, storage architecture, polymorphic ownership, standard error envelope.
  - `docs/DEPLOYMENT.md`: Step-by-step Atlas, Render, Vercel, Netlify guides, env variable tables per host without secrets, cold-start notice, `LOG_RESET_LINKS` documentation.
  - `docs/TEST_REPORT.md`: Test suites summary, API integration journeys, test counts, Section 24 35-module checklist.
  - `docs/KNOWN_LIMITATIONS.md`: npm audit highs by name (`zod`, `vite`), no CSRF tokens, in-memory rate limits, private documents on ephemeral containers, email not built, sleeping free tier.
  - `docs/postman/Roam_Local.postman_environment.json` and `docs/postman/Roam_Hosted.postman_environment.json`: Postman local and hosted environments.

### Sprint 9: Favourites, Compare, Recently Viewed, Inspections, Expiry, Statistics & Polish (Complete)
- **Centralized Listing Availability Guard (`server/src/services/listingAvailability.service.js`)**:
  - `isListingAvailable(listing)` evaluates listings for public engagement features (favourites, compare, recently viewed, inspections).
  - Flags listing as unavailable if:
    - `moderationStatus` is not `'approved'`, or `adminDeactivated` is true, or `moderationStatus` is `'removed'`.
    - Owner account is `'blocked'`.
    - Dealer profile is `'suspended'` or `'revoked'`.
    - Sale or rental statuses are not publicly visible (e.g., `'inactive'`).
  - Never leaks private seller reasons; returns a uniform availability flag (`active`, `reserved`, `sold`, `inactive`, `unavailable`).
- **Favourites System (`server/src/models/favourite.model.js`, `server/src/services/favourites.service.js`, `server/src/routes/favourite.routes.js`)**:
  - `POST /api/favourites`: Adds a listing to user favourites. Compound unique index `{ user: 1, listing: 1 }` prevents duplicates; double-clicks return existing record safely.
  - `DELETE /api/favourites/:id`: Removes a listing from user favourites by listing ID.
  - `GET /api/favourites`: Retrieves user favourites populated with vehicle and listing status, along with `availability` flag so the frontend can display unavailable vehicles without breaking.
- **Recently Viewed System (`server/src/models/recentlyViewed.model.js`, `server/src/services/recentlyViewed.service.js`, `server/src/routes/recentlyViewed.routes.js`)**:
  - Atomic update (`POST /api/recently-viewed`): Pulls any existing entry for the listing, pushes a new entry with `viewedAt: Date.now()`, and slices the array to the last 20 items.
  - Owner exclusion: Users viewing their own listings are never recorded.
  - `GET /api/recently-viewed`: Filters out unavailable listings on read and returns up to 20 recent items.
- **Compare System (`server/src/services/compare.service.js`, `server/src/routes/compare.routes.js`)**:
  - `GET /api/compare?ids=a,b,c`: Compares up to 3 listings. Rejects queries with > 3 IDs with 400 `INVALID_COMPARISON_LIMIT`.
  - Filters out unavailable or non-public listings.
  - Returns vehicle cards alongside aligned specification rows (price, purpose, year, km driven, fuel, transmission, body type, seats, ownership, city, state) and computes `hasDifference` flags for visual accent difference dots.
- **Inspection Appointments System (`server/src/models/inspectionRequest.model.js`, `server/src/services/inspectionStateMachine.js`, `server/src/services/inspection.service.js`, `server/src/routes/inspection.routes.js`)**:
  - Scope: Coordinates in-person appointments only; does not evaluate or verify mechanical condition.
  - State Machine: `requested` -> `accepted` | `rejected` | `reschedule_proposed` | `cancelled`; `reschedule_proposed` -> `accepted` | `rejected` | `cancelled`; `accepted` -> `completed` | `cancelled`.
  - Actor-aware enforcement: Rejects invalid transitions or wrong actors with 403 `FORBIDDEN_ACTION` / 409 `INVALID_STATUS_TRANSITION`.
  - Validation: Requires `preferredDateTime` and proposed reschedule times to be in the future.
  - Duplicate guard: Prevents duplicate open inspection requests per user per listing.
  - Self-inspection guard: Prevents users from requesting inspections on their own listings.
  - Post-commit in-app notifications dispatched for all lifecycle changes (requested, accepted, rejected, reschedule proposed, completed, cancelled).
  - Endpoints: `POST /api/inspections`, `GET /api/inspections`, `GET /api/inspections/:id`, `PATCH /api/inspections/:id/respond`, `PATCH /api/inspections/:id/status`.
- **Listing Expiry & Renewal (`server/src/services/expiry.service.js`, `server/src/services/settings.service.js`, `server/src/routes/listing.routes.js`)**:
  - Expiry notice period: 7 days before expiry (`listingExpiryNoticeDays = 7`).
  - Clock-injectable and idempotent expiry check logic (`checkListingExpiry`).
  - Active exclusion rules: Skips listings that are `reserved`, listings with an `accepted` offer, and listings with `confirmed` or `active` rental bookings.
  - Non-public exclusion rules: Skips listings in `draft`, `pending_review`, `rejected`, `removed`, or with `adminDeactivated: true`.
  - Notification dispatch: Dispatches warning notification when within 7 days of expiry and sets `expiryWarningSent: true`.
  - Status transition: Sets expired listings to `inactive` through the listing state machine.
  - Scheduled cron: `node-cron` scheduled at server start (`0 0 * * *`) executing `checkListingExpiry()`.
  - Renewal endpoint (`POST /api/listings/:id/renew`): Owner or dealer can renew an active or expired listing. If active, extends from `expiresAt`; if already expired, extends from `now`. Resets `expiryWarningSent: false` and restores `active` status if deactivated by expiry.
- **Listing Statistics (`server/src/services/listingStatistics.service.js`, `server/src/routes/listing.routes.js`)**:
  - `GET /api/listings/:id/statistics`: Single listing statistics for owners/dealers. Non-owners are rejected with 403 `FORBIDDEN_ERROR`. Aggregates views (from permanent `viewCount`), saved count (from `Favourite`), total enquiries, total offers, and total bookings.
  - `GET /api/listings/my/statistics`: Batched statistics for all user listings in a single performant aggregation query for My Listings dashboard.
- **Vehicle Image Architecture & Display System Fix**:
  - Root cause resolved: Express static file serving configured with `Cross-Origin-Resource-Policy: cross-origin` in Helmet and `/uploads` static file mount; client URL resolution handles cross-origin API hosts (`VITE_API_BASE_URL`); relative paths and broken placeholder references resolved.
  - Shared `VehicleImage` component (`client/src/components/vehicle/VehicleImage.jsx`) created and integrated across all vehicle surfaces (VehicleCard, detail hero gallery, favourites, compare, compare tray, recently viewed carousel, dashboards, My Listings, My Vehicles, My Bookings, Rental Requests, Admin listings, Admin dashboard).
  - Built-in automatic fallback to neutral SVG silhouette drawings (`/placeholders/placeholder-${bodyType}.svg`) on image load errors or missing photos.
  - Image URL resolution helper (`client/src/utils/imageUrl.js`) ensuring resilient URL resolution across development and production environments.
  - Database seed updated idempotently to associate structured car photo paths (`/images/cars/<bodyType>/car-N.jpg`) while preserving seller-uploaded vehicle photos.
- **Frontend Favourites, Compare & Discovery UI**:
  - `FavouritesContext.jsx` & `CompareContext.jsx`: Global context providers for optimistic favourites state and persistent comparison tray with 3-item limit.
  - `CompareTray.jsx`: UI 8.2 docked pill at bottom of viewport displaying up to 3 vehicle thumbnails with remove buttons and a primary Compare action button.
  - `ComparePage.jsx`: UI 8.4 comparison matrix with sticky header, vehicle tiles, aligned dotted-leader spec rows across columns, and visual accent dots for differing specs.
  - `FavouritesPage.jsx`: UI 7.10 saved vehicle page gracefully handling sold, inactive, or unavailable vehicles without breaking.
  - `RecentlyViewedCarousel.jsx`: Reusable recently viewed carousel integrated on `VehicleDetailPage.jsx` and `HomePage.jsx`.
  - `VehicleCard.jsx`: Real favourites heart button with optimistic active fill and hover compare trigger.
  - `Header.jsx`: Heart icon with saved count badge in header right cluster, and "Saved Vehicles" link in avatar dropdown.
- **Frontend Inspection Modals & Queues**:
  - `InspectionModal.jsx`: Booking modal for buyers with date and time pickers (validated for future dates), message input, and character counters.
  - `InspectionAppointmentsList.jsx`: Integrated in `DashboardPage.jsx` for both buyers and sellers, supporting status tabs, counter-reschedule proposal modals, and status actions (accept, decline, complete, cancel).
- **Frontend Listing Expiry & Dashboard Stat Counters**:
  - `MyListingsPage.jsx`: Batched statistics indicators (views, saved count, enquiries, offers, bookings) on listing cards, expiry warning banners with days-to-expiry notice, expired banners, and "Renew" mutation action.
- **Application Polish, Resilience & Static Analysis**:
  - `NotFoundPage.jsx`: UI 8.8-compliant 404 page utilizing `EmptyState` with compass icon and return-to-home action.
  - `ErrorBoundary.jsx`: React component error boundary catching unexpected interface crashes with reload recovery.
  - `App.jsx`: Wrapped with `ErrorBoundary`, `FavouritesProvider`, `CompareProvider`, compare tray, and routes for `/favourites`, `/compare`, `/404`, and fallback `*`.
  - Reduced-motion accessibility supported throughout components and styling.
  - ESLint configuration updated in client and server enforcing `no-use-before-define`, `react-hooks/rules-of-hooks`, and `react-hooks/exhaustive-deps`. Verified 0 errors across client and server.
  - Client Page Smoke Testing (`client/scripts/smoke-test.mjs` via `npm run test:smoke`): Verified that Home, Browse, Vehicle Detail, Favourites, and Compare pages mount and render with their provider stacks, routers, and query caches without errors.
- **Automated Integration Testing (100% Green, 246/246 Tests Passing Across 16 Test Suites)**:
  - `server/tests/engagement.test.js`: 30 new tests covering favourites, recently viewed, compare (including >3 rejection), inspections (full lifecycle, actor permissions, future date checks, duplicate prevention), listing expiry exclusions & renewals, and listing statistics security.
  - Verified full test suite: 246 tests passed across 16 test suites.
- **Postman API Collection (`docs/postman/Roam.postman_collection.json`)**:
  - Added "Sprint 9: Engagement & Polish" folder with 12 configured requests.

### Sprint 8: Admin, Moderation, Reports, and Analytics (Complete)
- **Frontend Admin Dashboard & Operations (`client/src/pages/admin/` & `client/src/components/dashboard/DashboardLayout.jsx`)**:
  - `AdminDashboardPage.jsx`: Platform analytics dashboard featuring 4 stat cards (big 40px/300 typography, 11px uppercase label, and SVG sparklines from real 6-month historical monthly series for registrations and listing creations), quick jump action banners for pending work (reviews, verifications, reports), popular vehicle brands and models chips/rows, and debounced most-viewed listings table with permanent view counts.
  - `AdminListingsPage.jsx`: Moderation queue matching UI 8.8 table layout (no zebra, 1px row dividers, 12px text, hover `--bg-subtle`, sticky header, moderation chip second-to-last, kebab menu last) with status tabs (`pending_review`, `approved`, `rejected`, `removed`, `all`), purpose filters, and accessible modal dialogs for approve, reject (requires reason), request corrections (requires reason), deactivate (with administrative lock notice), and remove.
  - `AdminUsersPage.jsx`: User management table with debounced search (name, email, mobile), status and capability filters, block modal with mandatory reason, unblock modal, and detailed user activity modal showing vehicle, listing, offer, booking, and dealership counters.
  - `AdminDealersPage.jsx`: Full dealer verification management in UI 8.8 table format with status filter tabs (`pending`, `approved`, `changes_requested`, `suspended`, `revoked`, `rejected`), kebab actions (approve/reinstate, request info, suspend, revoke, reject), and integrated Document Viewer modal with direct download links.
  - `AdminReportsPage.jsx`: Policy reports queue with status tabs (`open`, `in_review`, `resolved`, `dismissed`), subject filters, detail inspector, and resolution modal for recording resolution notes, logging audit entries, and notifying reporters.
  - `AdminOffersPage.jsx` & `AdminBookingsPage.jsx`: Read-only oversight tables with status filters, buyer/seller/renter references, monetary totals, dates, and detailed inspection modal dialogs.
  - `AdminSettingsPage.jsx`: Platform settings singleton management covering dealer verification requirement toggle, listing expiry days input (1-365), categories editor (add, inline rename, remove with unique name and min 1 validations), and announcement bar editor with live preview.
  - `AdminAuditLogPage.jsx`: Paginated append-only immutable audit trail review table with target filtering (`listing`, `user`, `dealer`, `report`, `settings`) and JSON payload viewer modal.
  - `KebabMenu.jsx`: Accessible table row action dropdown with keyboard escape handling, focus management, and click-outside dismissal.
  - Admin-only sidebar navigation links integrated into `DashboardLayout.jsx` with active line indicator, plus mobile bottom navigation shortcut.
  - Route guards in `App.jsx` wrapped with `<ProtectedRoute>` and `<CapabilityRoute capability="admin">`.
- **Reporting System Frontend Integration (`client/src/components/report/ReportModal.jsx`)**:
  - `ReportModal.jsx`: Keyboard accessible policy violation submission modal supporting categories (`misleading`, `fraud`, `inappropriate_media`, `suspicious_account`, `misleading_dealer`, `other`) with character length validation and duplicate report error handling.
  - `VehicleDetailPage.jsx`: Integrated Report button (hidden on user's own listing; unauthenticated guests redirected to login).
  - `DealerProfilePage.jsx`: Integrated Report button (hidden for dealership owner; unauthenticated guests redirected to login).
- **Public Announcement & Dynamic Categories Integration**:
  - `AnnouncementBar.jsx`: Dynamically fetches `GET /api/settings/announcement` and renders nothing when empty; handles internal navigation and external links.
  - `HomePage.jsx` & `ListingWizardPage.jsx`: Dynamically read categories from `GET /api/settings/categories` with zero-latency fallback.
- **Listing Re-Review Approval Fix (Decision 3)**:
  - Corrected `approve` action in `server/src/services/listing.service.js` so that `sale.status` and `rental.status` are activated only if currently `'inactive'`, ensuring existing `'reserved'` and `'sold'` statuses are strictly preserved during re-approval.
  - Added Supertest test in `server/tests/admin.test.js` validating that re-approving a listing after re-review preserves `reserved` and does not reopen `sold`.
- **Removed AUTO_APPROVE_LISTINGS (`server/src/services/listingStateMachine.js`)**:
  - Listing creation/submission now strictly transitions from `draft -> pending_review` (or remains `draft` if `saveAsDraft: true`).
  - Public marketplace search explicitly requires `moderationStatus: 'approved'`, so unreviewed listings remain hidden until admin approval.
  - The development seed script explicitly creates sample listings as `moderationStatus: 'approved'`, ensuring the public marketplace remains populated for development.
- **Admin Listing Moderation Queue (`PATCH /api/admin/listings/:id/status` & `GET /api/admin/listings`)**:
  - Moderation actions:
    - `approve`: transitions `moderationStatus` to `'approved'`, activates `sale.status` and/or `rental.status` based on listing purpose, clears `adminDeactivated`, writes an audit log entry, and dispatches a notification to the owner.
    - `reject`: transitions `moderationStatus` to `'rejected'`, records the rejection reason, writes an audit log entry, and notifies the owner.
    - `request_corrections`: transitions `moderationStatus` to `'rejected'` with prefixed corrections note, notifies owner, and allows the owner to edit and resubmit (`rejected -> pending_review`).
    - `deactivate`: flags `adminDeactivated = true`, sets sale and rental statuses to `'inactive'`, records the reason, and notifies the owner.
    - `remove`: transitions `moderationStatus` to `'removed'` and notifies owner.
  - Enforced administrative lock: an owner attempting to activate an admin-deactivated listing is rejected with `ForbiddenError(403, 'ADMIN_DEACTIVATED')`.
- **Re-Review Triggers (`server/src/services/listing.service.js` & `server/src/services/vehicle.service.js`)**:
  - Changes to vehicle photos (added, removed, cover changed), vehicle identity (`brand`, `model`, `variant`, `manufacturingYear`, `registrationYear`), free-text fields (`knownDefects`, `serviceHistory`, `accidentHistory`, `features`), or listing description/conditions/purpose on an approved listing automatically transition it back to `pending_review`.
  - Excludes edits to pricing, negotiable flag, status actions, rental rates, or blocked dates from triggering re-review.
  - Sends a system notification to the listing owner explaining that recent edits triggered re-review.
- **Immediate User Blocking & Account Management (`server/src/services/admin.service.js`)**:
  - `GET /api/admin/users`: search by name/email/mobile and filter by status and capability with pagination.
  - `GET /api/admin/users/:id`: detailed profile with activity counters (vehicles, listings, offers, bookings, dealership).
  - `PATCH /api/admin/users/:id/block`: records a mandatory reason, sets `accountStatus: 'blocked'`, logs an audit entry, and notifies the user. Self-blocking by admins is rejected with a 400 `ValidationError`.
  - Immediate session rejection: `requireAuth` inspects `user.accountStatus === 'blocked'` on every request, immediately rejecting existing valid JWT session cookies with 403 `FORBIDDEN_ERROR`.
  - Discovery exclusion: listings of blocked users are excluded from public search results and detail queries.
  - `PATCH /api/admin/users/:id/unblock`: restores `accountStatus: 'active'`, logs an audit entry, and allows immediate login.
- **Complete Dealer Verification Lifecycle (`server/src/services/dealer.service.js`)**:
  - Extended verification statuses: `pending`, `approved`, `rejected`, `changes_requested`, `suspended`, `revoked`.
  - Both `suspended` and `revoked` block publishing and exclude dealer listings from public search and public showroom profiles.
  - Dealer can resubmit verification documents after revocation, setting status back to `pending`.
  - Admin verification actions write an append-only audit log entry and dispatch real-time in-app notifications.
- **Reporting System (`server/src/models/report.model.js` & `server/src/services/report.service.js`)**:
  - `POST /api/reports`: authenticated reporting of listings, users, or dealerships with categories (`misleading`, `fraud`, `inappropriate_media`, `suspicious_account`, `misleading_dealer`, `other`).
  - Rate-limited via `reportLimiter` (30 requests/15 minutes per IP).
  - Self-report prevention: users cannot report their own account, listings, or dealership (400 `ValidationError`).
  - Duplicate open report prevention: users cannot submit multiple open/in-review reports for the same subject (409 `DUPLICATE_REPORT`).
  - `GET /api/admin/reports` & `PATCH /api/admin/reports/:id`: admin review, resolution notes, reporter notification, and audit logging.
- **Debounced Listing View Counting (`server/src/models/listingView.model.js`)**:
  - Permanent `viewCount` field on `Listing` incremented atomically (`$inc: { viewCount: 1 }`).
  - One-hour debounce marker stored in `ListingView` with MongoDB TTL auto-expiry index.
  - Excludes owner views from counting. View recording is non-blocking and silent on duplicate keys.
- **Platform Analytics & Oversight (`server/src/services/admin.service.js`)**:
  - `GET /api/admin/dashboard`: aggregates total users, sellers, dealers, verified dealers, vehicles, active sale/rental listings, sold vehicles, offers, bookings, pending reviews, pending verifications, and reported items.
  - Top 5 popular brands and models, and top 5 most viewed listings.
  - Real 6-month historical sparkline series for user registrations and listing creations.
  - `GET /api/admin/offers` & `GET /api/admin/bookings`: read-only oversight tables.
- **Platform Settings Singleton (`server/src/models/settings.model.js` & `server/src/services/settings.service.js`)**:
  - Single source of truth for `dealerVerificationRequired`, `listingExpiryDays`, platform `categories`, and `announcementBar`.
  - Singleton record upserted on fixed key (`global`) with in-memory caching for zero latency.
  - Input validation: expiry days range (1-365), announcement character caps, and URL validation (internal `/` or `https://`).
  - Public endpoints: `GET /api/settings/announcement` (renders null when empty) and `GET /api/settings/categories`.
- **Append-Only Audit Log (`server/src/models/auditLog.model.js` & `server/src/services/auditLog.service.js`)**:
  - Immutable audit trail capturing `actor`, `action`, `targetType`, `targetId`, `details`, `ipAddress`, and `createdAt`.
  - Recorded after every successful admin mutation (listing approve/reject/deactivate, user block/unblock, dealer verification update, report resolution, settings update).
  - `GET /api/admin/audit-log`: paginated review for administrators.
- **Automated Integration Testing (100% Green, 215/215 Tests Passing Across 15 Test Suites)**:
  - `tests/admin.test.js`: 42 comprehensive tests covering non-admin 401/403 security gates, listing moderation, re-review triggers, user blocking & immediate session cookie rejection, dealer suspension/revocation, reports duplicate & self-report rejections, settings caching & validation, debounced view counts, and audit logs.
  - Updated legacy test expectations in `tests/listings.test.js` and `tests/dealers.test.js` for `pending_review` initial status.
  - Total test suite: 215 tests passed across 15 suites.
- **Postman API Collection (`docs/postman/Roam.postman_collection.json`)**:
  - Added "Admin, Moderation, Reports & Analytics (Sprint 8)" folder with 18 pre-configured requests.

### Sprint 7: Rental Lifecycle (Handover, Return, Modify, Cancel, History)
- **Extended Booking State Machine (`server/src/services/bookingStateMachine.js` & `server/src/models/booking.model.js`)**:
  - Full state lifecycle: `requested` / `pending` / `confirmed` -> `cancelled`; `confirmed` -> `active` (handed over) -> `completed` (returned).
  - Modification lifecycle: `confirmed` -> `modification_requested` -> `confirmed` (with new dates on approve, or restoring previous dates on reject).
  - Invalid status jumps or double completions throw `ConflictError(409, 'INVALID_STATUS_TRANSITION')`.
  - Audited `modificationHistory[]` capturing `previousStartDate`, `previousEndDate`, `previousPricing`, `proposedStartDate`, `proposedEndDate`, `proposedPricing`, `action`, `actionBy`, `actionAt`, and reason.
- **Transactional Lifecycle Handover & Return (`server/src/services/booking.service.js`)**:
  - Handover (`action: 'handover'`): Atomically updates booking `status: 'confirmed' -> 'active'`, checks vehicle owner/dealer permissions, appends to `statusHistory`, and dispatches `Vehicle Handed Over` notification to renter.
  - Return (`action: 'complete'`): Atomically updates `status: 'active' -> 'completed'`, records completion `Transaction` (`transactionType: 'rental'`, `finalAmount` = rental total excluding refundable deposit, deposit snapshot, start/end dates, and references), and dispatches `Rental Completed` notification to renter.
- **Cancellation Cutoff Policy (`server/src/services/booking.service.js`)**:
  - Unconfirmed requests (`requested`, `pending`) can be cancelled at any time by renter or owner, releasing dates immediately.
  - Confirmed bookings enforce `listing.rental.cancellationCutoffHours` (default 24h): cancellations within the cutoff window are rejected with `ConflictError(409, 'CANCELLATION_WINDOW_EXPIRED')`. Owners and admins retain override cancellation rights.
- **Date Modification & Concurrency Safety (`server/src/services/booking.service.js`)**:
  - `PATCH /api/bookings/:id/modification`:
    - Renter submission: Validates pickup/return dates, minimum and maximum durations, restricts requests to before pickup time, recalculates proposed estimate with `calculateRentalEstimate`, and transitions booking to `modification_requested`.
    - Owner/dealer review: In a MongoDB transaction, serializes against concurrent operations by incrementing parent `Listing.__v`, reruns `checkAvailability` strictly excluding the booking itself, recalculates fresh pricing, archives modification history, and transitions back to `confirmed` (or declines and retains existing dates).
- **Recorded Rental Earnings Summary (`server/src/services/booking.service.js`)**:
  - `GET /api/bookings/summary`: Reports completed rental earnings strictly from recorded amounts (excluding deposits), counts for completed, active, upcoming, and pending requests, and generates a real 6-period monthly earnings sparkline series.
- **Role-Aware Filtering & Blocked Dates CRUD (`server/src/services/booking.service.js`)**:
  - `GET /api/bookings?view=upcoming|active|completed|cancelled`: View filters tailored for renter and owner dashboards.
  - `POST /api/listings/:id/unavailable-dates` & `DELETE /api/listings/:id/unavailable-dates/:dateId`: Blocks owner calendar dates, rejecting date ranges that overlap existing confirmed/active reservations with `ConflictError(409)`.
- **In-App Notifications (`server/src/models/notification.model.js`)**:
  - Dispatches targeted notifications post-commit for handover, return, cancellation, modification requested, approved, and rejected.
- **Frontend Renter & Owner/Dealer Dashboards (`client/src/pages/dashboard/`)**:
  - `MyBookingsPage.jsx`: Renter dashboard with tabs (`Upcoming`, `Current (Active)`, `Completed`, `Cancelled`, `All History`), vehicle badges, live status chips, cancellation modal with cutoff notice, and date change modal with datetime pickers.
  - `RentalRequestsPage.jsx`: Owner & dealer rental operations with 4 stat cards (40px/300 number, 11px label, SVG sparkline), tabs (`Requests & Modifications`, `Active & Upcoming`, `Completed & History`, `Blocked Dates`), Mark Handed Over, Mark Returned, Approve/Decline modification modals, and blocked date calendar manager.
  - Empty states with clear call-to-actions on both dashboards.
- **Automated Supertest Integration Testing (`server/tests/bookingsLifecycle.test.js`)**:
  - 15 comprehensive integration tests covering complete handover -> return -> transaction creation flow, skipping state rejections (409), double completion prevention, cancellation cutoff windows (>24h allowed, <24h rejected with 409), modification requests and conflict rechecks, blocked dates overlap prevention, IST midnight boundary handling, and rental summary calculations. All 173 server test suite tests passing (14/14 test suites).
- **Postman API Collection (`docs/postman/Roam.postman_collection.json`)**:
  - Pre-configured requests under "Rentals & Bookings (Sprint 6 & 7)" covering Handover, Return, Request Modification, Approve/Decline Modification, and Rental Summary.

### Sprint 6: Rental Listings, Availability & Booking Requests
- **Database Models & State Machines (`server/src/models/` & `server/src/services/`)**:
  - `Booking`: `renter` (ObjectId ref User), `listing` (ObjectId ref Listing), `ownerRef` (`{ type: 'user' | 'dealer', id }`), `startDate`, `endDate`, `pricing` snapshot (`{ baseRate, days, additionalCharges, deposit, estimatedTotal }`), `notes`, `status` (`requested`, `pending`, `confirmed`, `rejected`, `cancelled`, `active`, `completed`, `modification_requested`), `statusHistory[]`, timestamps.
  - `UnavailableDate`: `listing`, `startDate`, `endDate`, `reason`, `createdBy`, timestamps.
  - `Notification`: added `'Booking'` to `relatedRef.model` enum.
  - `bookingStateMachine.js`: explicit transition map enforcing valid lifecycle changes and throwing `ConflictError(409, 'INVALID_STATUS_TRANSITION')`.
- **Pure Function Rental Pricing Engine (`server/src/services/rentalPricing.js`)**:
  - `calculateRentalEstimate(listing, start, end, options)`:
    - Calculates calendar duration in 24h blocks (minimum 1 day).
    - Compares valid combinations: all daily (`days * dailyPrice`), weeks + remainder (`fullWeeks * weeklyPrice + remDays * dailyPrice`), and round up to next full week (`ceilWeeks * weeklyPrice`).
    - Selects the cheapest valid rate combination to ensure optimal renter pricing.
    - Captures refundable security deposit separately from rental base charges.
    - 100% unit-tested across daily, weekly, round-up, and multi-week scenarios (`server/tests/rentalPricing.test.js`).
- **Availability Engine & Concurrency Locking (`server/src/services/availability.service.js`)**:
  - Conflict rule: `existing.startDate < newEndDate AND existing.endDate > newStartDate`.
  - Confirmed bookings and owner-blocked dates block overlapping dates.
  - Same-day turnaround permitted (pickup on previous return date does not conflict).
  - Soft warning for pending/requested bookings without blocking confirmation.
  - Concurrent acceptance serialization: inside MongoDB transaction, atomically increments parent `Listing.__v` to serialize concurrent requests on the same vehicle, guaranteeing that racing accept requests cannot both succeed.
- **REST Endpoints (`server/src/routes/` & `server/src/controllers/`)**:
  - `POST /api/bookings`: Renter booking requests with duration validation (min/max days), deactivated account blocking, self-booking prevention (403 `CANNOT_BOOK_OWN_LISTING`), and in-app owner notification.
  - `GET /api/bookings`: Role-aware retrieval for renters (`role=renter`), vehicle owners/dealers (`role=owner`), and platform admins (`role=admin`), with status and pagination filters.
  - `GET /api/bookings/:id`: Authenticated booking retrieval enforcing renter/owner/admin access.
  - `PATCH /api/bookings/:id/status`: Status transitions (`accept`, `reject`, `cancel`) enforcing transactional availability checks on `accept` and dispatching post-commit notifications.
  - `GET /api/listings/:id/availability?from=&to=`: Returns confirmed bookings, unavailable dates, and pending bookings for calendar views.
  - `POST /api/listings/:id/unavailable-dates` & `DELETE /api/listings/:id/unavailable-dates/:dateId`: Owner date blocking.
  - `GET /api/listings`: Extended with rental date availability filters (`availableFrom`, `availableTo`, `availableNow`).
- **Frontend Vehicle Detail & Booking Experience (`client/src/`)**:
  - `VehicleDetailPage.jsx`: Two-segment pill switch (`Buy | Rent`) per UI 7.5 when listing purpose is `both`, dynamic daily price display, integrated `DateRangePicker` in the floating card, and `RentalTermsTab`.
  - `AvailabilityCalendar.jsx` (UI 8.3): Month grid calendar showing available days, struck-through unavailable/booked days in `--text-faint`, selected range in primary fill, today indicator, and legend.
  - `DateRangePicker.jsx` (UI 7.5): Interactive pickup and return date picker with live duration calculation, transparent cost breakdown (daily rate, deposit, estimated total), and minimum/maximum duration validation warnings.
  - `RentalTermsTab.jsx` (UI 7.5 & 7.7): Dotted-leader rows displaying daily/weekly rates, refundable deposit, min/max days, pickup/return locations, driver policy, mileage and fuel policies, cancellation terms, and embedded availability calendar.
  - `BookingPage.jsx` (UI 8.6): Three-step numbered stepper (1. Dates & Location -> 2. Driver Details -> 3. Review & Request) with pinned floating summary card and confirmation screen with 56px/300 typography and success status chip.
  - `RentalRequestsPage.jsx` (`/dashboard/rental-requests`): Owner/dealer queue for incoming requests with renter details, duration, total amount, conflict warnings, and Accept / Decline actions with modals.
  - `MyBookingsPage.jsx` (`/dashboard/bookings`): Renter bookings dashboard with status filtering tabs and permitted booking cancellation.
  - `ListingWizardPage.jsx` & `VehicleCard.jsx`: Preview card dynamically displays rental daily rates and purpose chips.
  - `DashboardPage.jsx` & `DashboardLayout.jsx`: Added rental request queues and renter bookings summary widgets and navigation links.
- **Automated Integration & Unit Testing**:
  - `server/tests/rentalPricing.test.js`: 6 unit tests for pricing calculations.
  - `server/tests/bookings.test.js`: 17 integration tests covering valid booking submission, unauthenticated 401, deactivated user 403, self-booking 403, duration 400 validations, overlap matrix (partial before/after, contained, containing, adjacent, same-day turnaround), blocked dates, pending non-blocking behavior, concurrent accept race condition (100% passing), rejection notification, and availability calendar queries.
- **Postman Collection**:
  - Added "Rentals & Bookings (Sprint 6)" folder with 11 pre-configured requests to `docs/postman/Roam.postman_collection.json`.

### Sprint 5: Dealers & Owner-to-Dealer Purchase Workflow
- **Frontend Admin Verification & Negotiation Handover (Stage 7)**:
  - `AdminDealersPage.jsx` (`/dashboard/admin/dealers`): Admin verification queue with status filtering (`pending`, `approved`, `changes_requested`, `rejected`, `suspended`, `all`), compliance notes modal, document download streams, and instant status updates.
  - `NegotiationThreadPage.jsx`: Acquisition-aware negotiation view; displays verified dealer summary badges, replaces standard "Mark Sold" with acquisition initiation for dealers, and provides handover confirmation/cancellation actions.
  - `DashboardLayout.jsx`: Added "Dealer Verifications" management link under the Administrator capability cluster.
- **Frontend Dealer Dashboard & Inventory Management (Stage 6)**:
  - `DealerInventoryPage.jsx` (`/dashboard/inventory`): Inventory table following UI Section 8.8 (12px text, 1px row dividers, sticky header, status chips, multi-select bulk actions: activate/deactivate, links to public listings). Live stat counters for total stock, active showroom, draft/inactive, and sold/acquired.
  - `BulkUploadPage.jsx` (`/dashboard/inventory/upload`): Dual-mode CSV importer (Atomic strict all-or-nothing rollback vs Partial flexible save valid rows). Supports file drop and raw CSV paste, provides a downloadable sample template, and renders a row-by-row error table with exact row numbers and error messages.
  - `DiscoverOwnerListingsPage.jsx` (`/dashboard/discover`): Spec 8.1 vehicle discovery feed for dealers filtering private individual listings by brand, model, city, condition, price, year, and km driven. Displays permitted owner contacts and integrates `OfferSideSheet` to submit purchase proposals directly.
  - `DealerOffersSentPage.jsx` (`/dashboard/dealer-offers`): Tracks all dealer purchase proposals sent to owners with status tracking, link to negotiation thread, and one-click "Initiate Vehicle Acquisition" upon offer acceptance.
  - `DashboardPage.jsx`: Enhanced owner received offers list with verified dealer badges, dealership showroom links, and side-by-side offer comparison (Spec 8.3 & 11.1).
  - `DashboardLayout.jsx`: Added dealer navigation sidebar cluster (`Dealer Inventory`, `Discover Owners`, `Bulk CSV Upload`, `Offers Sent`).
- **Frontend Dealer Onboarding & Directory (Stage 5)**:
  - `DealerRegistrationPage.jsx` (`/dealer/register`): 3-step progressive wizard (Basics, Location & Address, Documents & Logo) supporting logo image preview/upload and official verification document uploads. Auto-redirects if user already has a registered dealership.
  - `DealerVerificationStatusPage.jsx` (`/dealer/verification`): Visual alert banner with real-time status (`pending`, `approved`, `rejected`, `changes_requested`, `suspended`), compliance officer notes display, document download links, and additional document re-upload form.
  - `DealerDirectoryPage.jsx` (`/dealers`): Public directory of certified dealerships with keyword search, dynamic city filter, responsive skeleton loading states, and empty states.
  - `DealerProfilePage.jsx` (`/dealers/:id`): Public dealership profile featuring identity banner, verified partner status chip, contact details (phone, email), location, description, and showroom inventory grid powered by `VehicleCard` (UI 7.10).
  - `DealerCard.jsx`: Reusable 24px-radius dealership card with logo/placeholder, verified badge, managed-by line, city, vehicle inventory count, and showroom link.
  - `Header.jsx`: Updated public navigation link `Dealers` to route directly to `/dealers`; added `My Dealership` / `Register Dealership` shortcuts into both desktop avatar dropdown and mobile navigation menus.
  - `HomePage.jsx`: Wired real verified dealer fetch into the trust strip (UI 7.12) with direct showroom navigation, added "Browse all certified partner showrooms" link, and added "Register as a dealer" button in the black community CTA band (UI 7.13).
  - `StatusChip.jsx`: Added configurations for `approved`, `changes_requested`, and `suspended` statuses with specific icons and theme-compliant styles.
- **Database Models & Validations (`server/src/models/` & `server/src/validations/`)**:
  - `Dealer`: `user` (unique ref), `dealershipName`, `ownerName`, `businessEmail`, `phone`, `address`, `city`, `pincode`, `description`, `logo`, `registrationInfo`, `documents[]` (private array with `docType`, `fileUrl`, `filename`, `uploadedAt`), `verificationStatus` (`pending`, `approved`, `rejected`, `changes_requested`, `suspended`), `verificationNotes`, timestamps.
  - `Transaction` acquisition extension: `acquisitionStatus` (`none`, `acquisition_pending`, `acquired`, `cancelled`) with index.
  - `Notification` model: added `'Dealer'` to `relatedRef.model` enum.
  - Zod schemas: `dealerRegistrationSchema`, `updateDealerProfileSchema`, `updateVerificationSchema`, `bulkStatusUpdateSchema`, `createAcquisitionSchema`, `updateAcquisitionStatusSchema`.
- **Acquisition State Machine (`server/src/services/acquisitionStateMachine.js`)**:
  - Enforces `none -> acquisition_pending -> acquired | cancelled`.
  - Blocks invalid status transitions with `ConflictError(409, 'INVALID_STATUS_TRANSITION')`.
- **Dealer Service & Verification Gates (`server/src/services/dealer.service.js` & `server/src/middleware/auth.js`)**:
  - `REQUIRE_DEALER_VERIFICATION` in `server/src/config/env.js` (defaults to `true`).
  - Middleware `requireVerifiedDealer` and `requireDealer` enforce verification before listing creation, publishing, and bulk inventory actions.
  - Derives `ownerRef.type` server-side (`dealer` vs `user`), preventing forgery via request bodies.
  - `getDiscoverOwnerListings`: Spec 8.1 filterable feed for dealers, strictly respecting owner `contactVisibility` settings.
  - `getDealerInventory`, `bulkUpdateListingStatus`, `getDealerDashboardStats`, `getPublicDealers`, `getDealerById`, `getPublicDealerListings`.
  - Document uploads (`uploadLogo`, `addDealerDocument`, `getDealerDocumentPath` for secure authenticated streaming).
- **Owner-to-Dealer Acquisition Authority (`server/src/services/transaction.service.js`)**:
  - `POST /api/transactions`: Explicitly rejects dealer offers with `409 DEALER_ACQUISITION_REQUIRED`.
  - `POST /api/transactions/acquire`: Dealer initiates acquisition from an `accepted` offer.
  - `PATCH /api/transactions/:id/acquisition`: Inside a single MongoDB transaction:
    - On `confirm`: listing `sale.status` set to `'sold'`, rental deactivated, vehicle `ownerRef` transferred to dealer, offer status set to `'completed'`.
    - On `cancel`: listing returned to `'active'`, offer set to `'rejected'`.
    - Post-commit notifications dispatched to dealer and owner.
- **CSV Bulk Upload Engine (`server/src/services/bulkUpload.service.js`)**:
  - RFC 4180 CSV parser supporting atomic (all-or-nothing rollback) and partial (save valid, report invalid) modes.
  - 500-row cap, required header validation, and row-numbered validation error reports.
- **Admin Verification Controls (`server/src/routes/admin.routes.js`)**:
  - `GET /api/admin/dealers`, `GET /api/admin/dealers/:id`, `PATCH /api/admin/dealers/:id/verification` with `requireCapability('admin')`.
- **Automated Integration Testing (135/135 Tests Passing)**:
  - `tests/dealers.test.js` (18 new tests): Unverified dealer publishing blocked, dealer-to-owner offers, offer comparison with dealer summary, acquisition confirmation transferring vehicle ownership and closing listing, acquisition cancellation restoring active listing, and non-admin 403 enforcement.
- **Postman Collection**:
  - Added "Dealers & Acquisitions (Sprint 5)" folder to `docs/postman/Roam.postman_collection.json` with 12 pre-configured requests.

### Sprint 4: Enquiries, Offers, Reservation, Completion & In-App Notifications (Milestone 2)
- **Database Models & Validations (`server/src/models/` & `server/src/validations/`)**:
  - `Enquiry`: `enquirer`, `listing`, `recipient`, `subject`, `message`, `status` (`open`, `answered`, `resolved`, `closed`), `replies` (`[{ sender, message, createdAt }]`), timestamps.
  - `Offer`: `listing`, `offeredBy`, `seller`, `amount`, `message`, `status` (`submitted`, `pending`, `accepted`, `rejected`, `counteroffer_made`, `withdrawn`, `expired`, `completed`), `awaitingResponseFrom` (`seller`, `buyer`, `none`), `isBelowMinimum` (boolean, seller-only visibility), `expiresAt`, `history` (`[{ actor, action, amount, message, timestamp }]`).
  - `Transaction`: `finalAmount`, `buyer`, `seller`, `vehicle`, `listing`, `offerRef` (unique index preventing double-submits), `transactionType: 'sale'`, `date`, `notes`.
  - `Notification`: `recipient`, `type` (`offer`, `enquiry`, `rental`, `system`), `title`, `message`, `relatedRef`, `read`, `createdAt`.
  - Zod schemas enforcing strict types, positive integer minor units (paise), non-empty messages, valid MongoIDs, and status enums.
- **Dedicated Offer State Machine (`server/src/services/offerStateMachine.js`)**:
  - Pure state-machine transition guard function.
  - Enforces listing availability: must be `approved`, `active` for sale, and not `reserved` or `sold`.
  - Prevents self-offers (403 Forbidden) and self-enquiries (403 Forbidden).
  - Blocks deactivated/suspended users from all actions.
  - Actor turn awareness (`awaitingResponseFrom`): only the party whose turn it is can accept, reject, or counter; offerer can withdraw before acceptance; non-participants blocked with 403 Forbidden.
- **Offer Acceptance in MongoDB Transaction (`server/src/services/offer.service.js`)**:
  - Executes inside a MongoDB transaction (`session.withTransaction`).
  - Performs an atomic conditional update verifying offer status is active (`submitted`, `pending`, `counteroffer_made`).
  - Atomically closes/rejects all other active competing offers on that vehicle listing with history reason `'closed_competing_offer'`.
  - Does NOT mark the listing sold and does not auto-reserve (Spec 7.4 & 18.2).
  - Emits in-app notifications post-commit: notifies accepted buyer and notifies all closed competing buyers.
- **Sale Completion Authority (`server/src/services/transaction.service.js`)**:
  - `POST /api/transactions`: Seller only, requires an accepted offer.
  - Unique index on `offerRef` guarantees idempotency and prevents duplicate completion attempts.
  - Inside a MongoDB transaction: records the `Transaction`, sets `listing.sale.status = 'sold'`, and sets `offer.status = 'completed'`.
  - Emits sale completion notifications to both buyer and seller.
- **Reservation Management**:
  - Reused existing `PATCH /api/listings/:id/status` with `action: 'reserve'` and `action: 'unreserve'`.
  - Guaranteed that reserved listings block new incoming purchase offers (409 Conflict).
- **In-App Notification Service (`server/src/services/notification.service.js`)**:
  - `GET /api/notifications`: Returns paginated notifications, filterable by `unreadOnly` and `type` (`offer`, `enquiry`, `rental`, `system`), with `unreadCount`.
  - `PATCH /api/notifications/:id/read` & `PATCH /api/notifications/read-all`.
- **Automated Integration Testing (100% Green, 117/117 Tests Passing)**:
  - `tests/enquiries.test.js` (9 tests): Creation, replies, status updates, self-enquiry 403 rejection, non-participant 403 rejection, deactivated account 403 rejection.
  - `tests/offers.test.js` (14 tests using `MongoMemoryReplSet`): All transitions, below-minimum acceptance with seller-only indicator, offering on reserved/sold/inactive 409 rejection, self-offer 403 rejection, actor turn awareness 403 rejection, buyer withdrawal, transactional acceptance closing competing offers, and concurrent accept race condition test.
  - `tests/transactions.test.js` (5 tests): Seller-only authorization, accepted offer requirement, double-submit 409 conflict rejection, setting listing `sold` and offer `completed`.
  - `tests/notifications.test.js` (5 tests): Retrieval, unread count, type filtering, single read and read-all.
  - All existing suites passing: `discovery.test.js` (19 tests), `vehicles.test.js` (15 tests), `listings.test.js` (13 tests), `auth.test.js` (21 tests), `health.test.js` (7 tests), `money.test.js` (8 tests).
- **Frontend Offer Module & Negotiation Thread**:
  - `OfferSideSheet.jsx` (UI Section 8.3): Side sheet drawer on detail page with asking price, pill amount input, quick adjustment buttons (+₹10k, +₹25k, +₹50k, match asking), optional message, previous offers with status chips, and submit button.
  - `EnquiryModal.jsx`: Modal on detail page with category selector and message textarea.
  - `NegotiationThreadPage.jsx` (UI Section 8.5): 720px column layout with pinned vehicle mini card at top, system event pills, own messages in `--primary` fill, other messages in `--tile` fill, action bar (`Accept / Counter / Decline / Mark Sold / Withdraw`), and pill composer with circular send button.
- **Frontend Notification Bell Dropdown & Notifications Page**:
  - `Header.jsx` (UI Section 8.9): 320px width, 20px radius dropdown with grouped notifications (Offers, Enquiries, System), unread accent dot, polling refetch every 30 seconds + refetch on window focus.
  - `NotificationsPage.jsx` (`/notifications`): Tabbed notifications center (`All · Unread · Offers · Enquiries · System`) with mark-all-as-read action.
- **Frontend Dashboard Widgets (UI Section 8.8)**:
  - Buyer widgets: My Active Offers and My Enquiries Sent cards with status chips and direct links to threads.
  - Owner widgets: Incoming Offers with `Accept / Counter / Decline` quick actions, Reserve / Unreserve toggle on active listings, and "Mark as Sold" completion modal.
- **Vehicle Detail Page Wiring (Adjustment 12)**:
  - Replaced Sprint 3 placeholder toasts with real `Make an offer` (opens `OfferSideSheet`) and `Send enquiry` (opens `EnquiryModal`).
  - Actions are cleanly hidden on the user's own listing and on reserved listings.
- **Postman Collection**:
  - Added 16 new requests across 4 folders: "Enquiries (Sprint 4)", "Offers & Negotiations (Sprint 4)", "Transactions & Completion (Sprint 4)", and "Notifications (Sprint 4)".

## Deferred
- Background scheduled cron job for offer auto-expiration (recorded in `expiresAt`, but background worker is deferred to Sprint 9/10 per project plan).
- Rentals II (Sprint 7): cancellation refund rules, date-change modification requests, separate handover and return tracking, rental completion transactions.
- Admin oversight of bookings and moderation workflows (Sprint 8).

## Decisions made
- Cheapest Rental Combination Rule: `calculateRentalEstimate` compares all daily, full weeks + remaining daily, and rounding up to the next full week (if cheaper than paying daily for extra days), selecting the lowest cost for the renter.
- Atomic Document-Level Write Serialization on Acceptance: To prevent race conditions between concurrent acceptances on the same listing across distributed transactions, the parent `Listing.__v` is atomically incremented inside the MongoDB transaction before re-validating date availability.
- Same-Day Turnaround Permitted: The conflict formula `existing.start < newEnd AND existing.end > newStart` intentionally allows back-to-back rentals on the same calendar day (pickup at the same time an earlier rental returns).
- Separate Reservation Action: Per Spec 7 and 18.2, offer acceptance does not automatically reserve the listing. Reservation is a separate seller action (`action: 'reserve'` / `'unreserve'`). If a seller unreserves after accepting, the listing becomes active again while the accepted offer remains accepted and previous competing offers remain closed.
- Below-Minimum Offers: Offers below `sale.minAcceptableOffer` are permitted; `isBelowMinimum: true` is displayed exclusively to the seller and stripped from buyer-facing payloads.
- Actor Turn Awareness (`awaitingResponseFrom`): Explicit turn management guarantees only the counterparty whose turn it is can respond; offerers can withdraw at any time before acceptance.
- Double-Submit Idempotency: Unique index on `Transaction.offerRef` prevents concurrent or duplicate completion submissions.
- Post-Commit Notifications: All notifications are dispatched strictly after MongoDB transactions successfully commit.

### Sprint 3 - Stage 0: Cleanups and Baseline
- **Server Test Baseline**: Confirmed 100% green baseline across 5 test suites (64/64 tests passed).
- **Public Header Navigation**: Removed "Design System" link from public navigation; registered `/design-system` route conditionally on `import.meta.env.DEV` only.
- **Announcement Bar**: Converted `AnnouncementBar` to be strictly driven by configured messages; renders `null` when no message is configured. Replaced hardcoded Sprint 0 placeholder in `DesignSystemPage.jsx`.
- **Language Switcher Audit**: Confirmed functional spec does not mandate multilingual (EN / AR) switcher; cleanly removed language switcher from `Header.jsx`.
- **Sprint 10 Checklist**: Added "remove or gate /design-system for production" to Sprint 10 checklist in `docs/PROJECT_PLAN.md`.

### Sprint 3 - Stage 1: Backend Discovery Engine & Seed Data
- **MongoDB Indexes (`server/src/models/listing.model.js` & `server/src/models/vehicle.model.js`)**:
  - `Listing`:
    - `{ moderationStatus: 1, 'sale.status': 1, 'sale.askingPrice': 1 }`: Optimizes discovery queries filtering by moderation status (`approved`), sale availability (`active`, `reserved`), and price range/sort.
    - `{ moderationStatus: 1, 'rental.status': 1, 'rental.dailyPrice': 1 }`: Optimizes discovery queries filtering by rental availability and daily rental pricing.
    - `{ moderationStatus: 1, createdAt: -1 }`: Optimizes default marketplace sorting (`recentlyListed`) on approved items.
    - `{ moderationStatus: 1, updatedAt: -1 }`: Optimizes `recentlyUpdated` sorting.
    - `{ vehicleRef: 1 }`: Accelerates vehicle joins and active-listing relational checks.
    - `{ 'ownerRef.id': 1, createdAt: -1 }`: Accelerates owner dashboard queries (`getMyListings`).
  - `Vehicle`:
    - `{ brand: 1, model: 1, variant: 1 }`: Accelerates brand and model lookups and regex keyword prefix matching.
    - `{ bodyType: 1, fuelType: 1, transmission: 1 }`: Optimizes core faceted filters for vehicle specifications.
    - `{ manufacturingYear: -1, kmDriven: 1 }`: Optimizes manufacturing year filters/sorts and `lowestKm` sorting.
    - `{ 'location.city': 1, 'location.area': 1, 'location.pincode': 1 }`: Implements location-based discovery index per Spec 17.1.
    - `{ 'ownerRef.id': 1 }`: Accelerates user/dealer owned vehicle queries.
    - `{ brand: 'text', model: 'text', variant: 'text' }`: Fallback text search index for free-text search queries.
- **Discovery Query & Faceting Engine (`server/src/services/listing.service.js`)**:
  - `GET /api/listings`:
    - Query parameters supported: `q`, `purpose`, `minPrice`, `maxPrice`, `brand`, `model`, `yearFrom`, `yearTo`, `fuel`, `transmission`, `bodyType`, `kmMin`, `kmMax`, `owners`, `sellerType`, `city`, `area`, `pincode`, `condition`, `sort`, `page`, `limit`.
    - Listing-level `$match` stage (moderationStatus, sale/rental status, price, purpose) executes **before** the `$lookup` of vehicles.
    - Safe regex escaping on `q` and text criteria to prevent regex injection or crashes.
    - Price filtering dynamically toggles between `rental.dailyPrice` (when `purpose=rent`) and `sale.askingPrice` (default/sale).
    - True **disjunctive faceted search**: each filter group's counts apply all active filters except that group's own (e.g. selecting `fuel=Petrol` keeps `Diesel` and `Electric` counts visible in the fuel facet).
    - Top 10 cities facet limitation.
    - Envelope returns `{ success: true, data: { items, total, page, pageSize, facetCounts } }`.
    - Enforced Zod query schema with `source='query'` validation; unknown sorts return 400 `ValidationError`; limit is capped at 50.
- **Vehicle Detail Endpoint (`GET /api/listings/:id`)**:
  - Public visibility: Approved listings with `active` or `reserved` status are accessible. Non-owners receive 404 for draft, inactive, sold, or removed listings. Owners retain access to their own listings across all lifecycle states.
  - Seller summary: Returns `name`, `sellerType`, and `joinedAt`. Email and mobile are included strictly when `user.contactVisibility` permits; raw user documents and sensitive fields are never exposed.
  - Similar listings: Dynamically fetches up to 6 matching listings with the same `bodyType` or `brand` within a ±25% price band, excluding the current listing.
  - Strict privacy sanitization: `sale.minAcceptableOffer`, `vehicleRef.registrationNumber`, and `vehicleRef.documents` are stripped from all public responses.
- **Seed Script (`server/scripts/seed.js`)**:
  - Idempotent and development-only (`node scripts/seed.js`). Guarded against execution in test or production environments.
  - Seeds 42 realistic vehicles and marketplace listings across 10 major Indian cities (Mumbai, Delhi, Bengaluru, Pune, Hyderabad, Chennai, Ahmedabad, Kolkata, Jaipur, Chandigarh).
  - Covers varied body types (SUV, Sedan, Hatchback, Luxury, Minivan), fuel types (Petrol, Diesel, Electric, Hybrid, CNG), and realistic price points.
  - Uses local vector SVG placeholder images (`/uploads/images/placeholders/*.svg`) committed to both server and client assets, avoiding external dependencies or hotlinking.
- **Testing (`server/tests/discovery.test.js`)**:
  - 19 automated integration tests covering all filters, sorts, pagination, disjunctive facet behavior, regex escaping, invalid sort 400 rejection, private field stripping, public reserved access, non-owner 404 enforcement, and similar listings price bands.
  - Entire backend test suite passes: **83 passed across 6 test suites**.
- **Postman Collection**:
  - Added "Discovery & Search" folder to `docs/postman/Roam.postman_collection.json` with 5 pre-configured requests (browse with filters and sorts, keyword search, disjunctive facets, city/price query, and vehicle detail).

### Sprint 3 - Stage 2: Frontend Discovery & Vehicle Detail
- **Shared Discovery Components (`client/src/components/discovery/`)**:
  - `PillSearchBar.jsx` (UI 8.1, 7.16): Large 4-segment pill search bar with keyword/make/model, budget range, city location, and circular arrow submit button. Navigates cleanly to `/browse`.
  - `DottedSpecRow.jsx` (UI 7.7): Responsive two-column specification and facet count row with dotted-leader baseline in `--text-faint`. Supports interactive keyboard selection and active styling.
  - `Carousel.jsx` (UI 7.9, 7.11): Reusable carousel featuring 56px/300 headline, eyebrow, large numerical item counter with arrow-up-right link, touch snap scrolling with peek effect, and centered ghost `<` `>` circular control buttons.
  - `FilterPanel.jsx` (UI 8.2): 24px-radius surface card with dotted-leader facet counts, purpose switch, price range inputs, body type, fuel, transmission, condition, seller type, popular cities, and active filter counter with reset button.
  - `FilterBottomSheet.jsx` (UI 8.2): Slide-up mobile bottom sheet drawer with grab handle, scroll locking, and docked "Show X vehicles" action button.
- **Pages**:
  - **Home Page (`/`, `client/src/pages/HomePage.jsx`)**:
    - Hero band with 64px/300 headline, pill search bar, and intent tabs (`Buy · Rent · Sell`).
    - "Featured vehicles" carousel wired to real database listings.
    - "Browse by type" interactive tile grid (SUV, Sedan, Hatchback, Luxury, Minivan, Electric) with 1.04 hover scaling.
    - "For rent this week" carousel (conditionally rendered only when rental listings exist).
    - Numbered 1-2-3 "How it works" section (UI 7.8 numbered list style).
    - Verified Dealer trust strip (UI 7.12, conditionally rendered when verified dealer listings exist).
    - Full-bleed black community CTA band (UI 7.13) with decorative rotated silhouette vehicle cut-outs, social-proof pill, 68px/300 typography, and dual intent buttons.
    - Global black footer with giant wordmark (UI 7.14).
  - **Browse / Search Results Page (`/browse`, `client/src/pages/BrowsePage.jsx`)**:
    - Bidirectional synchronization with URL query parameters (`useSearchParams`).
    - Top bar with large numerical result count, sort dropdown, and mobile filter trigger button.
    - Active filter dismissal pills with `x` buttons and "Reset all" action.
    - 3-column responsive vehicle grid with skeleton loaders and empty state.
    - Responsive mobile bottom sheet filter modal.
  - **Vehicle Detail Page (`/listings/:id`, `client/src/pages/VehicleDetailPage.jsx`)**:
    - Breadcrumb navigation (UI 7.3).
    - Hero gallery (UI 7.4) with vertical thumbnail rail featuring a 2px solid left-line active indicator.
    - Floating buy card (UI 7.5): 32px/300 headline, asking price with negotiable tag, description teaser with MORE scroll link, verification icons, and auth-routed action buttons.
    - Action routing: Unauthenticated guests are routed to `/login?redirect=/listings/:id`; authenticated users see an informative toast explaining that interactive offers/negotiations unlock in Sprint 4; buttons are cleanly hidden on the user's own listing and on reserved listings.
    - Fixed sticky bottom bar under 768px viewport for seamless mobile purchasing.
    - 3-tab container (UI 7.6) with 2px bottom border: Specifications, Rental Terms (if applicable), and Seller Profile.
    - Specification table with dotted-leader rows (UI 7.7) and numbered feature & history groups (UI 7.8).
    - Seller profile block displaying name, seller type, join date, and contact details strictly according to `contactVisibility`.
    - Similar vehicles carousel (UI 7.9-7.11) displaying comparable vehicles in a ±25% price range.
- **Lighthouse Accessibility Audit**:
  - **Home Page**: **95 / 100** ✓ (Target >= 90 Achieved)
  - **Browse Page**: **100 / 100** ✓ (Target >= 90 Achieved)
  - **Vehicle Detail Page**: **95 / 100** ✓ (Target >= 90 Achieved)
  - Automated runner configured at `client/run-lighthouse.cjs` (`npm run test:lighthouse`).
- **Responsive & Theme Verification**:
  - Verified across 375px (mobile), 768px (tablet), and 1280px (desktop) viewports.
  - Fully supports Light and Dark modes without hardcoded colors, respecting `--bg`, `--surface`, `--tile`, `--border`, `--text`, `--accent`, and `--dark-band-bg`.
  - Motion accessibility: respects `prefers-reduced-motion` across all components and carousels.

## Deferred
- Buyer enquiries, offer negotiations thread, and in-app notifications (Sprint 4).
- Dealer discovery feed and bulk acquisitions (Sprint 5).
- Interactive rental date-conflict booking calendar engine (Sprint 6).

## Decisions made
- Disjunctive Faceting: Implemented disjunctive faceted search so applying a filter (e.g. `fuel=Petrol`) does not collapse the options for other fuel types, providing genuine e-commerce marketplace ergonomics.
- Local Vector Placeholders: Replaced external Unsplash URLs with local, self-contained SVG placeholder artwork in `server/uploads/images/placeholders/` and `client/public/placeholders/` to guarantee offline reliability and zero broken asset links.
- Offer/Enquiry Sprint 4 Teaser: Clicking "Make an offer" or "Send enquiry" routes unauthenticated visitors to `/login?redirect=...`, while authenticated users receive a toast informing them that negotiation modules launch in Sprint 4.
- No Fabricated Data: Omitted rating stars, user reviews, and discount percentages from the detail payload and UI since the functional specification does not define review or discount models.

## Deviations from UI doc
- Multilingual Switcher (EN / AR): Omitted from header as the functional spec does not mandate multilingual localization.
- Review Ratings & Discounts: Omitted from floating buy card to adhere to Spec Section 18 / prompt rules against fabricating data.

## Open questions
- None. Sprint 3 Milestone 1 is complete.

## How to run
- **Server**:
  ```bash
  cd server
  npm.cmd test              # Run 83 unit and integration tests across 6 test suites
  npm.cmd run seed          # Seed ~42 realistic listings and sample sellers (idempotent, dev only)
  npm.cmd run dev           # Start Express API server (http://localhost:5000)
  ```
- **Client**:
  ```bash
  cd client
  npm.cmd run build         # Verify client build
  npm.cmd run test:lighthouse # Run automated Lighthouse accessibility audits
  npm.cmd run dev           # Start Vite dev server (http://localhost:5173)
  ```
- **Postman**:
  Import `docs/postman/Roam.postman_collection.json` and set `{{baseUrl}}` to `http://localhost:5000`.

---

## Sprint 7: Rental Lifecycle (Handover, Return, Modify, Cancel, History) - Completed

### What is done
- **Extended Booking State Machine (`server/src/services/bookingStateMachine.js`)**:
  - Validated transitions:
    - `confirmed -> ['active', 'cancelled', 'modification_requested']`
    - `active -> ['completed']` (only returns permitted; started rentals cannot be cancelled per spec 10.4/10.5)
    - `modification_requested -> ['confirmed', 'cancelled']`
    - `completed`, `cancelled`, `rejected` are terminal states.
    - Removed `confirmed -> completed` (handover is strictly required).
- **Atomic Preconditions & Completion Transactions (`server/src/services/booking.service.js`)**:
  - Handover (`activate`): conditional atomic update requiring `status: 'confirmed'`.
  - Return (`complete`): conditional atomic update requiring `status: 'active'`. Double completion attempts return 409 `INVALID_STATUS_TRANSITION`.
  - Atomic Transaction creation upon return:
    - `finalAmount` equals calculated rental total shown to renter excluding deposit (`baseRate + additionalCharges`).
    - `deposit` recorded separately.
    - `bookingRef` linked with partial unique index.
- **Date Modification Negotiation (`PATCH /api/bookings/:id/modification`)**:
  - Renter submits date change request (`startDate`, `endDate`, `reason`) before scheduled pickup time.
  - Recalculates pricing via `calculateRentalEstimate` and transitions booking to `modification_requested`.
  - Booking in `modification_requested` continues blocking its original dates; proposed dates do not block until approved.
  - Owner reviews request:
    - On approval: atomically serializes with `Listing.__v` increment, checks availability excluding self, recalculates estimate, updates dates & pricing, records approval in `modificationHistory`, and transitions back to `confirmed`.
    - On rejection: restores `confirmed` status with existing dates and records rejection in `modificationHistory`.
- **Cancellation Policy Cutoff Hours Enforcement**:
  - Added `cancellationCutoffHours` (default: 24h) to `listing.rental` schema, validation, and listing wizard.
  - Renters can cancel `requested` or `pending` bookings at any time.
  - For `confirmed` bookings, renter cancellation is rejected with 409 `CANCELLATION_WINDOW_EXPIRED` inside the cutoff window. Owners and admins retain cancellation authority.
- **Blocked Dates Management (`UnavailableDate`)**:
  - Rejects blocked date ranges that overlap `confirmed`, `active`, or `modification_requested` bookings with 409 `BLOCKED_DATE_CONFLICT`.
  - Owner endpoint (`GET /api/listings/:id/unavailable-dates`) returns blocked ranges with notes; public calendar endpoint omits notes.
- **Rental Earnings Summary & View Filtering (`GET /api/bookings/summary` & `GET /api/bookings?view=...`)**:
  - `GET /api/bookings/summary`: reports recorded earnings from completed rentals only (excluding deposits), operational counts (`completed`, `active`, `upcoming`, `pendingRequests`), and a 6-month real series (`recentEarnings`) for sparkline rendering.
  - `GET /api/bookings`: supports `view=upcoming|active|completed|cancelled` filtering.
- **Post-Commit In-App Notifications**:
  - Notifications emitted strictly after MongoDB transaction commits for handover, return, cancellation, modification request, approval, and rejection.
- **Frontend Dashboards & Wizard**:
  - `MyBookingsPage.jsx`:
    - Role-based tabs (Upcoming, Current, Completed, Cancelled, All).
    - Request Date Change modal with date/time pickers and reason.
    - Cancel Booking modal with dynamic cancellation policy cutoff warning.
    - Pending modification banners and modification history badges.
  - `RentalRequestsPage.jsx`:
    - Stat cards (UI 8.8): 40px/300 number, 11px muted label, SVG sparkline backed by real recent monthly data.
    - Tabs: Requests & Modifications, Active & Upcoming, Completed & History, Blocked Dates.
    - Lifecycle action buttons: Mark Handed Over, Mark Returned & Complete.
    - Review Modification modal with side-by-side comparison of current vs proposed dates and prices.
    - Full Blocked-Dates calendar manager for adding/removing unavailable ranges.
  - `ListingWizardPage.jsx`:
    - Added Cancellation Cutoff (Hours) input to rental configuration step.
- **Automated Tests**:
  - New test suite: `server/tests/bookingsLifecycle.test.js` (15/15 tests passed).
  - Existing suite verified: `server/tests/bookings.test.js` (17/17 tests passed).
  - Total test suite: 173 tests passed across 14 suites.
- **Postman Collection**:
  - Updated `docs/postman/Roam.postman_collection.json` with 8 new Sprint 7 requests.

### Deferred
- Deployment, environment configuration audits, security checklist, and production hardening (Sprint 10).

### Decisions made
- State Machine Integrity: Spec 10.4 and 10.5 strictly define that rentals conclude via return/completion after handover. Therefore, `active -> cancelled` and `confirmed -> completed` (skipping handover) are disallowed and return typed 409 errors.
- Real Sparklines Only: Per prompt rules, stat card sparklines are rendered strictly using real 6-month aggregated completion data from `GET /api/bookings/summary` without fabricated data points.
- Partial Filter Unique Indexes: Configured `{ offerRef: 1 }` and `{ bookingRef: 1 }` with `{ partialFilterExpression: { $exists: true } }` on `Transaction` so sale and rental transactions coexist cleanly.
- Uniform Availability Flag: For privacy protection, favourites, compare, recently viewed, and inspections return a generic `'unavailable'` status when a listing's owner is blocked, dealer is suspended/revoked, or listing is deactivated by admin or removed, without exposing internal administrative status.
- Listing Expiry Notice Period & Assumptions: Spec section 17.2 (lines 1104-1109) specifies:
  > "- Store listing creation and expiry dates.\n- Notify owners when a listing is approaching expiry.\n- Mark expired listings as inactive or pending renewal.\n- Allow owners to renew eligible listings."
  Because the functional specification does not specify an exact number of days for "approaching expiry", the notice period is defined as named constant `DEFAULT_LISTING_EXPIRY_NOTICE_DAYS = 7` and recorded as an explicit project assumption.
- Renewal Eligibility & No Stacking: Renewal is strictly restricted to listings that are within the 7-day expiry notice window or already expired/inactive. Attempting to renew earlier returns 409 `NOT_ELIGIBLE_FOR_RENEWAL`. Stacking is removed: renewal resets validity from `now` (`now + expiryDays`), preventing cumulative or unlimited date extensions.
- Existing Listings Safe Initialization: When the expiry cron encounters an approved listing without `expiresAt`, it assigns standard validity from `now` (`now + expiryDays`) and immediately skips deactivation/warning in that run, ensuring the first scheduled run cannot mass-deactivate existing listings.
- Non-Blocking View Counting: Per high-throughput marketplace design, `recordListingView` in `getListingById` executes asynchronously in the background without awaiting, guaranteeing that database delays or duplicate keys never affect or fail the vehicle detail response envelope. Integration tests verify view counts using active polling.
- Optional Email Specification Verification: Spec section 13.3 (lines 1004-1005) explicitly states:
  > "Notifications may be displayed within the website. Email notifications are optional. A real-time chat system is not required."
  The platform utilizes in-app notifications for all events, keeping the stack free from third-party email services per the project scope limits.
- Inspection State Machine Actor Guards: Transitions strictly enforce actor identity (buyer vs seller vs admin). Any wrong-actor attempt throws a 403 `FORBIDDEN_ACTION`. Duplicate open inspection requests per user per listing are blocked with 409 `DUPLICATE_INSPECTION_REQUEST`.

---

## Sprint 10 (Part B1): Hardening, QA & Security Verification - Completed

### What is done
- **Step 0: Verification & Route Coverage**:
  - Programmatically audited 108 routes across 18 route modules (16 public, 64 authenticated/capability, 11 ownership-checked, 17 admin-protected).
  - Cleaned up throwaway audit scripts by moving to `scripts/dev/`.
  - Audited critical boundaries: user self-elevation via profile/capability blocked, `ownerRef` and `moderationStatus` never accepted from client bodies, private fields stripped on public reads.
- **Security Hardening (Fixes 1-10)**:
  - **Fix 1: Static Route Quarantine**: Removed unrestricted root `/uploads` static mount in `server/src/app.js`. Mounted strictly `/uploads/images` with cross-origin CORP. Unauthenticated requests to `/uploads/documents/*` return 404, while authenticated owner streaming routes continue to stream to owners.
  - **Fix 2: Proxy Trust & CORS Lockdown**: Added `app.set('trust proxy', 1)` to support reverse proxies and secure cookie propagation. Locked production CORS exclusively to `config.clientOrigin`.
  - **Fix 3: Rate Limiting Fortification**: Applied strict `authLimiter` (20 requests / 15m) to sensitive routes (`/register`, `/reset-password`, `/password`). Elevated global limiter to 300 requests / 15m for shared institutional environments.
  - **Fix 4: NoSQL Injection Sanitation**: Built and mounted in-place recursive key-sanitizing middleware (`sanitizeNoSql.js`) that strips any object keys starting with `$` or containing `.` from `req.body`, `req.query`, and `req.params`. Verified blocking with `{"email": {"$gt": ""}}`.
  - **Fix 5: XSS Protection**: Confirmed zero instances of `dangerouslySetInnerHTML` in client application code. Enforced string trimming and length bounds on user-generated content.
  - **Fix 6: Password Reset Link Logging**: Guarded sensitive password reset tokens behind `LOG_RESET_LINKS=true` (`config.logResetLinks`).
  - **Fix 7: Production Error Masking**: Masked internal server 500 error messages to generic `"An internal server error occurred"` in production environments to avoid leaking database internals.
  - **Fix 8: Production Startup Safeguards**: Enforced hard process termination at startup if `JWT_SECRET` or `MONGODB_URI` are missing or default in production mode.
  - **Fix 9: Input Validation Fortification**: Restricted `addCapabilitySchema` to `['buyer', 'renter', 'seller']`. Enforced `.max(120)` on vehicle `features` items.
  - **Fix 10: Negative Authorization Test Suite (`server/tests/securityAuthorization.test.js`)**: Added 18 table-driven tests covering static access controls, private document downloads, cross-user ownership updates, blocked user access, deactivated user limits, and capability elevation.
- **End-to-End Integration Journeys (`server/tests/e2eJourneys.test.js`)**:
  - Built comprehensive multi-step integration journey suite running against isolated `roam_e2e` database across 5 core workflows (20/20 tests passed):
    1. Owner sells to Buyer (offer -> counter -> accept -> transaction complete).
    2. Owner sells to Dealer (dealer discovery -> acquisition offer -> acceptance -> confirmation).
    3. Renter books and Owner accepts (overlap rejection with 409 `RENTAL_DATE_CONFLICT`).
    4. Admin moderation (dealer document verification + listing approval).
    5. Dealer bulk inventory upload (CSV parsing, atomic validation, inventory verification).
- **Client Bundle & Performance Optimization**:
  - Implemented dynamic code-splitting via `React.lazy` and `Suspense` in `client/src/App.jsx` for all heavy administrative, dealer dashboard, and wizard routes.
  - Main bundle size reduced from 734 kB to 468.60 kB (123.77 kB gzip), eliminating chunk size warnings.
  - Gated development `/design-system` route strictly out of production builds (`import.meta.env.DEV`).
  - Opted into React Router v7 future flags (`v7_startTransition: true`, `v7_relativeSplatPath: true`).
  - Ran clean client and server linting (0 errors).
  - Verified client smoke tests across Home, Browse, Detail, Favourites, Compare, and VehicleImage fallback components.
- **Test Suite Results**:
  - All 18 test suites passed cleanly: 287 passed, 287 total.

### Deferred
- Deployment steps 8 & 9 (Docker multi-stage builds, production compose, CI/CD pipelines, production deployment runbook) deferred to Part B2 in a separate session.



### Sprint 3 - Stage 0: Cleanups and Baseline
- **Server Test Baseline**: Confirmed 100% green baseline across 5 test suites (64/64 tests passed).
- **Public Header Navigation**: Removed "Design System" link from public navigation; registered `/design-system` route conditionally on `import.meta.env.DEV` only.
- **Announcement Bar**: Converted `AnnouncementBar` to be strictly driven by configured messages; renders `null` when no message is configured. Replaced hardcoded Sprint 0 placeholder in `DesignSystemPage.jsx`.
- **Language Switcher Audit**: Confirmed functional spec does not mandate multilingual (EN / AR) switcher; cleanly removed language switcher from `Header.jsx`.
- **Sprint 10 Checklist**: Added "remove or gate /design-system for production" to Sprint 10 checklist in `docs/PROJECT_PLAN.md`.

### Sprint 3 - Stage 1: Backend Discovery Engine & Seed Data
- **MongoDB Indexes (`server/src/models/listing.model.js` & `server/src/models/vehicle.model.js`)**:
  - `Listing`:
    - `{ moderationStatus: 1, 'sale.status': 1, 'sale.askingPrice': 1 }`: Optimizes discovery queries filtering by moderation status (`approved`), sale availability (`active`, `reserved`), and price range/sort.
    - `{ moderationStatus: 1, 'rental.status': 1, 'rental.dailyPrice': 1 }`: Optimizes discovery queries filtering by rental availability and daily rental pricing.
    - `{ moderationStatus: 1, createdAt: -1 }`: Optimizes default marketplace sorting (`recentlyListed`) on approved items.
    - `{ moderationStatus: 1, updatedAt: -1 }`: Optimizes `recentlyUpdated` sorting.
    - `{ vehicleRef: 1 }`: Accelerates vehicle joins and active-listing relational checks.
    - `{ 'ownerRef.id': 1, createdAt: -1 }`: Accelerates owner dashboard queries (`getMyListings`).
  - `Vehicle`:
    - `{ brand: 1, model: 1, variant: 1 }`: Accelerates brand and model lookups and regex keyword prefix matching.
    - `{ bodyType: 1, fuelType: 1, transmission: 1 }`: Optimizes core faceted filters for vehicle specifications.
    - `{ manufacturingYear: -1, kmDriven: 1 }`: Optimizes manufacturing year filters/sorts and `lowestKm` sorting.
    - `{ 'location.city': 1, 'location.area': 1, 'location.pincode': 1 }`: Implements location-based discovery index per Spec 17.1.
    - `{ 'ownerRef.id': 1 }`: Accelerates user/dealer owned vehicle queries.
    - `{ brand: 'text', model: 'text', variant: 'text' }`: Fallback text search index for free-text search queries.
- **Discovery Query & Faceting Engine (`server/src/services/listing.service.js`)**:
  - `GET /api/listings`:
    - Query parameters supported: `q`, `purpose`, `minPrice`, `maxPrice`, `brand`, `model`, `yearFrom`, `yearTo`, `fuel`, `transmission`, `bodyType`, `kmMin`, `kmMax`, `owners`, `sellerType`, `city`, `area`, `pincode`, `condition`, `sort`, `page`, `limit`.
    - Listing-level `$match` stage (moderationStatus, sale/rental status, price, purpose) executes **before** the `$lookup` of vehicles.
    - Safe regex escaping on `q` and text criteria to prevent regex injection or crashes.
    - Price filtering dynamically toggles between `rental.dailyPrice` (when `purpose=rent`) and `sale.askingPrice` (default/sale).
    - True **disjunctive faceted search**: each filter group's counts apply all active filters except that group's own (e.g. selecting `fuel=Petrol` keeps `Diesel` and `Electric` counts visible in the fuel facet).
    - Top 10 cities facet limitation.
    - Envelope returns `{ success: true, data: { items, total, page, pageSize, facetCounts } }`.
    - Enforced Zod query schema with `source='query'` validation; unknown sorts return 400 `ValidationError`; limit is capped at 50.
- **Vehicle Detail Endpoint (`GET /api/listings/:id`)**:
  - Public visibility: Approved listings with `active` or `reserved` status are accessible. Non-owners receive 404 for draft, inactive, sold, or removed listings. Owners retain access to their own listings across all lifecycle states.
  - Seller summary: Returns `name`, `sellerType`, and `joinedAt`. Email and mobile are included strictly when `user.contactVisibility` permits; raw user documents and sensitive fields are never exposed.
  - Similar listings: Dynamically fetches up to 6 matching listings with the same `bodyType` or `brand` within a ±25% price band, excluding the current listing.
  - Strict privacy sanitization: `sale.minAcceptableOffer`, `vehicleRef.registrationNumber`, and `vehicleRef.documents` are stripped from all public responses.
- **Seed Script (`server/scripts/seed.js`)**:
  - Idempotent and development-only (`node scripts/seed.js`). Guarded against execution in test or production environments.
  - Seeds 42 realistic vehicles and marketplace listings across 10 major Indian cities (Mumbai, Delhi, Bengaluru, Pune, Hyderabad, Chennai, Ahmedabad, Kolkata, Jaipur, Chandigarh).
  - Covers varied body types (SUV, Sedan, Hatchback, Luxury, Minivan), fuel types (Petrol, Diesel, Electric, Hybrid, CNG), and realistic price points.
  - Uses local vector SVG placeholder images (`/uploads/images/placeholders/*.svg`) committed to both server and client assets, avoiding external dependencies or hotlinking.
- **Testing (`server/tests/discovery.test.js`)**:
  - 19 automated integration tests covering all filters, sorts, pagination, disjunctive facet behavior, regex escaping, invalid sort 400 rejection, private field stripping, public reserved access, non-owner 404 enforcement, and similar listings price bands.
  - Entire backend test suite passes: **83 passed across 6 test suites**.
- **Postman Collection**:
  - Added "Discovery & Search" folder to `docs/postman/Roam.postman_collection.json` with 5 pre-configured requests (browse with filters and sorts, keyword search, disjunctive facets, city/price query, and vehicle detail).
- **Backend Vehicle Model (`server/src/models/vehicle.model.js`)**:
  - Implemented schema per Spec 4.1 supporting: `brand`, `model`, `variant`, `bodyType` (SUV, Sedan, Hatchback, Truck, Luxury, Coupe, Convertible, Minivan, Wagon, Van, Other), `manufacturingYear`, `registrationYear`, `registrationNumber` (private by default), `fuelType`, `transmission`, `kmDriven`, `previousOwners`, `condition`, `colour`, `seatingCapacity`, `engineOrBattery`, `location { country, state, city, area, pincode, pickupLocation }`, `features[]`, `knownDefects`, `serviceHistory`, `accidentHistory`, `insuranceInfo`, `pollutionCertInfo`, `documents[]` (private), `images[]` (`{ url, isCover, order, caption }`), and `ownerRef { type: 'user' | 'dealer', id }`.
  - Methods: `toPublicObject()` strips `registrationNumber` and `documents`; `toOwnerObject()` provides full owner/admin view.
- **Backend Listing Model (`server/src/models/listing.model.js`)**:
  - Implemented schema with independent statuses and multi-purpose support: `vehicleRef`, `ownerRef { type, id }`, `purpose` (`sale`, `rent`, `both`), `moderationStatus` (`draft`, `pending_review`, `approved`, `rejected`, `removed`), `expiresAt`, `statusHistory[]`.
  - `sale` subdocument: `enabled`, `status` (`active`, `reserved`, `inactive`, `sold`), `askingPrice` (integer minor units, paise), `negotiable`, `minAcceptableOffer` (private, strictly omitted from public views), `description`, `conditions`.
  - Full `rental` subdocument per Spec 4.4 and prompt instruction 3: `dailyPrice`, `weeklyPrice`, `otherPeriods`, `securityDeposit`, `minDays`, `maxDays`, `availableFrom`, `availableTo`, `pickupLocation`, `returnLocation`, `driverIncluded`, `mileageLimit`, `fuelPolicy`, `cancellationPolicy`, `conditions`, `status` (`active`, `inactive`).
  - `toPublicObject()` strictly removes `sale.minAcceptableOffer` and sanitizes nested vehicle details.
- **State Machine Module (`server/src/services/listingStateMachine.js`)**:
  - Explicit transition maps for `moderationStatus`, `sale.status`, and `rental.status`.
  - Invalid transitions throw `ConflictError` (HTTP 409) with typed error code `'INVALID_STATUS_TRANSITION'`.
  - Sold listings are terminal (cannot be reactivated).
  - Handles `AUTO_APPROVE_LISTINGS` flag (transitions `draft` -> `pending_review` -> `approved`), activating `sale.status` only if purpose includes sale, and `rental.status` only if purpose includes rent.
- **Pluggable Storage Architecture & File Validation (`server/src/services/storage/`)**:
  - `StorageProvider` interface with `LocalStorageProvider` for images and documents.
  - MIME type and file magic-byte signature validation (detects genuine JPEG, PNG, WebP, PDF headers).
  - File size limits: 5MB for images, 10MB for documents.
  - Public static image serving at `/uploads/images/*`.
  - Authenticated owner-only private document download proxy at `GET /api/vehicles/:id/documents/:docId/download` (enforces 403 Forbidden for non-owners).
- **Ownership Middleware (`server/src/middleware/ownership.js`)**:
  - Factory function `requireOwnership(Model, paramName)` supporting polymorphic `ownerRef: { type: 'user' | 'dealer', id }` (Sprint 5 ready without rewrite).
  - Platform administrators bypass ownership checks.
- **Money Utility (`server/src/utils/money.js` & `client/src/utils/money.js`)**:
  - Round-safe conversions: `rupeesToPaise`, `paiseToRupees`, `formatRupees` (e.g. `₹1,50,000`).
  - Unit tested in `server/tests/money.test.js`.
- **Validation Rules (`server/src/validations/`)**:
  - Zod schemas enforcing: `registrationYear >= manufacturingYear`, `manufacturingYear <= currentYear + 1`, `kmDriven >= 0`, `askingPrice >= 0` (integer paise), `minAcceptableOffer <= askingPrice`.
- **REST Endpoints (`server/src/routes/`)**:
  - `/api/vehicles`: CRUD endpoints, image management (`POST /images`, `DELETE /images/:imageId`, `PATCH /images/reorder`, `PATCH /images/:imageId/cover`), private documents (`POST /documents`, `GET /documents/:docId/download`, `DELETE /documents/:docId`).
  - Deleting a vehicle is blocked with 409 Conflict (`ACTIVE_LISTINGS_EXIST`) if any non-removed listing exists.
  - `/api/listings`: `GET /api/listings/my` declared before `/:id`. Public `GET /api/listings` only returns approved + active listings and strips private fields.
  - `PATCH /api/listings/:id/status`: handles `activate`, `deactivate`, `reserve`, `unreserve`, `sold`, and `moderation` actions.
  - `DELETE /api/listings/:id`: soft delete setting `moderationStatus: 'removed'`, `sale.status: 'inactive'`, and logging status history.
- **Automated Tests**:
  - 64 passing tests across 5 test suites (`vehicles.test.js`, `listings.test.js`, `auth.test.js`, `money.test.js`, `health.test.js`).
  - Covers: ownership enforcement (403), year and price validations (400), state machine transitions (valid and 409 invalid), private field stripping (`minAcceptableOffer`, `registrationNumber`, `documents`), and media upload security.
- **Postman Collection**:
  - Updated unified collection at `docs/postman/Roam.postman_collection.json` containing complete Sprints 0-2 folders (Health, Auth, Users, Vehicles, Listings).
- **Frontend Vehicle Components & Dashboard Pages**:
  - `VehicleCard.jsx` (UI 7.10): 24px radius, `--tile` background, 270x300 image area, 1.04 hover scale, metadata line (`km · Fuel · Transmission`), and status/purpose chips.
  - `PhotoUploader.jsx` (UI 8.7): Dashed 24px-radius drop zone, reorderable thumbnails, 2px solid left-line indicator for cover photo, delete and cover controls.
  - `ListingWizardPage.jsx` (UI 8.7, 21.3): 5-step stepper (**Basics -> Specs & Condition -> Photos -> Pricing & Type -> Review**), autosave to `localStorage`, pinned live preview vehicle card, conditional sale/rental fields.
  - `MyVehiclesPage.jsx` (UI 8.8): Grid of owned vehicles with spec indicators, skeletons, empty state, and link to create listing.
  - `MyListingsPage.jsx` (UI 8.8): Listing cards with status chips (`active`, `reserved`, `inactive`, `sold`, `draft`), action buttons (`Activate/Deactivate`, `Reserve/Unreserve`, `Mark Sold`, `Remove`), skeletons, empty state, and confirmation modals.
  - Clears wizard draft from `localStorage` on logout (`AuthContext.jsx`).

## Deferred
- Public marketplace discovery, search filters, and browse results page (Sprint 3).
- Buyer enquiries, offer negotiations, and in-app notifications (Sprint 4).
- Dealer acquisition and inventory feeds (Sprint 5).
- Rental availability calendars and date-conflict overlapping engine (Sprint 6).

## Decisions made
- Minor Units Storage: All monetary amounts (asking price, private minimum offer, rental daily rates, security deposits) are stored as integer paise in the database to prevent floating-point rounding errors.
- Soft Delete for Listings: `DELETE /api/listings/:id` transitions `moderationStatus` to `'removed'` and appends an entry to `statusHistory` for auditability rather than purging the document from the database.
- Vehicle Deletion Guard: Vehicles cannot be deleted while associated with any non-removed listing, throwing 409 Conflict (`ACTIVE_LISTINGS_EXIST`).
- Polymorphic Ownership: `ownerRef { type: 'user' | 'dealer', id }` is enforced via generic `requireOwnership` middleware so Sprint 5 dealer features can integrate seamlessly.
- State Machine Rejections: Invalid transitions throw `ConflictError` (HTTP 409) with `INVALID_STATUS_TRANSITION`.

## Open questions
- None blocking Sprint 3.

## How to run
- **Server**:
  ```bash
  cd server
  npm.cmd test              # Run 83 unit and integration tests across 6 test suites
  npm.cmd run seed          # Seed ~42 realistic listings and sample sellers (idempotent, dev only)
  npm.cmd run dev           # Start Express API server (http://localhost:5000)
  ```
- **Client**:
  ```bash
  cd client
  npm.cmd run build         # Verify client build
  npm.cmd run dev           # Start Vite dev server (http://localhost:5173)
  ```
- **Postman**:
  Import `docs/postman/Roam.postman_collection.json` and set `{{baseUrl}}` to `http://localhost:5000`.

---

## Sprint 7: Rental Lifecycle (Handover, Return, Modify, Cancel, History) - Completed

### What is done
- **Extended Booking State Machine (`server/src/services/bookingStateMachine.js`)**:
  - Validated transitions:
    - `confirmed -> ['active', 'cancelled', 'modification_requested']`
    - `active -> ['completed']` (only returns permitted; started rentals cannot be cancelled per spec 10.4/10.5)
    - `modification_requested -> ['confirmed', 'cancelled']`
    - `completed`, `cancelled`, `rejected` are terminal states.
    - Removed `confirmed -> completed` (handover is strictly required).
- **Atomic Preconditions & Completion Transactions (`server/src/services/booking.service.js`)**:
  - Handover (`activate`): conditional atomic update requiring `status: 'confirmed'`.
  - Return (`complete`): conditional atomic update requiring `status: 'active'`. Double completion attempts return 409 `INVALID_STATUS_TRANSITION`.
  - Atomic Transaction creation upon return:
    - `finalAmount` equals calculated rental total shown to renter excluding deposit (`baseRate + additionalCharges`).
    - `deposit` recorded separately.
    - `bookingRef` linked with partial unique index.
- **Date Modification Negotiation (`PATCH /api/bookings/:id/modification`)**:
  - Renter submits date change request (`startDate`, `endDate`, `reason`) before scheduled pickup time.
  - Recalculates pricing via `calculateRentalEstimate` and transitions booking to `modification_requested`.
  - Booking in `modification_requested` continues blocking its original dates; proposed dates do not block until approved.
  - Owner reviews request:
    - On approval: atomically serializes with `Listing.__v` increment, checks availability excluding self, recalculates estimate, updates dates & pricing, records approval in `modificationHistory`, and transitions back to `confirmed`.
    - On rejection: restores `confirmed` status with existing dates and records rejection in `modificationHistory`.
- **Cancellation Policy Cutoff Hours Enforcement**:
  - Added `cancellationCutoffHours` (default: 24h) to `listing.rental` schema, validation, and listing wizard.
  - Renters can cancel `requested` or `pending` bookings at any time.
  - For `confirmed` bookings, renter cancellation is rejected with 409 `CANCELLATION_WINDOW_EXPIRED` inside the cutoff window. Owners and admins retain cancellation authority.
- **Blocked Dates Management (`UnavailableDate`)**:
  - Rejects blocked date ranges that overlap `confirmed`, `active`, or `modification_requested` bookings with 409 `BLOCKED_DATE_CONFLICT`.
  - Owner endpoint (`GET /api/listings/:id/unavailable-dates`) returns blocked ranges with notes; public calendar endpoint omits notes.
- **Rental Earnings Summary & View Filtering (`GET /api/bookings/summary` & `GET /api/bookings?view=...`)**:
  - `GET /api/bookings/summary`: reports recorded earnings from completed rentals only (excluding deposits), operational counts (`completed`, `active`, `upcoming`, `pendingRequests`), and a 6-month real series (`recentEarnings`) for sparkline rendering.
  - `GET /api/bookings`: supports `view=upcoming|active|completed|cancelled` filtering.
- **Post-Commit In-App Notifications**:
  - Notifications emitted strictly after MongoDB transaction commits for handover, return, cancellation, modification request, approval, and rejection.
- **Frontend Dashboards & Wizard**:
  - `MyBookingsPage.jsx`:
    - Role-based tabs (Upcoming, Current, Completed, Cancelled, All).
    - Request Date Change modal with date/time pickers and reason.
    - Cancel Booking modal with dynamic cancellation policy cutoff warning.
    - Pending modification banners and modification history badges.
  - `RentalRequestsPage.jsx`:
    - Stat cards (UI 8.8): 40px/300 number, 11px muted label, SVG sparkline backed by real recent monthly data.
    - Tabs: Requests & Modifications, Active & Upcoming, Completed & History, Blocked Dates.
    - Lifecycle action buttons: Mark Handed Over, Mark Returned & Complete.
    - Review Modification modal with side-by-side comparison of current vs proposed dates and prices.
    - Full Blocked-Dates calendar manager for adding/removing unavailable ranges.
  - `ListingWizardPage.jsx`:
    - Added Cancellation Cutoff (Hours) input to rental configuration step.
- **Automated Tests**:
  - New test suite: `server/tests/bookingsLifecycle.test.js` (15/15 tests passed).
  - Existing suite verified: `server/tests/bookings.test.js` (17/17 tests passed).
  - Total test suite: 173 tests passed across 14 suites.
- **Postman Collection**:
  - Updated `docs/postman/Roam.postman_collection.json` with 8 new Sprint 7 requests.

### Deferred
- Deployment, environment configuration audits, security checklist, and production hardening (Sprint 10).

### Decisions made
- State Machine Integrity: Spec 10.4 and 10.5 strictly define that rentals conclude via return/completion after handover. Therefore, `active -> cancelled` and `confirmed -> completed` (skipping handover) are disallowed and return typed 409 errors.
- Real Sparklines Only: Per prompt rules, stat card sparklines are rendered strictly using real 6-month aggregated completion data from `GET /api/bookings/summary` without fabricated data points.
- Partial Filter Unique Indexes: Configured `{ offerRef: 1 }` and `{ bookingRef: 1 }` with `{ partialFilterExpression: { $exists: true } }` on `Transaction` so sale and rental transactions coexist cleanly.
- Uniform Availability Flag: For privacy protection, favourites, compare, recently viewed, and inspections return a generic `'unavailable'` status when a listing's owner is blocked, dealer is suspended/revoked, or listing is deactivated by admin or removed, without exposing internal administrative status.
- Listing Expiry Notice Period & Assumptions: Spec section 17.2 (lines 1104-1109) specifies:
  > "- Store listing creation and expiry dates.\n- Notify owners when a listing is approaching expiry.\n- Mark expired listings as inactive or pending renewal.\n- Allow owners to renew eligible listings."
  Because the functional specification does not specify an exact number of days for "approaching expiry", the notice period is defined as named constant `DEFAULT_LISTING_EXPIRY_NOTICE_DAYS = 7` and recorded as an explicit project assumption.
- Renewal Eligibility & No Stacking: Renewal is strictly restricted to listings that are within the 7-day expiry notice window or already expired/inactive. Attempting to renew earlier returns 409 `NOT_ELIGIBLE_FOR_RENEWAL`. Stacking is removed: renewal resets validity from `now` (`now + expiryDays`), preventing cumulative or unlimited date extensions.
- Existing Listings Safe Initialization: When the expiry cron encounters an approved listing without `expiresAt`, it assigns standard validity from `now` (`now + expiryDays`) and immediately skips deactivation/warning in that run, ensuring the first scheduled run cannot mass-deactivate existing listings.
- Non-Blocking View Counting: Per high-throughput marketplace design, `recordListingView` in `getListingById` executes asynchronously in the background without awaiting, guaranteeing that database delays or duplicate keys never affect or fail the vehicle detail response envelope. Integration tests verify view counts using active polling.
- Optional Email Specification Verification: Spec section 13.3 (lines 1004-1005) explicitly states:
  > "Notifications may be displayed within the website. Email notifications are optional. A real-time chat system is not required."
  The platform utilizes in-app notifications for all events, keeping the stack free from third-party email services per the project scope limits.
- Inspection State Machine Actor Guards: Transitions strictly enforce actor identity (buyer vs seller vs admin). Any wrong-actor attempt throws a 403 `FORBIDDEN_ACTION`. Duplicate open inspection requests per user per listing are blocked with 409 `DUPLICATE_INSPECTION_REQUEST`.

---

## Sprint 10 (Part B1): Hardening, QA & Security Verification - Completed

### What is done
- **Step 0: Verification & Route Coverage**:
  - Programmatically audited 108 routes across 18 route modules (16 public, 64 authenticated/capability, 11 ownership-checked, 17 admin-protected).
  - Cleaned up throwaway audit scripts by moving to `scripts/dev/`.
  - Audited critical boundaries: user self-elevation via profile/capability blocked, `ownerRef` and `moderationStatus` never accepted from client bodies, private fields stripped on public reads.
- **Security Hardening (Fixes 1-10)**:
  - **Fix 1: Static Route Quarantine**: Removed unrestricted root `/uploads` static mount in `server/src/app.js`. Mounted strictly `/uploads/images` with cross-origin CORP. Unauthenticated requests to `/uploads/documents/*` return 404, while authenticated owner streaming routes continue to stream to owners.
  - **Fix 2: Proxy Trust & CORS Lockdown**: Added `app.set('trust proxy', 1)` to support reverse proxies and secure cookie propagation. Locked production CORS exclusively to `config.clientOrigin`.
  - **Fix 3: Rate Limiting Fortification**: Applied strict `authLimiter` (20 requests / 15m) to sensitive routes (`/register`, `/reset-password`, `/password`). Elevated global limiter to 300 requests / 15m for shared institutional environments.
  - **Fix 4: NoSQL Injection Sanitation**: Built and mounted in-place recursive key-sanitizing middleware (`sanitizeNoSql.js`) that strips any object keys starting with `$` or containing `.` from `req.body`, `req.query`, and `req.params`. Verified blocking with `{"email": {"$gt": ""}}`.
  - **Fix 5: XSS Protection**: Confirmed zero instances of `dangerouslySetInnerHTML` in client application code. Enforced string trimming and length bounds on user-generated content.
  - **Fix 6: Password Reset Link Logging**: Guarded sensitive password reset tokens behind `LOG_RESET_LINKS=true` (`config.logResetLinks`).
  - **Fix 7: Production Error Masking**: Masked internal server 500 error messages to generic `"An internal server error occurred"` in production environments to avoid leaking database internals.
  - **Fix 8: Production Startup Safeguards**: Enforced hard process termination at startup if `JWT_SECRET` or `MONGODB_URI` are missing or default in production mode.
  - **Fix 9: Input Validation Fortification**: Restricted `addCapabilitySchema` to `['buyer', 'renter', 'seller']`. Enforced `.max(120)` on vehicle `features` items.
  - **Fix 10: Negative Authorization Test Suite (`server/tests/securityAuthorization.test.js`)**: Added 18 table-driven tests covering static access controls, private document downloads, cross-user ownership updates, blocked user access, deactivated user limits, and capability elevation.
- **End-to-End Integration Journeys (`server/tests/e2eJourneys.test.js`)**:
  - Built comprehensive multi-step integration journey suite running against isolated `roam_e2e` database across 5 core workflows (20/20 tests passed):
    1. Owner sells to Buyer (offer -> counter -> accept -> transaction complete).
    2. Owner sells to Dealer (dealer discovery -> acquisition offer -> acceptance -> confirmation).
    3. Renter books and Owner accepts (overlap rejection with 409 `RENTAL_DATE_CONFLICT`).
    4. Admin moderation (dealer document verification + listing approval).
    5. Dealer bulk inventory upload (CSV parsing, atomic validation, inventory verification).
- **Client Bundle & Performance Optimization**:
  - Implemented dynamic code-splitting via `React.lazy` and `Suspense` in `client/src/App.jsx` for all heavy administrative, dealer dashboard, and wizard routes.
  - Main bundle size reduced from 734 kB to 468.60 kB (123.77 kB gzip), eliminating chunk size warnings.
  - Gated development `/design-system` route strictly out of production builds (`import.meta.env.DEV`).
  - Opted into React Router v7 future flags (`v7_startTransition: true`, `v7_relativeSplatPath: true`).
  - Ran clean client and server linting (0 errors).
  - Verified client smoke tests across Home, Browse, Detail, Favourites, Compare, and VehicleImage fallback components.
- **Test Suite Results**:
  - All 18 test suites passed cleanly: 287 passed, 287 total.

### Deferred
- Deployment steps 8 & 9 (Docker multi-stage builds, production compose, CI/CD pipelines, production deployment runbook) deferred to Part B2 in a separate session.


