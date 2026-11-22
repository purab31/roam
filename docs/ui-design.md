# UI Design Documentation
## Pre-Owned Vehicle Buying, Selling & Rental Marketplace

> **Purpose of this document.** It extracts the *visual language* of the reference design (a premium, minimal, e-commerce style product page) and re-applies it to the pre-owned vehicle marketplace. Nothing from the reference's subject matter (golf, clubs, memberships) is carried over. Only the design system, layout patterns, component styling, spacing, typography, colour behaviour and interaction feel are reused.

**Brand name:** Roam
**Tagline:** *Your journey starts here*

Brand usage in the UI:
- **Header logo:** circular black mark + "Roam" wordmark (14px/600).
- **Tagline placement:** under the logo in the footer (11px muted), in the home hero as a small eyebrow above the headline, and in the sign-in / onboarding side panel. It is not shown in the compact header.
- **Footer giant wordmark:** "Roam" (four letters, so it scales larger than a long name and fills the full container width, cropped at the bottom edge).
- **Page titles / meta:** `Roam | Your journey starts here`.

---

## 1. Design Philosophy

| Principle | What it means in the design |
|---|---|
| **Quiet luxury / gallery feel** | Huge amounts of white space. The product (vehicle) is the hero; the UI stays out of the way. |
| **Monochrome + one loud accent** | Everything is black, white and soft grey. A single hot orange-red is used only for urgency: promo bar, discounts, key badges. |
| **Soft geometry** | Large rounded corners (cards ~20-24px, buttons fully pill-shaped). Nothing sharp. |
| **Light weight, large type** | Headlines are big but thin/light with tight tracking. Body text is small, grey and airy. |
| **Product on soft grey tile** | Every product image sits on a pale grey rounded tile, never directly on white. |
| **Dark bands for emphasis** | Full-bleed black sections (community CTA, footer) create contrast and a strong ending. |
| **Oversized wordmark footer** | The brand name is rendered giant and cropped at the very bottom of the page as a signature element. |

---

## 2. Light / Dark Mode (Mandatory Feature)

The reference shows a **theme toggle in the top navigation bar** (a small pill containing a sun/moon icon pair, sitting left of the language switch and "Get in touch" button). The product must ship with full light and dark themes.

### 2.1 Toggle component

- **Location:** header, right cluster, order: `Theme toggle → Language → Primary CTA → (Avatar / Notifications when logged in)`.
- **Shape:** pill, 56 × 32 px, 1px border, transparent fill.
- **Contents:** two icons (sun, moon). A circular 24px thumb slides between them (200ms ease-out). The active icon is full-opacity, the inactive is 40%.
- **States:** default, hover (border darkens), focus-visible (2px outline in accent), pressed (thumb scales 0.95).
- **Behaviour:**
  1. First visit follows `prefers-color-scheme`.
  2. Choice is saved (`localStorage: theme = light | dark | system`).
  3. Theme is applied via `data-theme="light|dark"` on `<html>` **before first paint** (inline script) to avoid a white flash.
  4. All colours come from CSS variables, nothing hard-coded in components.
  5. Cross-fade of background/text colours over 200ms; disabled for `prefers-reduced-motion`.
  6. Accessible: `role="switch"`, `aria-checked`, `aria-label="Toggle dark mode"`.
- **Mobile:** toggle also appears inside the mobile menu drawer and in dashboard settings.

### 2.2 Theme token map

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#0B0B0C` | Page background |
| `--bg-subtle` | `#F5F5F5` | `#121213` | Hero band, alternating sections |
| `--surface` | `#FFFFFF` | `#161617` | Floating cards (buy card, dashboard cards) |
| `--tile` | `#F3F3F3` | `#1C1C1E` | Vehicle image tiles |
| `--border` | `#E8E8E8` | `#2A2A2C` | Dividers, inputs, toggle outline |
| `--text` | `#0A0A0A` | `#F5F5F5` | Headings, primary text |
| `--text-muted` | `#8A8A8A` | `#9A9A9F` | Body copy, labels, helper text |
| `--text-faint` | `#B5B5B5` | `#5E5E63` | Dotted leaders, placeholders, inactive tabs |
| `--primary` | `#0A0A0A` | `#FFFFFF` | Main button fill |
| `--on-primary` | `#FFFFFF` | `#0A0A0A` | Text on main button |
| `--accent` | `#FF4B14` | `#FF5A26` | Promo bar, discount, badges |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` | Text on accent |
| `--star` | `#FFC20E` | `#FFC83A` | Rating stars |
| `--dark-band-bg` | `#000000` | `#000000` | CTA + footer (stay black in both modes) |
| `--dark-band-text` | `#FFFFFF` | `#FFFFFF` | Text on dark bands |
| `--success` | `#16A34A` | `#34D399` | Available, offer accepted |
| `--warning` | `#D97706` | `#FBBF24` | Pending, negotiation |
| `--danger` | `#DC2626` | `#F87171` | Rejected, error |

