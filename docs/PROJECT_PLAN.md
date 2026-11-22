# Roam: Project Plan (reference for the agent)

*Save this as `docs/PROJECT_PLAN.md`. It holds the sprint order, stack, rules and per-sprint scope. The copy-paste prompts are in the separate prompts document.*

## 1. Repo layout

```
roam/
  CLAUDE.md or AGENTS.md      (master prompt)
  docs/
    functional-spec.md        (what to build, business rules)
    ui-design.md              (how it looks)
    PROJECT_PLAN.md           (this file)
    PROGRESS.md               (updated at the end of every sprint)
  client/                     (React + Vite + Tailwind)
  server/                     (Node + Express + Mongoose)
```

## 2. Approach

The platform is built as **vertical slices**: every sprint delivers something that works end to end (database, API, UI, tests) and can be demoed. Order of work:

1. Foundation and design first (tokens, layout, auth, roles).
2. Supply before demand (listings before search, offers and bookings).
3. Sale workflow before rentals (proves notifications, status history and ownership checks).
4. Dealers before rentals (owner-to-dealer purchase is a core capability in the spec).
5. Rentals take two sprints because date-conflict logic is the hardest rule set.
6. Admin and extras late, but the data fields exist early (`moderationStatus` is on the listing from Sprint 2 and auto-approves until Sprint 8).
7. Hardening and deployment last.

**Sprint routine**: 1-week sprints (use 2 weeks if part-time). Plan the stories, build, demo, then a short retrospective. Sprint 0 is a design sprint. Tag each sprint (v0.1, v0.2, ...). Dashboards are built incrementally in each sprint, not at the end.

## 3. Roadmap

| Sprint | Theme | Demo at the end |
| --- | --- | --- |
| 0 | Design sprint and foundation | Design system page, theme toggle, header/footer, API connected to MongoDB |
| 1 | Auth, profiles, roles | Register, log in, edit profile, role-based navigation |
| 2 | Vehicles, listings, media | Owner creates a listing through the wizard with photos |
| 3 | Discovery | **Milestone 1:** browse, search and view a public marketplace |
| 4 | Enquiries, offers, reservation, notifications | **Milestone 2:** full individual buyer-to-seller flow |
| 5 | Dealers and owner-to-dealer purchases | Dealer discovers, offers, acquires |
| 6 | Rentals I: listings, calendar, booking requests | Renter requests, owner accepts, overlaps blocked |
| 7 | Rentals II: cancel, modify, handover, return, history | **Milestone 3:** complete rental lifecycle |
| 8 | Admin, moderation, reports, analytics | Admin controls the platform |
| 9 | Favourites, compare, recently viewed, inspections, expiry, stats | Feature-complete product |
| 10 | Hardening, testing, deployment | Live app, Postman collection, docs |

**Cut line if time is short**: keep Sprints 0 to 8 and 10. In Sprint 9, ship favourites and compare first; inspections, expiry and statistics are optional modules.

## 4. Stack and architecture

| Area | Choice |
| --- | --- |
| Frontend | React 18 + Vite, React Router, TanStack Query, React Hook Form + Zod, Lucide icons |
| Styling | Tailwind CSS wired to the CSS variable tokens in UI doc section 13. Urbanist font. No hard-coded colours. |
| Backend | Node 20, Express, Mongoose, Zod, bcrypt, helmet, express-rate-limit, multer |
| Auth | JWT in an httpOnly SameSite cookie; role and capability middleware |
| Database | MongoDB Atlas (replica set, so transactions work) |
| Files | Cloudinary or similar behind a storage interface |
| Testing | Vitest/Jest + Supertest, Postman collection, optional Playwright |
| Deployment | Frontend on Vercel/Netlify, API on Render/Railway, database on Atlas |

**Rules**

- Layers: routes, controllers, services, models. Business rules live in services only.
- Status changes go through state-machine modules for listing, offer and booking. Invalid transitions throw typed errors.
- Middleware: `requireAuth`, `requireCapability`, `requireOwnership`, `requireActiveAccount`, `requireVerifiedDealer`. Every restricted action is checked on the server (spec 18.4).
- Response envelope: `{ success, data }` or `{ success: false, error: { code, message, fields? } }`.
- Money in integer minor units; currency configurable (INR default). Dates in UTC.
- History is kept for offers, bookings and listing status changes.

**Key data-model decisions**

