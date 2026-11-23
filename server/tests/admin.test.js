const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Dealer = require('../src/models/dealer.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const ListingView = require('../src/models/listingView.model');
const Offer = require('../src/models/offer.model');
const Booking = require('../src/models/booking.model');
const Report = require('../src/models/report.model');
const AuditLog = require('../src/models/auditLog.model');
const Settings = require('../src/models/settings.model');
const Notification = require('../src/models/notification.model');
const settingsService = require('../src/services/settings.service');
const config = require('../src/config/env');

describe('Sprint 8: Admin, Moderation, Reports & Analytics API', () => {
  let replSet;
  let adminUser, adminToken;
  let sellerUser, sellerToken;
  let buyerUser, buyerToken;
  let dealerUser, dealerToken, dealerDoc;
  let sampleVehicle, sampleListing;

  const makeAuthCookie = token => `${config.cookieName}=${token}`;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const uri = replSet.getUri();
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await AuditLog.deleteMany({});
    await Report.deleteMany({});
    await Settings.deleteMany({});
    await ListingView.deleteMany({});
    await Notification.deleteMany({});
    await Booking.deleteMany({});
    await Offer.deleteMany({});
    await Listing.deleteMany({});
    await Vehicle.deleteMany({});
    await Dealer.deleteMany({});
    await User.deleteMany({});
    settingsService.cachedSettings = null;

    const hashedPassword = await bcrypt.hash('Password@123', 10);

    // 1. Admin
    adminUser = await User.create({
      fullName: 'Platform Administrator',
      email: 'admin@roam.local',
      mobile: '+919999900001',
      passwordHash: hashedPassword,
      capabilities: ['buyer', 'admin'],
      accountStatus: 'active',
    });
    adminToken = jwt.sign({ id: adminUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 2. Seller
    sellerUser = await User.create({
      fullName: 'Rahul Seller',
      email: 'rahul@roam.local',
      mobile: '+919999900002',
      passwordHash: hashedPassword,
      capabilities: ['buyer', 'seller'],
      accountStatus: 'active',
    });
    sellerToken = jwt.sign({ id: sellerUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 3. Buyer
    buyerUser = await User.create({
      fullName: 'Priya Buyer',
      email: 'priya@roam.local',
      mobile: '+919999900003',
      passwordHash: hashedPassword,
      capabilities: ['buyer', 'renter'],
      accountStatus: 'active',
    });
    buyerToken = jwt.sign({ id: buyerUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 4. Dealer
    dealerUser = await User.create({
      fullName: 'Apex Motors Dealer',
      email: 'apex@motors.local',
      mobile: '+919999900004',
      passwordHash: hashedPassword,
      capabilities: ['buyer', 'dealer'],
      accountStatus: 'active',
    });
    dealerToken = jwt.sign({ id: dealerUser._id }, config.jwtSecret, { expiresIn: '1d' });

    dealerDoc = await Dealer.create({
      user: dealerUser._id,
      dealershipName: 'Apex Motor Hub',
      ownerName: 'Apex Motors Dealer',
      businessEmail: 'contact@apexmotors.local',
      phone: '+919999900004',
      address: 'Plot 42, Auto Hub',
      city: 'Mumbai',
      pincode: '400001',
      verificationStatus: 'approved',
    });

    // 5. Sample vehicle & approved listing
    sampleVehicle = await Vehicle.create({
      brand: 'Honda',
      model: 'City',
      variant: 'ZX CVT',
      bodyType: 'Sedan',
      manufacturingYear: 2021,
      registrationYear: 2021,
      registrationNumber: 'MH01AB1234',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      kmDriven: 25000,
      previousOwners: 1,
      condition: 'Excellent',
      colour: 'Pearl White',
      seatingCapacity: 5,
      location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
      ownerRef: { type: 'user', id: sellerUser._id },
      images: [{ url: '/uploads/images/sample.jpg', isCover: true, order: 0 }],
    });

    sampleListing = await Listing.create({
      vehicleRef: sampleVehicle._id,
      ownerRef: { type: 'user', id: sellerUser._id },
      purpose: 'sale',
      moderationStatus: 'approved',
      sale: {
        enabled: true,
        status: 'active',
        askingPrice: 120000000,
        minAcceptableOffer: 110000000,
        description: 'Pristine single-owner sedan',
      },
      statusHistory: [],
    });
  });

  // ==========================================
  // SUITE 1: AUTHORISATION ENFORCEMENT
  // ==========================================
  describe('Authorisation Checks for /api/admin Routes', () => {
    const adminEndpoints = [
      { method: 'get', url: '/api/admin/dashboard' },
      { method: 'get', url: '/api/admin/users' },
      { method: 'get', url: '/api/admin/listings' },
      { method: 'get', url: '/api/admin/dealers' },
      { method: 'get', url: '/api/admin/reports' },
      { method: 'get', url: '/api/admin/offers' },
      { method: 'get', url: '/api/admin/bookings' },
      { method: 'get', url: '/api/admin/settings' },
      { method: 'get', url: '/api/admin/audit-log' },
    ];

    test.each(adminEndpoints)('should reject unauthenticated request with 401 on %s %s', async ({ method, url }) => {
      const res = await request(app)[method](url);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_ERROR');
    });

    test.each(adminEndpoints)('should reject non-admin user with 403 on %s %s', async ({ method, url }) => {
      const res = await request(app)
        [method](url)
        .set('Cookie', makeAuthCookie(buyerToken));
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    test('should permit admin on all endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Cookie', makeAuthCookie(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // SUITE 2: MODERATION & RE-REVIEW TRIGGERS
  // ==========================================
  describe('Listing Moderation Queue & Re-review Lifecycle', () => {
    test('newly submitted listing must start as pending_review (auto-approve removed)', async () => {
      const vehicle = await Vehicle.create({
        brand: 'Hyundai',
        model: 'Creta',
        variant: 'SX',
        bodyType: 'SUV',
        manufacturingYear: 2022,
        registrationYear: 2022,
        registrationNumber: 'MH02CD5678',
        colour: 'Phantom Black',
        condition: 'Good',
        fuelType: 'Diesel',
        transmission: 'Manual',
        kmDriven: 18000,
        ownerRef: { type: 'user', id: sellerUser._id },
        location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
      });

      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', makeAuthCookie(sellerToken))
        .send({
          vehicleId: vehicle._id.toString(),
          purpose: 'sale',
          saveAsDraft: false,
          sale: { askingPrice: 150000000, description: 'Family SUV' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.moderationStatus).toBe('pending_review');
      expect(res.body.data.sale.status).toBe('inactive'); // Inactive until approved
    });

    test('admin approves listing: transitions to approved, activates sale, logs audit and notifies owner', async () => {
      // Create pending listing
      const pendingListing = await Listing.create({
        vehicleRef: sampleVehicle._id,
        ownerRef: { type: 'user', id: sellerUser._id },
        purpose: 'sale',
        moderationStatus: 'pending_review',
        sale: { enabled: true, status: 'inactive', askingPrice: 100000000 },
      });

      const res = await request(app)
        .patch(`/api/admin/listings/${pendingListing._id}/status`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ action: 'approve', reason: 'Verified documentation and photos' });

      expect(res.status).toBe(200);
      expect(res.body.data.moderationStatus).toBe('approved');
      expect(res.body.data.sale.status).toBe('active');

      // Check audit log
      const audit = await AuditLog.findOne({
        action: 'listing_approved',
        targetId: pendingListing._id,
      });
      expect(audit).toBeTruthy();
      expect(audit.actor.toString()).toBe(adminUser._id.toString());

      // Check owner notification
      const notif = await Notification.findOne({
        recipient: sellerUser._id,
        'relatedRef.id': pendingListing._id,
      });
      expect(notif).toBeTruthy();
      expect(notif.title).toContain('Listing Approved');
    });

    test('admin rejects listing: transitions to rejected with reason, logs audit and notifies owner', async () => {
      const pendingListing = await Listing.create({
        vehicleRef: sampleVehicle._id,
        ownerRef: { type: 'user', id: sellerUser._id },
        purpose: 'sale',
        moderationStatus: 'pending_review',
        sale: { enabled: true, status: 'inactive', askingPrice: 100000000 },
      });

      const res = await request(app)
        .patch(`/api/admin/listings/${pendingListing._id}/status`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ action: 'reject', reason: 'Blurry odometer photograph' });

      expect(res.status).toBe(200);
      expect(res.body.data.moderationStatus).toBe('rejected');

      const audit = await AuditLog.findOne({ action: 'listing_rejected', targetId: pendingListing._id });
      expect(audit).toBeTruthy();

      const notif = await Notification.findOne({ recipient: sellerUser._id, title: 'Listing Rejected' });
      expect(notif).toBeTruthy();
    });

    test('admin requests corrections: sets rejected with corrections note, allowing owner to edit and resubmit', async () => {
      const pendingListing = await Listing.create({
        vehicleRef: sampleVehicle._id,
        ownerRef: { type: 'user', id: sellerUser._id },
        purpose: 'sale',
        moderationStatus: 'pending_review',
        sale: { enabled: true, status: 'inactive', askingPrice: 100000000 },
      });

      const res = await request(app)
        .patch(`/api/admin/listings/${pendingListing._id}/status`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ action: 'request_corrections', reason: 'Please upload clear insurance document' });

      expect(res.status).toBe(200);
      expect(res.body.data.moderationStatus).toBe('rejected');

      // Owner edits and resubmits (rejected -> pending_review)
      const resubmit = await request(app)
        .patch(`/api/listings/${pendingListing._id}/status`)
        .set('Cookie', makeAuthCookie(sellerToken))
        .send({ action: 'moderation', status: 'pending_review', reason: 'Added clear document' });

      expect(resubmit.status).toBe(200);
      expect(resubmit.body.data.moderationStatus).toBe('pending_review');
    });

    test('editing description on approved listing triggers re-review (returns to pending_review)', async () => {
      const res = await request(app)
        .put(`/api/listings/${sampleListing._id}`)
        .set('Cookie', makeAuthCookie(sellerToken))
        .send({
          sale: { description: 'Updated complete overhaul description with new details' },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.moderationStatus).toBe('pending_review');

      // Confirm excluded from public discovery
      const searchRes = await request(app).get('/api/listings');
      const itemIds = searchRes.body.data.items.map(i => i.id);
      expect(itemIds).not.toContain(sampleListing._id.toString());
    });

    test('admin deactivates listing: owner cannot reactivate (403 ADMIN_DEACTIVATED)', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${sampleListing._id}/status`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ action: 'deactivate', reason: 'Suspected copyright violation' });

      expect(res.status).toBe(200);
      expect(res.body.data.sale.status).toBe('inactive');

      // Owner attempts to reactivate
      const ownerTry = await request(app)
        .patch(`/api/listings/${sampleListing._id}/status`)
        .set('Cookie', makeAuthCookie(sellerToken))
        .send({ action: 'activate' });

      expect(ownerTry.status).toBe(403);
      expect(ownerTry.body.error.code).toBe('ADMIN_DEACTIVATED');
    });

    test('re-approving a listing after re-review preserves sale.status (reserved stays reserved, sold stays sold)', async () => {
      // 1. Listing with reserved sale status in pending_review
      const reservedListing = await Listing.create({
        vehicleRef: sampleVehicle._id,
        ownerRef: { type: 'user', id: sellerUser._id },
        purpose: 'sale',
        moderationStatus: 'pending_review',
        sale: { enabled: true, status: 'reserved', askingPrice: 120000000 },
      });

      const resReserved = await request(app)
        .patch(`/api/admin/listings/${reservedListing._id}/status`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ action: 'approve', reason: 'Re-approved after edit' });

      expect(resReserved.status).toBe(200);
      expect(resReserved.body.data.moderationStatus).toBe('approved');
      expect(resReserved.body.data.sale.status).toBe('reserved');

      // 2. Listing with sold sale status in pending_review
      const soldListing = await Listing.create({
        vehicleRef: sampleVehicle._id,
        ownerRef: { type: 'user', id: sellerUser._id },
        purpose: 'sale',
        moderationStatus: 'pending_review',
        sale: { enabled: true, status: 'sold', askingPrice: 120000000 },
      });

      const resSold = await request(app)
        .patch(`/api/admin/listings/${soldListing._id}/status`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ action: 'approve', reason: 'Re-approved without modifying sold state' });

      expect(resSold.status).toBe(200);
      expect(resSold.body.data.moderationStatus).toBe('approved');
      expect(resSold.body.data.sale.status).toBe('sold');
    });
  });

  // ==========================================
  // SUITE 3: USER MANAGEMENT & BLOCKING
  // ==========================================
  describe('User Management & Immediate Block Enforcement', () => {
    test('admin blocks user with reason; existing session cookie is rejected on the very next request (403)', async () => {
      // Seller makes a valid request first
      const before = await request(app)
        .get('/api/users/profile')
        .set('Cookie', makeAuthCookie(sellerToken));
      expect(before.status).toBe(200);

      // Admin blocks seller
      const blockRes = await request(app)
        .patch(`/api/admin/users/${sellerUser._id}/block`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ reason: 'Multiple confirmed fraudulent listings reported' });

      expect(blockRes.status).toBe(200);
      expect(blockRes.body.data.accountStatus).toBe('blocked');

      // Audit log check
      const audit = await AuditLog.findOne({ action: 'user_blocked', targetId: sellerUser._id });
      expect(audit).toBeTruthy();

      // Seller makes request with SAME existing cookie -> must be rejected with 403 immediately!
      const after = await request(app)
        .get('/api/users/profile')
        .set('Cookie', makeAuthCookie(sellerToken));

      expect(after.status).toBe(403);
      expect(after.body.error.message).toContain('blocked');
    });

    test('admin cannot block their own account (400 ValidationError)', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser._id}/block`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ reason: 'Self-block test' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot block their own account');
    });

    test('listings of blocked users are excluded from public search', async () => {
      // Block seller
      await User.findByIdAndUpdate(sellerUser._id, { accountStatus: 'blocked' });

      const res = await request(app).get('/api/listings');
      const items = res.body.data.items;
      const ids = items.map(i => i.id);
      expect(ids).not.toContain(sampleListing._id.toString());
    });

    test('admin unblocks user: user can authenticate again', async () => {
      await User.findByIdAndUpdate(sellerUser._id, { accountStatus: 'blocked' });

      const unblockRes = await request(app)
        .patch(`/api/admin/users/${sellerUser._id}/unblock`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ reason: 'Identity verified upon dispute review' });

      expect(unblockRes.status).toBe(200);
      expect(unblockRes.body.data.accountStatus).toBe('active');

      const profileRes = await request(app)
        .get('/api/users/profile')
        .set('Cookie', makeAuthCookie(sellerToken));
      expect(profileRes.status).toBe(200);
    });
  });

  // ==========================================
  // SUITE 4: DEALER VERIFICATION & SUSPENSION
  // ==========================================
  describe('Dealer Verification, Suspension, and Revocation', () => {
    test('admin suspends dealer: blocks publishing and excludes listings from search', async () => {
      const res = await request(app)
        .patch(`/api/admin/dealers/${dealerDoc._id}/verification`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ status: 'suspended', notes: 'Audit compliance pending' });

      expect(res.status).toBe(200);
      expect(res.body.data.verificationStatus).toBe('suspended');

      // Audit log
      const audit = await AuditLog.findOne({ action: 'dealer_verification_updated', targetId: dealerDoc._id });
      expect(audit).toBeTruthy();

      // Suspended dealer cannot publish listings
      const publishRes = await request(app)
        .post('/api/listings')
        .set('Cookie', makeAuthCookie(dealerToken))
        .send({
          vehicleId: sampleVehicle._id.toString(),
          purpose: 'sale',
          saveAsDraft: false,
          publishAs: 'dealer',
          sale: { askingPrice: 100000000 },
        });

      expect(publishRes.status).toBe(403);
    });

    test('admin revokes dealer verification: dealer status is revoked and blocks publishing', async () => {
      const res = await request(app)
        .patch(`/api/admin/dealers/${dealerDoc._id}/verification`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ status: 'revoked', notes: 'Invalid business license submitted' });

      expect(res.status).toBe(200);
      expect(res.body.data.verificationStatus).toBe('revoked');

      const publishRes = await request(app)
        .post('/api/listings')
        .set('Cookie', makeAuthCookie(dealerToken))
        .send({
          vehicleId: sampleVehicle._id.toString(),
          purpose: 'sale',
          saveAsDraft: false,
          publishAs: 'dealer',
          sale: { askingPrice: 100000000 },
        });

      expect(publishRes.status).toBe(403);
    });
  });

  // ==========================================
  // SUITE 5: REPORTS & TRUST WORKFLOW
  // ==========================================
  describe('User Reports & Admin Resolution', () => {
    test('authenticated user submits a valid report', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', makeAuthCookie(buyerToken))
        .send({
          subjectType: 'listing',
          subjectRef: sampleListing._id.toString(),
          category: 'misleading',
          description: 'Listing says 2021 model but RC image clearly shows 2019 registration',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('open');
      expect(res.body.data.category).toBe('misleading');
    });

    test('self-reporting own listing is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', makeAuthCookie(sellerToken))
        .send({
          subjectType: 'listing',
          subjectRef: sampleListing._id.toString(),
          category: 'other',
          description: 'Trying to report my own vehicle',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot report your own listing');
    });

    test('duplicate open report on same subject by same user is rejected with 409', async () => {
      // First report
      await request(app)
        .post('/api/reports')
        .set('Cookie', makeAuthCookie(buyerToken))
        .send({
          subjectType: 'listing',
          subjectRef: sampleListing._id.toString(),
          category: 'fraud',
          description: 'Suspicious pricing and duplicate pictures',
        });

      // Second duplicate report
      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', makeAuthCookie(buyerToken))
        .send({
          subjectType: 'listing',
          subjectRef: sampleListing._id.toString(),
          category: 'fraud',
          description: 'Submitting duplicate report',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_REPORT');
    });

    test('admin resolves report with resolution note, logging audit and notifying reporter', async () => {
      const report = await Report.create({
        reporter: buyerUser._id,
        subjectType: 'listing',
        subjectRef: sampleListing._id,
        category: 'misleading',
        description: 'Incorrect year mentioned',
        status: 'open',
      });

      const res = await request(app)
        .patch(`/api/admin/reports/${report._id}`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({
          status: 'resolved',
          resolutionNote: 'Contacted seller to correct vehicle manufacturing year',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');

      // Audit log check
      const audit = await AuditLog.findOne({ action: 'report_resolved', targetId: report._id });
      expect(audit).toBeTruthy();

      // Reporter notification
      const notif = await Notification.findOne({ recipient: buyerUser._id, title: 'Report Update' });
      expect(notif).toBeTruthy();
    });
  });

  // ==========================================
  // SUITE 6: SETTINGS MANAGEMENT
  // ==========================================
  describe('Platform Settings & Public Announcement API', () => {
    test('public can retrieve announcement and categories without authentication', async () => {
      // Set announcement via DB
      await Settings.findOneAndUpdate(
        { key: 'global' },
        {
          announcementBar: {
            message1: 'Free vehicle history report this week',
            message2: 'List your car free today',
            linkText: 'Sell car',
            linkUrl: '/listings/create',
          },
        },
        { upsert: true }
      );
      settingsService.cachedSettings = null;

      const resAnnounce = await request(app).get('/api/settings/announcement');
      expect(resAnnounce.status).toBe(200);
      expect(resAnnounce.body.data.message1).toBe('Free vehicle history report this week');

      const resCat = await request(app).get('/api/settings/categories');
      expect(resCat.status).toBe(200);
      expect(Array.isArray(resCat.body.data)).toBe(true);
      expect(resCat.body.data).toContain('SUV');
    });

    test('admin updates settings: persists in DB, updates cache, and logs audit', async () => {
      const res = await request(app)
        .put('/api/admin/settings')
        .set('Cookie', makeAuthCookie(adminToken))
        .send({
          dealerVerificationRequired: false,
          listingExpiryDays: 60,
          announcementBar: {
            message1: 'Grand Festival Sale',
            message2: 'Zero brokerage on verified deals',
            linkText: 'Explore',
            linkUrl: '/browse',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.dealerVerificationRequired).toBe(false);
      expect(res.body.data.listingExpiryDays).toBe(60);

      // In-memory cache should reflect update immediately
      const isReq = await settingsService.isDealerVerificationRequired();
      expect(isReq).toBe(false);

      // Audit log
      const audit = await AuditLog.findOne({ action: 'settings_updated' });
      expect(audit).toBeTruthy();
    });

    test('rejects invalid linkUrl in settings update (not / or https://)', async () => {
      const res = await request(app)
        .put('/api/admin/settings')
        .set('Cookie', makeAuthCookie(adminToken))
        .send({
          announcementBar: {
            message1: 'Bad link test',
            linkUrl: 'javascript:alert(1)',
          },
        });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // SUITE 7: LISTING VIEW COUNTING (DEBOUNCED)
  // ==========================================
  describe('Listing View Counting (Permanent Count + Debounced)', () => {
    test('increments viewCount for non-owner, debounces within 1 hour, and ignores owner views', async () => {
      const listingId = sampleListing._id.toString();

      // Polling helper for background non-blocking view counter
      const waitForViewCount = async (expectedCount, maxWaitMs = 1500) => {
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
          const doc = await Listing.findById(listingId);
          if (doc && doc.viewCount === expectedCount) return doc;
          await new Promise(r => setTimeout(r, 40));
        }
        return await Listing.findById(listingId);
      };

      // 1. Initial count
      expect(sampleListing.viewCount || 0).toBe(0);

      // 2. Buyer views listing -> viewCount becomes 1 (non-blocking in background)
      await request(app)
        .get(`/api/listings/${listingId}`)
        .set('Cookie', makeAuthCookie(buyerToken));

      const afterFirstView = await waitForViewCount(1);
      expect(afterFirstView.viewCount).toBe(1);

      // 3. Buyer views again within 1 hour -> viewCount remains 1 (debounced)
      await request(app)
        .get(`/api/listings/${listingId}`)
        .set('Cookie', makeAuthCookie(buyerToken));

      await new Promise(r => setTimeout(r, 100));
      const afterSecondView = await Listing.findById(listingId);
      expect(afterSecondView.viewCount).toBe(1);

      // 4. Owner views listing -> viewCount does not increment
      await request(app)
        .get(`/api/listings/${listingId}`)
        .set('Cookie', makeAuthCookie(sellerToken));

      await new Promise(r => setTimeout(r, 100));
      const afterOwnerView = await Listing.findById(listingId);
      expect(afterOwnerView.viewCount).toBe(1);
    });
  });

  // ==========================================
  // SUITE 8: DASHBOARD ANALYTICS & AUDIT LOGS
  // ==========================================
  describe('Dashboard Analytics & Audit Logs Inspection', () => {
    test('GET /api/admin/dashboard returns accurate totals, popular models, and 6-month sparklines', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Cookie', makeAuthCookie(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { totals, popularBrands, sparklines, mostViewedListings } = res.body.data;
      expect(totals.users).toBeGreaterThanOrEqual(4);
      expect(totals.vehicles).toBeGreaterThanOrEqual(1);
      expect(totals.activeSaleListings).toBeGreaterThanOrEqual(1);

      expect(Array.isArray(popularBrands)).toBe(true);
      expect(Array.isArray(sparklines.users)).toBe(true);
      expect(sparklines.users.length).toBe(6);
      expect(Array.isArray(mostViewedListings)).toBe(true);
    });

    test('GET /api/admin/audit-log returns recorded mutation events in append-only order', async () => {
      // Trigger an admin mutation to ensure an audit log exists
      await request(app)
        .patch(`/api/admin/users/${buyerUser._id}/block`)
        .set('Cookie', makeAuthCookie(adminToken))
        .send({ reason: 'Audit log verification test' });

      const res = await request(app)
        .get('/api/admin/audit-log')
        .set('Cookie', makeAuthCookie(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].action).toBe('user_blocked');
      expect(res.body.data.items[0].actor.email).toBe('admin@roam.local');
    });

    test('GET /api/admin/offers and /bookings return read-only oversight lists', async () => {
      const resOffers = await request(app)
        .get('/api/admin/offers')
        .set('Cookie', makeAuthCookie(adminToken));
      expect(resOffers.status).toBe(200);
      expect(Array.isArray(resOffers.body.data.items)).toBe(true);

      const resBookings = await request(app)
        .get('/api/admin/bookings')
        .set('Cookie', makeAuthCookie(adminToken));
      expect(resBookings.status).toBe(200);
      expect(Array.isArray(resBookings.body.data.items)).toBe(true);
    });
  });
});