### 2.3 Dark-mode specific rules

- The primary button **inverts**: white pill with black text.
- Vehicle images keep their grey tile, but the tile becomes `#1C1C1E`. Use PNG/WebP cut-outs with transparent backgrounds so they sit naturally on both tiles. Add a very subtle bottom shadow under cut-outs in dark mode only.
- Shadows nearly disappear in dark mode. Elevation is expressed with lighter surface colour + 1px border instead.
- Dark bands (community CTA, footer) stay pure black in both modes. In dark mode, add a 1px top border (`--border`) so the band separates from the dark page.
- Accent orange is slightly lifted (`#FF5A26`) for contrast on dark.
- Brand/partner logo strip uses a CSS filter: `grayscale(1) opacity(.6)` in light, `grayscale(1) invert(1) opacity(.6)` in dark.
- Star ratings, discount badges, and status chips keep their colour in both themes.

---

## 3. Colour System (Summary)

- **Neutrals carry the whole UI.** Black / white / four greys.
- **One accent (orange-red `#FF4B14`)** only for: top promo bar, discount percentage badge, old/struck price, urgent notification dots, "Featured" ribbons, destructive-adjacent highlights.
- **Yellow** exclusively for rating stars.
- **Semantic colours** (success/warning/danger) appear only in dashboards and status chips, always as soft tinted backgrounds (12% opacity) with solid text.

---

## 4. Typography

**Font family:** a geometric, rounded-feeling sans-serif. Recommended: **Urbanist** (alternatives: Outfit, Plus Jakarta Sans, Manrope). Single family for everything.

| Role | Size (desktop) | Weight | Line-height | Tracking | Notes |
|---|---|---|---|---|---|
| Mega wordmark (footer) | 22-26vw (fills the width) | 500 | 0.8 | -0.04em | Cropped by the bottom edge |
| Section headline (large) | 56-64px | 300 | 1.05 | -0.03em | e.g. "Vehicles that fit your journey" |
| CTA headline (on black) | 64-72px | 300 | 1.05 | -0.03em | Two lines, centred |
| Product title | 32-36px | 300 | 1.1 | -0.02em | Inside the buy card |
| Price | 18px | 500 | 1 | 0 | Next to struck-through accent price |
| Card title | 14-15px | 500 | 1.3 | 0 | Below vehicle tile |
| Body | 13-14px | 400 | 1.6 | 0 | `--text-muted` |
| Eyebrow label | 11-12px | 400 | 1 | 0.02em | Small grey text above headings |
| Micro text (specs, breadcrumbs, footer) | 10-12px | 400 | 1.5 | 0 | `--text-muted` / `--text-faint` |
| Button label | 12-13px | 500 | 1 | 0 | Sentence case |
| Tab label | 13px | 400 (inactive) / 500 (active) | 1 | 0 | |

**Mobile scale:** section headlines 36-40px, CTA headline 40px, product title 28px, mega wordmark ~24vw.

---

## 5. Layout, Grid & Spacing

- **Max content width:** 1200px (nav and carousels), **narrow reading column 720px** for tabs/spec content.
- **Grid:** 12 columns, 24px gutters. Page side padding: 64px desktop / 32px tablet / 16px mobile.
- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64, 96, 160.
- **Vertical rhythm:** very generous. 96-160px between major sections.
- **Radii:** 8 (inputs small), 12 (chips), 20-24 (cards, tiles, buy card), 999 (buttons, toggles, inputs, pills).
- **Elevation:** buy card uses one soft shadow `0 8px 32px rgba(0,0,0,.06)` in light mode only.
- **Borders:** 1px hairlines, used sparingly (tabs, inputs, toggle).