- `User.capabilities`: `buyer`, `renter`, `seller`, `dealer`, `admin`. One account can hold several.
- `Listing` has three independent statuses: `moderationStatus` (draft, pending\_review, approved, rejected, removed), `sale.status` (active, reserved, inactive, sold), `rental.status` (active, inactive).
- `Offer` has an embedded `history[]`. Accepting and completing are separate actions.
- `Booking` blocks dates only when `confirmed` or `active`. Conflict test: `existing.start < newEnd AND existing.end > newStart`.
- `UnavailableDate` belongs to a rental listing.
- `Transaction` records accepted offers, sale completion and rental completion. It is an activity record, not proof of ownership transfer.

**Out of scope** (spec section 24): online payments, real-time chat, GPS tracking, automated document verification, AI valuation, third-party integrations.

## 5. Definition of Done (every story)

- Server-side validation and authorisation in place; client-side validation with inline messages.
- Supertest tests: success, validation failure, unauthenticated, forbidden.
- UI matches ui-design.md in **light and dark** themes and works at 375, 768 and 1280px.
- Loading, empty and error states exist.
- Endpoint added to the Postman collection.
- Merged by pull request. Branches: `main`, `develop`, `feature/<sprint>-<story>`.

## 6. Sprint scope

### Sprint 0: Design sprint and foundation

- **Spec/UI refs**: UI 1 to 5, 7.1, 7.2, 7.14 to 7.18, 13, 15; spec 21.
- **Design activities (manual)**: read the UI doc; pick the first 10 screens (Home, Browse, Detail, Auth, Listing wizard, four dashboards); make low-fi wireframes for mobile and desktop; review against the Do/Don't list (UI 14); confirm logo glyph.
- **Build**: monorepo, linting, env handling, DB connection, health endpoint, error middleware; token CSS for both themes; no-flash theme script and toggle; UI primitives (Button, Input, Select, Chip, StatusChip, Badge, Tabs, Skeleton, EmptyState, Modal, Toast); AnnouncementBar, Header, mobile drawer, Footer with giant wordmark; hidden `/design-system` page.
- **Done when**: the toggle persists without flashing, all components render in both themes, header/footer match the reference at three breakpoints, API connects to Atlas.

### Sprint 1: Identity, roles, profiles

- **Spec/UI refs**: spec 2, 3, 18.4, 22.3; UI 8.10, 7.2, 8.8.
- **Stories**: register with duplicate email/mobile checks; login, logout, forgot and reset password; onboarding role tiles; profile edit, password change, photo, contact visibility, deactivation request and status; shared guard blocking deactivated users from creating things; dashboard shell; seeded admin account.
- **Done when**: protected routes return users to where they were; seller endpoints return 403 without the capability (tested); passwords hashed; auth screens match the split-screen design.

### Sprint 2: Vehicles, listings, media

- **Spec/UI refs**: spec 4, 17.4, 18.1, 18.5, 21.3; UI 8.7, 7.10, 8.8.
- **Stories**: vehicle model (all spec 4.1 fields); listing with independent statuses and purpose (sale, rent, both); sale pricing with private minimum offer; wizard (Basics, Specs, Photos, Pricing and type, Review) with live preview card; photo upload with reorder and cover; draft, submit, edit, activate/deactivate, mark sold, remove; auto-approve flag until Sprint 8; My Vehicles and My Listings pages.
- **Done when**: ownership enforced, validation matches 18.5, private documents unreachable publicly, wizard works on mobile.

### Sprint 3: Discovery and detail page (Milestone 1)

- **Spec/UI refs**: spec 5, 6, 17.1; UI 8.1, 8.2, 8.3, 7.3 to 7.13, 9, 10.
- **Stories**: listings search with every filter and sort, pagination, total count, facet counts; indexes; Home; Browse with filter panel, URL-synced filters, clear all, empty state; Detail page with gallery, floating card, tabs, spec table, features, similar vehicles; seed data (about 40 listings).
- **Done when**: filters and sorts tested; URL reproduces a search; detail page matches the reference in both themes; mobile uses sticky bottom bar and filter bottom sheet.

### Sprint 4: Sale workflow (Milestone 2)

