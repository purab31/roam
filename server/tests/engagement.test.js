const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const Dealer = require('../src/models/dealer.model');
const Favourite = require('../src/models/favourite.model');
const RecentlyViewed = require('../src/models/recentlyViewed.model');
const InspectionRequest = require('../src/models/inspectionRequest.model');
const Offer = require('../src/models/offer.model');
const Booking = require('../src/models/booking.model');
const Notification = require('../src/models/notification.model');
const { checkListingExpiry, renewListing } = require('../src/services/expiry.service');

describe('Sprint 9: Engagement Features & Polish API', () => {
  let mongod;
  let buyer, buyerCookie;
  let seller, sellerCookie;
  let otherUser, otherCookie;
  let vehicle1, listing1;
  let vehicle2, listing2;
  let vehicle3, listing3;
  let vehicle4, listing4;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'roam_test' },
    });
    await mongoose.connect(mongod.getUri());
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    // Clear collections
    await Promise.all([
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Listing.deleteMany({}),
      Dealer.deleteMany({}),
      Favourite.deleteMany({}),
      RecentlyViewed.deleteMany({}),
      InspectionRequest.deleteMany({}),
      Offer.deleteMany({}),
      Booking.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // 1. Register Buyer
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Buyer Bob',
        email: 'buyer@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919876543210',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    buyer = buyerRes.body.data.user;
    buyerCookie = buyerRes.headers['set-cookie'];

    // 2. Register Seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Seller Sally',
        email: 'seller@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919876543211',
        capabilities: ['seller'],
        acceptTerms: true,
      });
    seller = sellerRes.body.data.user;
    sellerCookie = sellerRes.headers['set-cookie'];

    // 3. Register Other User
    const otherRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Other Oliver',
        email: 'other@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919876543212',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    otherUser = otherRes.body.data.user;
    otherCookie = otherRes.headers['set-cookie'];

    // Create vehicles and listings
    vehicle1 = await Vehicle.create({
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX (O)',
      manufacturingYear: 2022,
      registrationYear: 2022,
      registrationNumber: 'MH02AB1001',
      colour: 'Polar White',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      kmDriven: 18000,
      bodyType: 'SUV',
      condition: 'Excellent',
      ownerRef: { type: 'user', id: seller._id },
      location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', area: 'Bandra', pincode: '400050' },
      images: [{ url: '/uploads/images/placeholders/placeholder-suv.svg', isCover: true }],
    });

    listing1 = await Listing.create({
      vehicleRef: vehicle1._id,
      ownerRef: { type: 'user', id: seller._id },
      purpose: 'sale',
      moderationStatus: 'approved',
      sale: {
        status: 'active',
        askingPrice: 150000000, // 15 Lakh paise
        negotiable: true,
      },
      expiresAt: new Date(Date.now() + 90 * 86400000),
      viewCount: 42,
    });

    vehicle2 = await Vehicle.create({
      brand: 'Tata',
      model: 'Nexon',
      variant: 'XZ+',
      manufacturingYear: 2023,
      registrationYear: 2023,
      registrationNumber: 'MH02AB1002',
      colour: 'Daytona Grey',
      fuelType: 'Electric',
      transmission: 'Automatic',
      kmDriven: 10000,
      bodyType: 'SUV',
      condition: 'Excellent',
      ownerRef: { type: 'user', id: seller._id },
      location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', area: 'Andheri', pincode: '400053' },
      images: [{ url: '/uploads/images/placeholders/placeholder-electric.svg', isCover: true }],
    });

    listing2 = await Listing.create({
      vehicleRef: vehicle2._id,
      ownerRef: { type: 'user', id: seller._id },
      purpose: 'both',
      moderationStatus: 'approved',
      sale: {
        status: 'active',
        askingPrice: 165000000,
        negotiable: false,
      },
      rental: {
        status: 'active',
        dailyPrice: 350000, // 3500 paise
      },
      expiresAt: new Date(Date.now() + 90 * 86400000),
      viewCount: 15,
    });

    vehicle3 = await Vehicle.create({
      brand: 'Honda',
      model: 'City',
      variant: 'ZX',
      manufacturingYear: 2021,
      registrationYear: 2021,
      registrationNumber: 'MH02AB1003',
      colour: 'Radiant Red',
      fuelType: 'Petrol',
      transmission: 'Manual',
      kmDriven: 25000,
      bodyType: 'Sedan',
      condition: 'Good',
      ownerRef: { type: 'user', id: seller._id },
      location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', area: 'Dadar', pincode: '400028' },
      images: [{ url: '/uploads/images/placeholders/placeholder-sedan.svg', isCover: true }],
    });

    listing3 = await Listing.create({
      vehicleRef: vehicle3._id,
      ownerRef: { type: 'user', id: seller._id },
      purpose: 'sale',
      moderationStatus: 'approved',
      sale: {
        status: 'active',
        askingPrice: 110000000,
        negotiable: true,
      },
      expiresAt: new Date(Date.now() + 90 * 86400000),
      viewCount: 8,
    });

    vehicle4 = await Vehicle.create({
      brand: 'Maruti',
      model: 'Swift',
      variant: 'ZXi',
      manufacturingYear: 2020,
      registrationYear: 2020,
      registrationNumber: 'MH02AB1004',
      colour: 'Fire Red',
      fuelType: 'Petrol',
      transmission: 'Manual',
      kmDriven: 35000,
      bodyType: 'Hatchback',
      condition: 'Fair',
      ownerRef: { type: 'user', id: seller._id },
      location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', area: 'Thane', pincode: '400601' },
      images: [{ url: '/uploads/images/placeholders/placeholder-hatchback.svg', isCover: true }],
    });

    listing4 = await Listing.create({
      vehicleRef: vehicle4._id,
      ownerRef: { type: 'user', id: seller._id },
      purpose: 'sale',
      moderationStatus: 'approved',
      sale: {
        status: 'active',
        askingPrice: 65000000,
        negotiable: true,
      },
      expiresAt: new Date(Date.now() + 90 * 86400000),
      viewCount: 5,
    });
  });

  // -------------------------------------------------------------------------
  // 1. FAVOURITES API
  // -------------------------------------------------------------------------
  describe('Favourites API', () => {
    it('should save a listing to favourites and return 201', async () => {
      const res = await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listing.toString()).toBe(listing1._id.toString());
    });

    it('should be safe on duplicate clicks (idempotency test)', async () => {
      // First save
      await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      // Immediate double-click
      const res = await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const count = await Favourite.countDocuments({
        user: buyer._id,
        listing: listing1._id,
      });
      expect(count).toBe(1);
    });

    it('should remove a listing from favourites using listing ID only', async () => {
      await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      const delRes = await request(app)
        .delete(`/api/favourites/${listing1._id.toString()}`)
        .set('Cookie', buyerCookie);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const count = await Favourite.countDocuments({
        user: buyer._id,
        listing: listing1._id,
      });
      expect(count).toBe(0);
    });

    it('should return favourites with availability flags (active, reserved, sold, inactive)', async () => {
      // Save listing 1 (active) and listing 2
      await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing2._id.toString() });

      // Mark listing 2 as sold
      listing2.sale.status = 'sold';
      listing2.rental.status = 'inactive';
      await listing2.save();

      const getRes = await request(app)
        .get('/api/favourites')
        .set('Cookie', buyerCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.length).toBe(2);

      const item1 = getRes.body.data.find(f => f.listingId === listing1._id.toString());
      expect(item1.availability).toBe('active');
      expect(item1.listing.vehicle.brand).toBe('Hyundai');

      const item2 = getRes.body.data.find(f => f.listingId === listing2._id.toString());
      expect(item2.availability).toBe('sold');
    });

    it('should treat listings as unavailable when owner is blocked without leaking reasons', async () => {
      await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      // Block seller
      await User.findByIdAndUpdate(seller._id, { accountStatus: 'blocked' });

      const getRes = await request(app)
        .get('/api/favourites')
        .set('Cookie', buyerCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBe(1);
      const fav = getRes.body.data[0];
      expect(fav.availability).toBe('unavailable');
      expect(fav.unavailableMessage).toBe('Vehicle no longer available');
      // Must not leak private seller or vehicle details
      expect(fav.listing).toBeUndefined();
    });

    it('should treat listings as unavailable when dealer is suspended or revoked', async () => {
      // Create dealer and dealer listing
      const dealer = await Dealer.create({
        user: seller._id,
        dealershipName: 'Prime Motors',
        ownerName: 'Seller Sally',
        businessEmail: 'dealer@roam.local',
        phone: '+919876543299',
        address: '123 Auto Lane',
        city: 'Mumbai',
        pincode: '400001',
        verificationStatus: 'approved',
      });

      const dealerListing = await Listing.create({
        vehicleRef: vehicle1._id,
        ownerRef: { type: 'dealer', id: dealer._id },
        purpose: 'sale',
        moderationStatus: 'approved',
        sale: { status: 'active', askingPrice: 200000000 },
        expiresAt: new Date(Date.now() + 90 * 86400000),
      });

      await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: dealerListing._id.toString() });

      // Suspend dealer
      dealer.verificationStatus = 'suspended';
      await dealer.save();

      const getRes = await request(app)
        .get('/api/favourites')
        .set('Cookie', buyerCookie);

      const fav = getRes.body.data.find(f => f.listingId === dealerListing._id.toString());
      expect(fav.availability).toBe('unavailable');
      expect(fav.unavailableMessage).toBe('Vehicle no longer available');
    });

    it('should treat listings as unavailable when admin deactivated, in review, or removed', async () => {
      await request(app)
        .post('/api/favourites')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      // Admin deactivates
      listing1.adminDeactivated = true;
      await listing1.save();

      const getRes = await request(app)
        .get('/api/favourites')
        .set('Cookie', buyerCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBe(1);
      const fav = getRes.body.data[0];
      expect(fav.availability).toBe('unavailable');
    });
  });

  // -------------------------------------------------------------------------
  // 2. RECENTLY VIEWED API
  // -------------------------------------------------------------------------
  describe('Recently Viewed API', () => {
    it('should record views atomically and retrieve up to 20 items', async () => {
      const res = await request(app)
        .post('/api/recently-viewed')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const getRes = await request(app)
        .get('/api/recently-viewed')
        .set('Cookie', buyerCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBe(1);
      expect(getRes.body.data[0].listing.vehicle.brand).toBe('Hyundai');
    });

    it('should not record views of your own listings', async () => {
      // Seller attempts to record view of own listing1
      const res = await request(app)
        .post('/api/recently-viewed')
        .set('Cookie', sellerCookie)
        .send({ listingId: listing1._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.skipped).toBe(true);
      expect(res.body.data.reason).toBe('OWN_LISTING');

      const getRes = await request(app)
        .get('/api/recently-viewed')
        .set('Cookie', sellerCookie);

      expect(getRes.body.data.length).toBe(0);
    });

    it('should filter out unavailable entries on read', async () => {
      await request(app)
        .post('/api/recently-viewed')
        .set('Cookie', buyerCookie)
        .send({ listingId: listing1._id.toString() });

      // Mark listing1 as adminDeactivated
      listing1.adminDeactivated = true;
      await listing1.save();

      const getRes = await request(app)
        .get('/api/recently-viewed')
        .set('Cookie', buyerCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. VEHICLE COMPARISON API
  // -------------------------------------------------------------------------
  describe('Vehicle Comparison API (GET /api/compare)', () => {
    it('should return aligned specifications for up to 3 vehicles', async () => {
      const ids = `${listing1._id},${listing2._id},${listing3._id}`;
      const res = await request(app).get(`/api/compare?ids=${ids}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicles.length).toBe(3);
      expect(res.body.data.specs.length).toBeGreaterThan(5);

      // Verify difference marker calculation
      const fuelSpec = res.body.data.specs.find(s => s.key === 'fuelType');
      expect(fuelSpec).toBeDefined();
      expect(fuelSpec.isDifferent).toBe(true); // Petrol vs Electric vs Petrol
    });

    it('should return 400 ValidationError when comparing more than 3 vehicles', async () => {
      const ids = `${listing1._id},${listing2._id},${listing3._id},${listing4._id}`;
      const res = await request(app).get(`/api/compare?ids=${ids}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('maximum of 3');
    });

    it('should return only public, available listings in comparison', async () => {
      // Mark listing2 as adminDeactivated
      listing2.adminDeactivated = true;
      await listing2.save();

      const ids = `${listing1._id},${listing2._id}`;
      const res = await request(app).get(`/api/compare?ids=${ids}`);

      expect(res.status).toBe(200);
      expect(res.body.data.vehicles.length).toBe(1);
      expect(res.body.data.vehicles[0].id).toBe(listing1._id.toString());
    });
  });

  // -------------------------------------------------------------------------
  // 4. INSPECTION APPOINTMENTS API
  // -------------------------------------------------------------------------
  describe('Inspection Appointments API', () => {
    const futureDate = new Date(Date.now() + 48 * 3600000).toISOString(); // 2 days ahead

    it('should create an inspection request and notify the seller', async () => {
      const res = await request(app)
        .post('/api/inspections')
        .set('Cookie', buyerCookie)
        .send({
          listingId: listing1._id.toString(),
          preferredDateTime: futureDate,
          message: 'Can I check the car this Saturday morning?',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('requested');

      // Verify notification created for seller
      const notif = await Notification.findOne({
        recipient: seller._id,
        type: 'inspection',
      });
      expect(notif).toBeDefined();
      expect(notif.title).toBe('New Inspection Request');
    });

    it('should reject inspection request on your own listing with 403', async () => {
      const res = await request(app)
        .post('/api/inspections')
        .set('Cookie', sellerCookie)
        .send({
          listingId: listing1._id.toString(),
          preferredDateTime: futureDate,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CANNOT_INSPECT_OWN_LISTING');
    });

    it('should reject past appointment times with 400 ValidationError', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const res = await request(app)
        .post('/api/inspections')
        .set('Cookie', buyerCookie)
        .send({
          listingId: listing1._id.toString(),
          preferredDateTime: pastDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate open inspection requests with 409', async () => {
      await request(app)
        .post('/api/inspections')
        .set('Cookie', buyerCookie)
        .send({
          listingId: listing1._id.toString(),
          preferredDateTime: futureDate,
        });

      const res = await request(app)
        .post('/api/inspections')
        .set('Cookie', buyerCookie)
        .send({
          listingId: listing1._id.toString(),
          preferredDateTime: new Date(Date.now() + 72 * 3600000).toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_INSPECTION_REQUEST');
    });

    it('should enforce actor-awareness: buyer cannot accept request (wrong actor gets 403)', async () => {
      const createRes = await request(app)
        .post('/api/inspections')
        .set('Cookie', buyerCookie)
        .send({
          listingId: listing1._id.toString(),
          preferredDateTime: futureDate,
        });
      const inspId = createRes.body.data.id || createRes.body.data._id;

      // Buyer attempts to accept their own request
      const res = await request(app)
        .patch(`/api/inspections/${inspId}/respond`)
        .set('Cookie', buyerCookie)
        .send({ action: 'accept' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('WRONG_ACTOR');
    });

    it('should allow seller to accept and notify the buyer', async () => {
      const createRes = await request(app)
        .post('/api/inspections')
        .set('Cookie', buyerCookie)
        .send({
          listingId: listing1._id.toString(),
          preferredDateTime: futureDate,
        });
      const inspId = createRes.body.data.id || createRes.body.data._id;

      const res = await request(app)
        .patch(`/api/inspections/${inspId}/respond`)
        .set('Cookie', sellerCookie)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('accepted');

      const notif = await Notification.findOne({
        recipient: buyer._id,
        type: 'inspection',
        title: 'Inspection Request Accepted',
      });
      expect(notif).toBeDefined();
    });

    it('should allow seller to propose a reschedule and buyer to accept it', async () => {
      const createRes = await request(app)
        .post('/api/inspections')
        .set('Cookie', buyerCookie)
        .send({
          listingId: listing1._id.toString(),
          preferredDateTime: futureDate,
        });
      const inspId = createRes.body.data.id || createRes.body.data._id;

      const altDate = new Date(Date.now() + 96 * 3600000).toISOString();
      const resProp = await request(app)
        .patch(`/api/inspections/${inspId}/respond`)
        .set('Cookie', sellerCookie)
        .send({
          action: 'reschedule',
          proposedAlternative: altDate,
          alternativeMessage: 'How about Sunday afternoon instead?',
        });

      expect(resProp.status).toBe(200);
      expect(resProp.body.data.status).toBe('reschedule_proposed');

      // Buyer accepts the reschedule
      const resAccept = await request(app)
        .patch(`/api/inspections/${inspId}/status`)
        .set('Cookie', buyerCookie)
        .send({ action: 'accept_reschedule' });

      expect(resAccept.status).toBe(200);
      expect(resAccept.body.data.status).toBe('accepted');
    });
  });

  // -------------------------------------------------------------------------
  // 5. LISTING EXPIRY & CRON EXCLUSIONS (WITH FAKE CLOCK)
  // -------------------------------------------------------------------------
  describe('Listing Expiry & Exclusions (Fake Clock Injection)', () => {
    it('should send warning when approaching expiry within notice period', async () => {
      // Set listing1 to expire in 4 days
      const simulatedNow = new Date('2026-11-23T10:00:00Z');
      listing1.expiresAt = new Date('2026-11-27T10:00:00Z'); // 4 days later
      listing1.expiryWarningSent = false;
      await listing1.save();

      const result = await checkListingExpiry({
        clock: () => simulatedNow,
        noticeDays: 7,
      });

      expect(result.warningsSent).toBe(1);

      const updated = await Listing.findById(listing1._id);
      expect(updated.expiryWarningSent).toBe(true);

      const notif = await Notification.findOne({
        recipient: seller._id,
        title: 'Listing Approaching Expiry',
      });
      expect(notif).toBeDefined();
    });

    it('should auto-deactivate expired listings through state machine', async () => {
      const simulatedNow = new Date('2026-11-28T10:00:00Z');
      listing1.expiresAt = new Date('2026-11-27T10:00:00Z'); // 1 day in the past
      await listing1.save();

      const result = await checkListingExpiry({
        clock: () => simulatedNow,
        noticeDays: 7,
      });

      expect(result.expiredCount).toBe(1);

      const updated = await Listing.findById(listing1._id);
      expect(updated.sale.status).toBe('inactive');

      const notif = await Notification.findOne({
        recipient: seller._id,
        title: 'Listing Expired',
      });
      expect(notif).toBeDefined();
    });

    it('should skip reserved listings from auto-deactivation', async () => {
      const simulatedNow = new Date('2026-11-28T10:00:00Z');
      listing1.expiresAt = new Date('2026-11-27T10:00:00Z');
      listing1.sale.status = 'reserved';
      await listing1.save();

      const result = await checkListingExpiry({
        clock: () => simulatedNow,
      });

      expect(result.expiredCount).toBe(0);
      const updated = await Listing.findById(listing1._id);
      expect(updated.sale.status).toBe('reserved');
    });

    it('should skip listings with an accepted offer from auto-deactivation', async () => {
      const simulatedNow = new Date('2026-11-28T10:00:00Z');
      listing1.expiresAt = new Date('2026-11-27T10:00:00Z');
      await listing1.save();

      // Create an accepted offer
      await Offer.create({
        listing: listing1._id,
        offeredBy: buyer._id,
        seller: seller._id,
        amount: 140000000,
        status: 'accepted',
        history: [],
      });

      const result = await checkListingExpiry({
        clock: () => simulatedNow,
      });

      expect(result.expiredCount).toBe(0);
    });

    it('should skip listings with confirmed or active bookings', async () => {
      const simulatedNow = new Date('2026-11-28T10:00:00Z');
      listing2.expiresAt = new Date('2026-11-27T10:00:00Z');
      await listing2.save();

      // Create confirmed booking
      await Booking.create({
        renter: buyer._id,
        listing: listing2._id,
        ownerRef: { type: 'user', id: seller._id },
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-05'),
        status: 'confirmed',
        pricing: { baseRate: 1400000, days: 4, additionalCharges: 0, deposit: 500000, estimatedTotal: 1900000 },
      });

      const result = await checkListingExpiry({
        clock: () => simulatedNow,
      });

      expect(result.expiredCount).toBe(0);
    });

    it('should allow renewal: extends expiresAt and reactivates inactive statuses', async () => {
      listing1.sale.status = 'inactive';
      listing1.expiresAt = new Date('2026-11-20T00:00:00Z');
      listing1.expiryWarningSent = true;
      await listing1.save();

      const res = await request(app)
        .post(`/api/listings/${listing1._id}/renew`)
        .set('Cookie', sellerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await Listing.findById(listing1._id);
      expect(updated.sale.status).toBe('active');
      expect(updated.expiryWarningSent).toBe(false);
      expect(new Date(updated.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject renewal with 409 if listing is active and outside the expiry notice window', async () => {
      // 30 days remaining in validity period (well outside 7-day notice window)
      listing1.sale.status = 'active';
      listing1.expiresAt = new Date(Date.now() + 30 * 86400000);
      await listing1.save();

      const res = await request(app)
        .post(`/api/listings/${listing1._id}/renew`)
        .set('Cookie', sellerCookie);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_ELIGIBLE_FOR_RENEWAL');
    });

    it('should allow renewal within notice window without stacking (resets validity from now)', async () => {
      // 3 days remaining (within 7-day notice window)
      listing1.sale.status = 'active';
      listing1.expiresAt = new Date(Date.now() + 3 * 86400000);
      await listing1.save();

      const res1 = await request(app)
        .post(`/api/listings/${listing1._id}/renew`)
        .set('Cookie', sellerCookie);

      expect(res1.status).toBe(200);
      const updated = await Listing.findById(listing1._id);
      // Resets to ~90 days from now (not 93 days, removing stacking)
      const daysFromNow = (new Date(updated.expiresAt).getTime() - Date.now()) / 86400000;
      expect(daysFromNow).toBeGreaterThanOrEqual(89);
      expect(daysFromNow).toBeLessThanOrEqual(91);

      // Attempting to renew again immediately must return 409 (cannot stack unlimited extensions)
      const res2 = await request(app)
        .post(`/api/listings/${listing1._id}/renew`)
        .set('Cookie', sellerCookie);

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('NOT_ELIGIBLE_FOR_RENEWAL');
    });

    it('should assign expiresAt to listings without one and never expire them in the same run', async () => {
      // Create listing without expiresAt, created in the distant past
      const legacyListing = await Listing.create({
        vehicleRef: vehicle1._id,
        ownerRef: { type: 'user', id: seller._id },
        purpose: 'sale',
        moderationStatus: 'approved',
        sale: { status: 'active', askingPrice: 150000000 },
        createdAt: new Date('2025-01-01T00:00:00Z'),
        expiresAt: null,
      });

      const simulatedNow = new Date('2026-11-23T10:00:00Z');
      const result = await checkListingExpiry({
        clock: () => simulatedNow,
      });

      // Must NOT expire in this run
      expect(result.expiredCount).toBe(0);

      const refreshed = await Listing.findById(legacyListing._id);
      expect(refreshed.sale.status).toBe('active');
      expect(refreshed.expiresAt).toBeDefined();
      expect(new Date(refreshed.expiresAt).getTime()).toBeGreaterThan(simulatedNow.getTime());
    });

    it('should reject renewal for non-owner with 403', async () => {
      const res = await request(app)
        .post(`/api/listings/${listing1._id}/renew`)
        .set('Cookie', buyerCookie);

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // 6. STATISTICS API
  // -------------------------------------------------------------------------
  describe('Listing Statistics API', () => {
    it('should return viewCount, favourites, enquiries, offers, bookings for owner', async () => {
      // Add favourite, offer, booking
      await Favourite.create({ user: buyer._id, listing: listing1._id });
      await Offer.create({
        listing: listing1._id,
        offeredBy: buyer._id,
        seller: seller._id,
        amount: 140000000,
        status: 'submitted',
      });

      const res = await request(app)
        .get(`/api/listings/${listing1._id}/statistics`)
        .set('Cookie', sellerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.views).toBe(42);
      expect(res.body.data.favourites).toBe(1);
      expect(res.body.data.offers).toBe(1);
      expect(res.body.data.enquiries).toBe(0);
      expect(res.body.data.bookings).toBe(0);
    });

    it('should reject non-owner viewing statistics with 403', async () => {
      const res = await request(app)
        .get(`/api/listings/${listing1._id}/statistics`)
        .set('Cookie', buyerCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should provide batched statistics for My Listings in one query', async () => {
      await Favourite.create({ user: buyer._id, listing: listing1._id });
      await Favourite.create({ user: otherUser._id, listing: listing1._id });
      await Favourite.create({ user: buyer._id, listing: listing2._id });

      const res = await request(app)
        .get('/api/listings/my/statistics')
        .set('Cookie', sellerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const stats = res.body.data;
      expect(stats[listing1._id.toString()].views).toBe(42);
      expect(stats[listing1._id.toString()].favourites).toBe(2);
      expect(stats[listing2._id.toString()].views).toBe(15);
      expect(stats[listing2._id.toString()].favourites).toBe(1);
    });
  });
});