---

## 6. Page Anatomy (Reference Structure → Marketplace Equivalent)

The reference page is a single long product-detail page. Its sections, top to bottom, are mapped below to the **Vehicle Detail Page**, which is the signature page of the marketplace.

| # | Reference section | Marketplace equivalent |
|---|---|---|
| 1 | Rounded app frame / browser mock | Page canvas |
| 2 | Header with logo, centre links, theme toggle, language, CTA | Global header |
| 3 | Full-width orange announcement bar | Promo / system announcement bar |
| 4 | Breadcrumb | Home › Cars › Sedans › 2019 Honda Civic |
| 5 | Hero: thumbnail rail + big image + floating buy card | Vehicle gallery + floating action card (Buy / Make offer / Rent) |
| 6 | Tabs (Specifications / Reviews / Questions) | Tabs (Specifications / Rental terms / Seller & Reviews / Questions) |
| 7 | Spec table with dotted leaders | Vehicle specification table |
| 8 | Description + numbered "Technologies" list | Description + numbered "Features & condition" list |
| 9 | "Similar gear" carousel with count | "Similar vehicles" carousel |
| 10 | "Recently viewed" carousel | "Recently viewed vehicles" carousel |
| 11 | Partner logo strip | Brand logo strip (Toyota, Honda, Hyundai, Ford, BMW...) or trusted dealers |
| 12 | Black community CTA with floating product cut-outs | Black "Sell or list your vehicle" CTA |
| 13 | Black footer with columns + giant wordmark | Footer + giant wordmark |

---

## 7. Component Specifications

### 7.1 Announcement Bar
- Full width, height 28-32px, background `--accent`, text white, 11px, centred.
- Two messages separated by a thin vertical divider: e.g. *"Free vehicle history report on every listing | List your car free this month. Become a seller"*.
- The second message includes an underlined or bold inline link. Optional dismiss (×) on the far right.
- Sits above the header or directly under it (the reference places it directly under the header).

### 7.2 Header / Navigation
- Height 64px, background `--bg`, no bottom border (the promo bar acts as the divider).
- **Left:** logo mark (solid black circle with a cut-out glyph) + brand wordmark, 14px/600.
- **Centre:** 4-5 text links, 12px/400, 32px gaps. Links: `Buy · Rent · Sell · Dealers · Contact`. Active link: full `--text`; inactive: slightly muted. Hover: underline slides in.
- **Right cluster:** Theme toggle → Language switch (`EN / AR` text, muted) → "Get in touch" outlined pill (1px border, 36px high, 16px padding) → when logged in: notification bell with accent dot + avatar circle.
- Sticky on scroll, gains a `backdrop-filter: blur(12px)` and 1px bottom border after 8px scroll.
- Mobile: logo left, theme toggle + hamburger right; menu opens a full-height drawer.

### 7.3 Breadcrumb
- 10-11px, `--text-muted`, chevron separators, last item in `--text`. Left-aligned above the hero with 24px top padding.

### 7.4 Hero Gallery (Left)
- Background band: `--bg-subtle`, full width, ~560px high.
- **Thumbnail rail:** vertical, left edge, 5 thumbnails 40×40, 16px gap. Active thumb marked by a **2px vertical black line** to the left of the rail (not a box). Inactive thumbs 60% opacity.
- **Main image:** very large, cut-out on the grey band, angled slightly, **cropped by the band's edges** (bleeds off top/bottom) to feel immersive. For vehicles: 3/4 front shot, with sub-images for interior, side, rear, engine bay.
- **Image controls:** bottom-left, two circular icon buttons (expand / fullscreen, download or 360° view) with no background, 20px icons.
- Mobile: rail becomes horizontal dots / swipe carousel under the image.

### 7.5 Floating Buy Card (Right)
The signature element. A white card floating over the grey hero band, right-aligned, ~320px wide.