- **Spec/UI refs**: spec 7, 13, 18.2, 22.4; UI 8.3 offer module, 8.5, 8.8, 8.9.
- **Stories**: enquiries with replies and resolve/close; offers with history, withdraw, accept, reject, counter, expire; reserve and unreserve; completion that records the final amount and marks sold; in-app notifications; offer module, negotiation thread, bell dropdown, notifications page; buyer and owner dashboard widgets.
- **Rules**: reserved, sold or inactive listings reject new offers; accepting closes other active offers in one transaction; accepting never marks the vehicle sold.
- **Done when**: offer, counter, accept, record amount, complete works end to end; invalid transitions return typed errors; concurrent accepts cannot both succeed.

### Sprint 5: Dealers

- **Spec/UI refs**: spec 8, 9, 11.4, 18.1, 18.4; UI 8.8 dealer, 8.7 bulk upload, 7.12.
- **Stories**: dealer registration and documents; minimal admin approve/reject/request changes; verification-gated publishing; dealer directory and profile; inventory table with bulk actions and CSV upload with row-level errors; Discover owner listings feed; dealer offers using the offer module; owner offer comparison; acquisition tracking (accepted, pending, acquired, cancelled); dealer dashboard.
- **Done when**: unverified dealers are blocked on the server; a verified dealer completes an acquisition; the owner's listing leaves public search afterwards.

### Sprint 6: Rentals I

- **Spec/UI refs**: spec 4.4, 10.1 to 10.5, 18.3; UI 8.3 calendar, 8.6, 7.5.
- **Stories**: rental fields in wizard; independent sale and rental status; rental filters including date availability; availability calendar; cost estimate with deposit shown separately; three-step booking request; booking statuses and overlap rule; owner/dealer accept or reject with conflict re-check; Buy | Rent switch.
- **Done when**: two overlapping requests can both be pending but only one confirmed; tests cover same-day turnaround, min/max duration, blocked dates.

### Sprint 7: Rentals II (Milestone 3)

- **Spec/UI refs**: spec 10.3, 10.4, 10.6, 11.1 to 11.3, 18.3.
- **Stories**: cancellation per policy (releases dates); date-change requests with approval, conflict recheck and estimate recalculation; handover and return tracked separately; blocked-dates manager; rental history and recorded earnings; rental completion transactions; dashboards for renter, owner, dealer.
- **Done when**: every transition in spec 10.5 works; an approved modification that now conflicts is refused; recalculated estimates are correct.

### Sprint 8: Admin and trust

- **Spec/UI refs**: spec 12, 15, 17.3, 18.4; UI 8.8 admin, 8.9.
- **Stories**: remove auto-approve and add moderation queue (approve, reject with reason, request corrections, deactivate, remove); user management with block/unblock; full dealer verification and suspension; reports queue; offer and booking oversight; analytics per spec 12.5 with view counting; settings (verification required, expiry days, categories, announcement bar); audit log.
- **Done when**: every admin route rejects non-admins (tested); blocked users cannot log in; audit log records each action.

### Sprint 9: Engagement features

- **Spec/UI refs**: spec 13.3, 14, 16, 17.2, 17.3; UI 8.4, 8.2 compare tray, 7.10.
- **Stories**: favourites (handle inactive/sold items); recently viewed; compare up to 3; inspection and viewing requests with accept, reject, reschedule, complete, cancel; listing expiry with notification, auto-inactive and renew; listing statistics; optional email notifications; polish pass.
- **Done when**: all 35 modules in spec section 24 can be ticked off.

### Sprint 10: Hardening and deployment

- **Spec/UI refs**: spec 18, 22, 23; UI 11, 12, 15.
- **Stories**: security review (spec 22.3); validation audit (18.5, 22.2); authorisation audit with a denied-user test per route; end-to-end tests for five journeys; accessibility and responsive pass; performance checks; final Postman collection; deployment; README, architecture notes, test report, known limitations.
- **Done when**: live URL works for all roles; UI checklist (section 15) fully ticked; a stranger can run the project from the README.

## 7. PROGRESS.md template

```
# Progress

## Current sprint
Sprint N: <name>. Status: in progress / done.

## Done
- <feature> (endpoints, pages, tests)

## Deferred
- <item> and why

## Decisions made
- <decision and reason>

## Open questions
- <question>

## How to run
- Commands, env variables, seed scripts
```

## 8. Risks

- **Biggest risks**: rental overlap logic (Sprints 6 to 7), offer-acceptance concurrency (Sprint 4), and over-investing in UI polish. If a sprint runs long, drop parallax, wordmark animation and 360 view before cutting tests or server-side checks.
- Do not let the agent invent requirements. Anything not in the spec is out of scope.