- Background `--surface`, radius 24px, padding 24px, soft shadow (light) / border (dark).
- Top to bottom:
  1. **Rating row:** 5 yellow stars (12px) + muted "27 reviews" (seller reviews).
  2. **Title:** 32px/300, two lines max. e.g. *2019 Honda Civic*.
  3. **Price row:** current price in black 18px/500, struck-through old price in accent, then a small **accent rounded badge** with discount (e.g. "-8% off"). For rental: `$45 / day`.
  4. **Description teaser:** 12px muted, 3 lines clamp, inline "MORE" in bold uppercase that scrolls to description.
  5. **Info rows (icon + text, 11px muted):** e.g. truck icon "Free inspection available", shield icon "Verified seller", badge icon "Lowest price guarantee".
  6. **Primary action row:** full-width black pill button (44px high) + circular outlined heart (wishlist) button on the right.
- **Marketplace variants of the primary action:**
  - *Buy mode:* `Make an offer` (primary) + `Send enquiry` (secondary text button).
  - *Rent mode:* date range picker row above the button, `Request booking` primary.
  - *Both:* a two-segment pill switch `Buy | Rent` at the top of the card changes the whole card content.
- Sticky inside the hero while the gallery is in view; on mobile it becomes a bottom sheet / fixed bottom bar showing price + primary action.

### 7.6 Tabs
- Centred in the narrow 720px column, equal-width tabs, 48px high.
- Inactive: `--text-faint`, active: `--text` with a **2px solid bottom border** the width of the tab; the full row has a 1px `--border` baseline.
- Counts shown as superscript (e.g. Reviews ²⁷).

### 7.7 Specification Table (Dotted Leader Rows)
- Two-column rows: **label left (muted)**, **value right (text)**, connected by a **dotted leader line** in `--text-faint`.
- Row height 28-32px, 11-12px type. A small bold group title ("Vehicle details") above.
- Marketplace rows: Make, Model, Year, Body type, Mileage, Fuel, Transmission, Engine, Colour, Owners, Registration, Location, VIN/Reference, Listing type.

### 7.8 Description & Numbered Features
- "Description" label (bold 11px) then a muted paragraph, max 720px.
- **Numbered feature groups:** `1.` bold title (11px/500), then 3-4 muted sub-lines beneath with a tiny dash or no marker. Used for: *1. Engine & performance, 2. Safety, 3. Comfort & interior, 4. Service history*.

### 7.9 Section Header with Count (Carousels)
- Left: **eyebrow** (11px muted, e.g. "Similar vehicles"), then **headline** 56px/300, then 12px muted description (max 2 lines).
- Right: large number "24" (28px) with "Items" in 10px beneath, and a tiny circular arrow-up-right button. Clicking it goes to the full listing.

### 7.10 Vehicle Card (Carousel Tile)
- Tile: ~270px wide, image area 270×300, background `--tile`, radius 24px, vehicle cut-out centred and partially cropped.
- Below tile (no card border): name 14px/500, price 11px muted. Left aligned with 8px inset.
- Hover: image scales 1.04, tile slightly darkens, a circular heart button fades in at top-right.
- **Extended marketplace metadata (kept subtle, below the price):** `42,000 km · Petrol · Auto` in 10px muted; small chips top-left on the tile: `For Sale`, `For Rent`, `Sale & Rent`, `Dealer`, `Private`.
- A partially visible next card peeks from the right edge to signal scrollability.

### 7.11 Carousel Controls
- Two circular ghost buttons (32px, 1px border) centred below the row, `‹` and `›`, 16px gap. Disabled state at 30% opacity. Keyboard arrows supported; scroll-snap on touch.

### 7.12 Brand / Trust Logo Strip
- Single row of 7-9 wordmark logos, equally spaced, greyscale, ~24px tall, 60% opacity, 96px vertical padding. Hover restores full opacity.

### 7.13 Community CTA Band (Black)
- Full-bleed black, ~700px high, centred content, vehicle cut-outs (e.g. a car wheel or front-quarter silhouette) **rotated and cropped** at the top-left and bottom-right corners as decoration.
- Content stack (centred): **social-proof pill** (3 tiny overlapping avatar circles + "2,500+ active members"), **headline** 72px/300 white on two lines ("List your vehicle. Reach real buyers."), 12px grey supporting sentence, **email capture** (dark grey pill input with a white circular arrow submit button inside the right end), then four social icons (Facebook, X, Instagram, LinkedIn) 16px white.
- Marketplace usage: two-intent version with the email input replaced or paired with `Sell your car` and `Register as a dealer` buttons.

### 7.14 Footer (Black)
- Row 1: logo left. Right: **"Request a call back"** white pill button (black text).
- Row 2: four link columns on the left (Company, Marketplace, Services, Support) with 10px muted column titles and 11px white links, 12px gaps. On the right: **location tabs** (e.g. `Los Angeles · Dubai` - active one bright, others muted), address, hours, phone in 10px muted.
- Row 3: **Giant brand wordmark**, white, 500 weight, spans the full container width and is cropped at the bottom edge (about 15% hidden).
- Bottom bar: copyright left, "Built by ..." credit right, 10px muted.
- Mobile: columns stack 2×2; wordmark scales to fit width.

### 7.15 Buttons

| Type | Style |
|---|---|
| **Primary** | Pill, `--primary` fill, `--on-primary` text, 44px (large) / 36px (small). Hover: opacity .88 + 1px lift. |
| **Secondary / outline** | Pill, transparent, 1px `--border` (hover: `--text`). |
| **Ghost icon** | Circle 32-40px, 1px border or none, icon 16-20px. |
| **On-dark primary** | White pill, black text. |
| **Text link** | 12px underline-on-hover, "MORE" style = uppercase bold 10px. |
| **Destructive** | Outline in `--danger`, fills on hover. |

### 7.16 Inputs & Forms
- Pill inputs (44px) with 1px `--border`, 16px side padding, 12px placeholder `--text-faint`. On dark bands, fill is `#1C1C1E` with no border.
- Textareas/selects use 16px radius. Focus: 2px outline in `--text` (not accent) + 2px offset.
- Labels: 11px muted above fields. Errors: 11px `--danger` below.
- Inline circular submit button inside input for single-field forms.

### 7.17 Badges, Chips & Status
- **Discount badge:** accent fill, white 9-10px/600 text, radius 6px, `2px 6px` padding.
- **Listing chips:** 24px high pill, `--tile` fill, 10px text.
- **Status chips (dashboards):** tinted 12% background + solid text: `Available`, `Pending`, `Negotiating`, `Accepted`, `Rejected`, `Booked`, `Returned`, `Expired`.

### 7.18 Icons
- Thin 1.5px line icons, rounded caps, 16-20px (Lucide / Phosphor Light style). No filled icons except the wishlist heart when active (accent fill) and rating stars.

---

## 8. Page Set for the Marketplace (Using the Same System)

### 8.1 Home
1. Header + promo bar.
2. Hero band (grey): large headline 64px/300 "Find, sell or rent your next car", with a **pill search bar** (Make / Model / Budget / Location + circular arrow button). Hero vehicle cut-out bleeding off the right.
3. Intent tabs: `Buy · Rent · Sell` (tab style from 7.6).
4. "Featured vehicles" carousel (7.9 + 7.10).
5. "Browse by type" grid of tiles (SUV, Sedan, Hatchback, Truck, Luxury, Electric) using tile style with icon-free large label.
6. "For rent this week" carousel.
7. Three-step "How it works" row (numbered 1-2-3 in the numbered-list style).
8. Dealer logo strip.
9. Black CTA band (Sell / Register as dealer).
10. Footer with giant wordmark.

### 8.2 Browse / Search Results
- Left collapsible **filter panel** (surface card, radius 24px): Listing type (Buy/Rent), Price range slider (black track, black thumb), Make, Model, Year, Mileage, Fuel, Transmission, Body type, Seller type (Individual / Dealer), Location. Filter groups use thin dividers and the dotted-leader count style (e.g. `Petrol ........ 128`).
- Top bar: result count in big number style, sort pill dropdown, grid/list toggle, **Compare** counter.
- Results grid: 3-4 columns of vehicle cards (7.10). Load more via pill button; infinite scroll optional.
- Compare tray: bottom docked pill showing up to 3 thumbnails + `Compare` primary button.

### 8.3 Vehicle Detail Page
Exactly the reference anatomy (sections 7.3 → 7.11): gallery + floating card, tabs, spec table, description, features, similar vehicles, recently viewed. Additions:
- **Seller block** inside the Seller tab: avatar, name, `Individual` or `Dealer` badge, rating, response time, `Message seller` outline pill.
- **Offer module** (modal or side sheet): current asking price, offer amount input (pill), optional message, `Submit offer` button, list of previous offers with status chips.
- **Rental availability calendar:** month grid, unavailable days struck through in `--text-faint`, selected range in black fill with white text, today outlined.

### 8.4 Compare Page
- Up to 3 vehicles side by side. Top row: vehicle tiles. Below: spec rows using the dotted-leader row style across columns; differences highlighted with a small accent dot. Sticky header while scrolling.

### 8.5 Enquiry / Offer / Negotiation Thread
- Threaded chat-like view in a 720px column: system events (offer made, counter-offer, accepted) as centred muted pills; messages as rounded 20px bubbles (own = `--primary` fill, other = `--tile` fill).
- Pinned vehicle mini card at the top (small tile + title + price + status chip).
- Composer: pill input with circular send button.

### 8.6 Rental Booking Flow
Three steps with a numbered stepper (1 · 2 · 3, thin line connecting): **Dates & location → Driver details → Review & request**. Summary card on the right (same floating card style) with daily rate, days, deposit, total. Confirmation screen uses a large 56px/300 heading and a success chip.

### 8.7 Create / Edit Listing (Individuals & Dealers)
- Multi-step wizard: **Basics → Specs → Photos → Pricing & listing type (Sale / Rent / Both) → Review**.
- Photo uploader: dashed 24px-radius tile drop zone, reorderable thumbnails with the same left-line "active/cover" indicator.
- Live preview card pinned on the right showing how the vehicle card will appear.
- Dealers get a **bulk upload (CSV)** tab.

### 8.8 Dashboards (All Roles)
Shared shell: left slim sidebar (icon + label, 12px, active item has the 2px left line from the gallery rail), top bar with search, theme toggle, notifications, avatar. Content on `--bg-subtle`, cards on `--surface`, radius 24px.

| Role | Key widgets |
|---|---|
| **Buyer / Renter** | Saved vehicles, my enquiries, offers sent & statuses, rental bookings (upcoming/past), notifications. |
| **Individual Owner** | My listings (cards with status chips), incoming offers (from buyers *and* dealers) with `Accept / Counter / Decline`, rental requests, performance counters (views, enquiries). |
| **Dealer** | Inventory table (bulk actions, status, price edit), **Discover owner listings** feed with `Make offer`, customer enquiries inbox, rental request queue, sales/rental stats. |
| **Admin** | User & dealer verification queue, listing moderation, reports/flags, categories & fees, platform analytics, announcement bar editor, audit log. |

- **Stat cards:** big 40px/300 number, 11px muted label, small sparkline in `--text` with accent only for negative/alert deltas.
- **Tables:** no zebra striping; 1px row dividers; 12px text; hover row `--bg-subtle`; sticky header; status chips in the last-but-one column; kebab menu at the end.
- **Empty states:** centred cut-out vehicle illustration on a tile, 24px/300 heading, one pill CTA.

### 8.9 Notifications
- Bell dropdown (320px, radius 20px) with grouped items: Offers, Enquiries, Rentals, System. Unread = accent dot. Full page uses a list with tabs (`All · Unread · Offers · Rentals`).

### 8.10 Authentication & Onboarding
- Split screen: left form in 420px column (pill inputs, social buttons as outline pills), right a full-height grey/black panel with a cropped vehicle cut-out. Role selection step uses large selectable tiles (`Buyer / Renter`, `Individual Seller`, `Dealer`).

---

## 9. Imagery Guidelines

- Vehicles photographed or cut out on neutral backgrounds; for the detail hero use **PNG/WebP cut-outs** with transparent backgrounds so they sit on the grey band.
- Consistent angle on card tiles (front 3/4, left-facing), consistent crop (vehicle fills ~85% of tile width, slightly cropped).
- Seller-uploaded photos that are not cut-outs display in a `object-fit: cover` rounded container; the tile-style cut-out is generated automatically where possible, with a fallback to the standard photo.
- Decorative images on black bands: rotated (±25-40°), cropped by edges, drop shadow off.

---

## 10. Motion & Interaction

| Element | Motion |
|---|---|
| Theme switch | Thumb slide 200ms ease-out; colours cross-fade 200ms. |
| Card hover | Image scale 1.04, 300ms `cubic-bezier(.2,.7,.2,1)`. |
| Carousel | Scroll-snap, 400ms eased programmatic scroll on arrow click. |
| Tabs | Underline slides between tabs, 250ms. |
| Buttons | 150ms opacity/translate on hover. |
| Section reveal | Fade-up 16px, 500ms, staggered 60ms (once, on scroll). |
| Hero image | Subtle parallax (max 12px) on scroll. |
| Wordmark footer | Optional: slides up into view on reach. |

All motion respects `prefers-reduced-motion`.

---

## 11. Responsive Behaviour

| Breakpoint | Layout changes |
|---|---|
| ≥1280 | Full layout as described. |
| 1024-1279 | Side padding 48px; carousels show ~3.5 cards. |
| 768-1023 | Buy card drops under the gallery (full width); nav collapses to hamburger; carousels ~2.5 cards. |
| <768 | Single column; gallery swipeable; buy card becomes **sticky bottom bar** (price + primary button); carousels 1.3 cards; footer columns 2×2; CTA headline 40px; filters open as bottom sheet; dashboards use bottom tab bar. |

---

## 12. Accessibility

- Contrast: all text ≥ 4.5:1 in both themes (muted text on tile verified; `--text-faint` used only for decorative/inactive elements).
- Focus ring visible in both themes (2px, `--text`, 2px offset).
- Toggle, tabs, carousel and modals are fully keyboard operable with correct ARIA roles.
- Colour is never the only status indicator (chips include text/icons).
- Minimum touch target 40×40px even where visuals are smaller (e.g. 32px arrows get padding).
- Images have descriptive alt text (e.g. "Silver 2019 Honda Civic, front three-quarter view").

---

## 13. Design Token Starter (CSS)

```css
:root {
  --font: "Urbanist", system-ui, sans-serif;

  --bg: #ffffff;
  --bg-subtle: #f5f5f5;
  --surface: #ffffff;
  --tile: #f3f3f3;
  --border: #e8e8e8;
  --text: #0a0a0a;
  --text-muted: #8a8a8a;
  --text-faint: #b5b5b5;
  --primary: #0a0a0a;
  --on-primary: #ffffff;
  --accent: #ff4b14;
  --on-accent: #ffffff;
  --star: #ffc20e;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;

  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.06);

  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 999px;

  --container: 1200px;
  --reading: 720px;
}

:root[data-theme="dark"] {
  --bg: #0b0b0c;
  --bg-subtle: #121213;
  --surface: #161617;
  --tile: #1c1c1e;
  --border: #2a2a2c;
  --text: #f5f5f5;
  --text-muted: #9a9a9f;
  --text-faint: #5e5e63;
  --primary: #ffffff;
  --on-primary: #0a0a0a;
  --accent: #ff5a26;
  --star: #ffc83a;
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;

  --shadow-card: none;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* same values as [data-theme="dark"] */ }
}

body { background: var(--bg); color: var(--text); font-family: var(--font); transition: background .2s, color .2s; }
```

---

## 14. Do / Don't

**Do**
- Keep screens airy; let the vehicle be the visual focus.
- Use light-weight large headlines paired with tiny muted body text.
- Use pills for every interactive control.
- Use the accent colour sparingly: it must stay meaningful.
- Provide both themes for every screen, including dashboards and modals.

**Don't**
- Don't add gradients, heavy shadows, or coloured section backgrounds.
- Don't use more than one accent colour.
- Don't put vehicle images directly on white; always on a tile or grey band.
- Don't use bold headlines; hierarchy comes from size, not weight.
- Don't hard-code colours; always use theme tokens.

---

## 15. Deliverables Checklist for Design/Dev Hand-off

- [ ] Light + dark token files (CSS variables / Tailwind theme)
- [ ] Theme toggle component with no-flash script
- [ ] Header, promo bar, footer (with giant wordmark)
- [ ] Vehicle card, carousel, section header with count
- [ ] Floating buy/offer/rent card (3 variants)
- [ ] Tabs, spec table (dotted leaders), numbered features list
- [ ] Filter panel, compare tray, compare page
- [ ] Offer & negotiation thread, rental calendar & booking stepper
- [ ] Listing wizard with photo uploader
- [ ] Four role dashboards + notifications
- [ ] Auth/onboarding screens
- [ ] Empty, loading (skeleton tiles on `--tile`), and error states
- [ ] Responsive variants for all breakpoints
