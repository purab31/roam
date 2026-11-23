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
const Offer = require('../src/models/offer.model');
const Booking = require('../src/models/booking.model');
const Transaction = require('../src/models/transaction.model');
const Notification = require('../src/models/notification.model');
const config = require('../src/config/env');

describe('Sprint 10: End-to-End Core User Journeys (Database: roam_e2e)', () => {
  let replSet;
  let adminToken, adminUser;
  let ownerToken, ownerUser;
  let buyerToken, buyerUser;
  let renterToken, renterUser;
  let renterToken2, renterUser2;
  let dealerToken, dealerUser, dealerDoc;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger', dbName: 'roam_e2e' },
    });
    await mongoose.connect(replSet.getUri());

    const pwd = await bcrypt.hash('Password@123', 10);

    // Seed Admin
    adminUser = await User.create({
      fullName: 'System Admin',
      email: 'admin@roam.local',
      mobile: '+919999000001',
      passwordHash: pwd,
      capabilities: ['admin'],
      accountStatus: 'active',
    });
    adminToken = jwt.sign({ id: adminUser._id }, config.jwtSecret, { expiresIn: '7d' });

    // Seed Owner (Seller)
    ownerUser = await User.create({
      fullName: 'Vikram Seth',
      email: 'vikram.owner@roam.local',
      mobile: '+919999000002',
      passwordHash: pwd,
      capabilities: ['buyer', 'seller'],
      accountStatus: 'active',
    });
    ownerToken = jwt.sign({ id: ownerUser._id }, config.jwtSecret, { expiresIn: '7d' });

    // Seed Buyer
    buyerUser = await User.create({
      fullName: 'Priya Sharma',
      email: 'priya.buyer@roam.local',
      mobile: '+919999000003',
      passwordHash: pwd,
      capabilities: ['buyer'],
      accountStatus: 'active',
    });
    buyerToken = jwt.sign({ id: buyerUser._id }, config.jwtSecret, { expiresIn: '7d' });

    // Seed Renters
    renterUser = await User.create({
      fullName: 'Rahul Verma',
      email: 'rahul.renter@roam.local',
      mobile: '+919999000004',
      passwordHash: pwd,
      capabilities: ['renter'],
      accountStatus: 'active',
    });
    renterToken = jwt.sign({ id: renterUser._id }, config.jwtSecret, { expiresIn: '7d' });

    renterUser2 = await User.create({
      fullName: 'Sneha Patel',
      email: 'sneha.renter@roam.local',
      mobile: '+919999000005',
      passwordHash: pwd,
      capabilities: ['renter'],
      accountStatus: 'active',
    });
    renterToken2 = jwt.sign({ id: renterUser2._id }, config.jwtSecret, { expiresIn: '7d' });

    // Seed Dealer User & Approved Dealership
    dealerUser = await User.create({
      fullName: 'Apex Motors Manager',
      email: 'manager@apexmotors.local',
      mobile: '+919999000006',
      passwordHash: pwd,
      capabilities: ['dealer'],
      accountStatus: 'active',
    });
    dealerToken = jwt.sign({ id: dealerUser._id }, config.jwtSecret, { expiresIn: '7d' });

    dealerDoc = await Dealer.create({
      user: dealerUser._id,
      dealershipName: 'Apex Premium Motors',
      ownerName: 'Apex Motors Ltd',
      businessEmail: 'manager@apexmotors.local',
      phone: '+919999000006',
      address: '101 Motor Highway',
      city: 'Mumbai',
      pincode: '400001',
      verificationStatus: 'approved',
      registrationInfo: {
        registrationNumber: 'REG-APEX-999',
        taxId: 'TAX-APEX-888',
        state: 'Maharashtra',
      },
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  // JOURNEY 1
  describe('Journey 1: Owner sells to Buyer (Offer -> Counter -> Accept -> Complete)', () => {
    let vehicle, listing, offerId;

    it('Step 1.1: Owner creates vehicle and active sale listing', async () => {
      vehicle = await Vehicle.create({
        brand: 'Hyundai',
        model: 'Creta',
        variant: 'SX',
        bodyType: 'SUV',
        manufacturingYear: 2022,
        registrationYear: 2022,
        registrationNumber: 'MH 02 XY 5678',
        fuelType: 'Diesel',
        transmission: 'Automatic',
        kmDriven: 18000,
        condition: 'Excellent',
        colour: 'Polar White',
        location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
        ownerRef: { type: 'user', id: ownerUser._id },
        images: [{ url: '/uploads/images/placeholders/placeholder-suv.svg', isCover: true, order: 0 }],
      });

      listing = await Listing.create({
        vehicleRef: vehicle._id,
        ownerRef: { type: 'user', id: ownerUser._id },
        purpose: 'sale',
        moderationStatus: 'approved',
        sale: {
          status: 'active',
          askingPrice: 150000000, // 15,00,000 INR
          minAcceptableOffer: 135000000,
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      expect(listing._id).toBeDefined();
    });

    it('Step 1.2: Buyer creates initial purchase offer', async () => {
      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 140000000,
          message: 'Interested in a quick transaction this weekend.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('submitted');
      offerId = res.body.data.id || res.body.data._id;
    });

    it('Step 1.3: Owner counters the offer with 14,50,000 INR', async () => {
      const res = await request(app)
        .post(`/api/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 145000000,
          message: 'Lowest I can go is 14.5L with complete service history included.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('counteroffer_made');
      expect(res.body.data.amount).toBe(145000000);
    });

    it('Step 1.4: Buyer accepts the counter offer', async () => {
      const res = await request(app)
        .patch(`/api/offers/${offerId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('accepted');
    });

    it('Step 1.5: Sale is completed, creating transaction and marking listing sold', async () => {
      const res = await request(app)
        .post(`/api/transactions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          offerId: offerId.toString(),
          finalAmount: 145000000,
          notes: 'Payment confirmed via bank transfer. Keys and RC handed over.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.finalAmount).toBe(145000000);

      // Verify listing status transitioned to sold
      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing.sale.status).toBe('sold');
    });
  });

  // JOURNEY 2
  describe('Journey 2: Owner sells to Dealer (Dealer Acquisition Workflow)', () => {
    let vehicle, listing, offerId, acqTransaction;

    it('Step 2.1: Owner lists vehicle available for dealer purchase', async () => {
      vehicle = await Vehicle.create({
        brand: 'Toyota',
        model: 'Innova Crysta',
        variant: 'GX',
        bodyType: 'SUV',
        manufacturingYear: 2021,
        registrationYear: 2021,
        registrationNumber: 'MH 04 CD 9900',
        fuelType: 'Diesel',
        transmission: 'Manual',
        kmDriven: 45000,
        condition: 'Good',
        colour: 'Silver',
        location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
        ownerRef: { type: 'user', id: ownerUser._id },
        images: [{ url: '/uploads/images/placeholders/placeholder-suv.svg', isCover: true, order: 0 }],
      });

      listing = await Listing.create({
        vehicleRef: vehicle._id,
        ownerRef: { type: 'user', id: ownerUser._id },
        purpose: 'sale',
        moderationStatus: 'approved',
        sale: { status: 'active', askingPrice: 180000000 },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      expect(listing._id).toBeDefined();
    });

    it('Step 2.2: Dealer discovers owner listing via dealer discovery endpoint', async () => {
      const res = await request(app)
        .get('/api/dealers/discover-listings')
        .set('Authorization', `Bearer ${dealerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data.items || res.body.data;
      const found = items.some(item => (item.id || item._id).toString() === listing._id.toString());
      expect(found).toBe(true);
    });

    it('Step 2.3: Dealer submits an acquisition offer', async () => {
      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${dealerToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 170000000,
          message: 'Apex Motors direct dealership acquisition offer.',
        });

      expect(res.status).toBe(201);
      offerId = res.body.data.id || res.body.data._id;
    });

    it('Step 2.4: Owner accepts the dealer acquisition offer', async () => {
      const res = await request(app)
        .patch(`/api/offers/${offerId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('accepted');
    });

    it('Step 2.5: Dealer initiates and confirms acquisition', async () => {
      const res = await request(app)
        .post('/api/transactions/acquire')
        .set('Authorization', `Bearer ${dealerToken}`)
        .send({
          offerId: offerId.toString(),
          notes: 'Apex Motors acquisition initiation.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      acqTransaction = res.body.data;

      const confirmRes = await request(app)
        .patch(`/api/transactions/${acqTransaction.id || acqTransaction._id}/acquisition`)
        .set('Authorization', `Bearer ${dealerToken}`)
        .send({ action: 'confirm', notes: 'Payment transferred and vehicle delivered.' });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);

      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing.sale.status).toBe('sold');
    });
  });

  // JOURNEY 3
  describe('Journey 3: Renter books & Owner accepts (Overlap Blocked)', () => {
    let vehicle, listing, booking1Id, booking2Id;
    const startDate = new Date(Date.now() + 5 * 86400000);
    const endDate = new Date(Date.now() + 8 * 86400000);

    it('Step 3.1: Owner lists vehicle for rental', async () => {
      vehicle = await Vehicle.create({
        brand: 'Maruti',
        model: 'Swift',
        variant: 'VXI',
        bodyType: 'Hatchback',
        manufacturingYear: 2023,
        registrationYear: 2023,
        registrationNumber: 'MH 12 AB 3344',
        fuelType: 'Petrol',
        transmission: 'Manual',
        kmDriven: 10000,
        condition: 'Excellent',
        colour: 'Red',
        location: { country: 'India', state: 'Maharashtra', city: 'Pune', pincode: '411001' },
        ownerRef: { type: 'user', id: ownerUser._id },
        images: [{ url: '/uploads/images/placeholders/placeholder-hatchback.svg', isCover: true, order: 0 }],
      });

      listing = await Listing.create({
        vehicleRef: vehicle._id,
        ownerRef: { type: 'user', id: ownerUser._id },
        purpose: 'rent',
        moderationStatus: 'approved',
        rental: {
          status: 'active',
          dailyPrice: 200000, // 2000 INR
          minDays: 1,
          maxDays: 14,
          securityDeposit: 300000,
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      expect(listing._id).toBeDefined();
    });

    it('Step 3.2: Renter 1 requests booking for 3 days', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${renterToken}`)
        .send({
          listingId: listing._id.toString(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          notes: 'Weekend roadtrip to Lonavala.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      booking1Id = res.body.data.booking.id || res.body.data.booking._id;
    });

    it('Step 3.3: Owner accepts booking request', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking1Id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe('confirmed');
    });

    it('Step 3.4: Renter 2 submits overlapping request; Owner attempt to accept is rejected with 409', async () => {
      // Overlaps with day 6 to day 7
      const overlapStart = new Date(Date.now() + 6 * 86400000);
      const overlapEnd = new Date(Date.now() + 9 * 86400000);

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${renterToken2}`)
        .send({
          listingId: listing._id.toString(),
          startDate: overlapStart.toISOString(),
          endDate: overlapEnd.toISOString(),
          notes: 'Overlapping rental request.',
        });

      expect(res.status).toBe(201);
      booking2Id = res.body.data.booking.id || res.body.data.booking._id;

      // Owner attempts to confirm overlapping request -> rejected with 409 RENTAL_DATE_CONFLICT
      const acceptRes = await request(app)
        .patch(`/api/bookings/${booking2Id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ action: 'accept' });

      expect(acceptRes.status).toBe(409);
      expect(acceptRes.body.success).toBe(false);
      expect(acceptRes.body.error.code).toBe('RENTAL_DATE_CONFLICT');
    });
  });

  // JOURNEY 4
  describe('Journey 4: Admin Moderation (Approve Listing and Dealer)', () => {
    let pendingDealerUser, pendingDealerToken, pendingDealerDoc;
    let pendingVehicle, pendingListing;

    it('Step 4.1: New dealer registers with documents in pending state', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'City Star Motors Admin',
          email: 'citystar@motors.local',
          password: 'Password@123',
          passwordConfirm: 'Password@123',
          mobile: '+919833001122',
          capabilities: ['dealer'],
          acceptTerms: true,
        });

      pendingDealerToken = res.headers['set-cookie']
        ? res.headers['set-cookie'][0].split(';')[0].split('=')[1]
        : res.body.data.token;
      pendingDealerUser = res.body.data.user;

      const regRes = await request(app)
        .post('/api/dealers/register')
        .set('Authorization', `Bearer ${pendingDealerToken}`)
        .send({
          dealershipName: 'City Star Auto Hub',
          ownerName: 'Sunil Rao',
          businessEmail: 'sunil@citystar.local',
          phone: '+919833001122',
          address: '45 Commercial Complex, SV Road',
          city: 'Mumbai',
          pincode: '400050',
          registrationInfo: {
            registrationNumber: 'REG-CITYSTAR-101',
            taxId: 'TAX-CITYSTAR-202',
            state: 'Maharashtra',
          },
        });

      expect(regRes.status).toBe(201);
      pendingDealerDoc = regRes.body.data;
      expect(pendingDealerDoc.verificationStatus).toBe('pending');
    });

    it('Step 4.2: Admin reviews and approves the pending dealer', async () => {
      const res = await request(app)
        .patch(`/api/admin/dealers/${pendingDealerDoc.id || pendingDealerDoc._id}/verification`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          notes: 'All documents verified and physical inspection complete.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('approved');
    });

    it('Step 4.3: Seller creates listing that lands in pending_review moderation', async () => {
      pendingVehicle = await Vehicle.create({
        brand: 'Tata',
        model: 'Nexon',
        variant: 'XZ+',
        bodyType: 'SUV',
        manufacturingYear: 2022,
        registrationYear: 2022,
        registrationNumber: 'MH 03 DE 4455',
        fuelType: 'Petrol',
        transmission: 'Manual',
        kmDriven: 15000,
        condition: 'Excellent',
        colour: 'Foliage Green',
        location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
        ownerRef: { type: 'user', id: ownerUser._id },
        images: [{ url: '/uploads/images/placeholders/placeholder-suv.svg', isCover: true, order: 0 }],
      });

      pendingListing = await Listing.create({
        vehicleRef: pendingVehicle._id,
        ownerRef: { type: 'user', id: ownerUser._id },
        purpose: 'sale',
        moderationStatus: 'pending_review',
        sale: { status: 'active', askingPrice: 110000000 },
      });

      expect(pendingListing.moderationStatus).toBe('pending_review');
    });

    it('Step 4.4: Admin approves the listing to make it active', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${pendingListing._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          reason: 'Listing details and photos approved.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.moderationStatus).toBe('approved');
    });
  });

  // JOURNEY 5
  describe('Journey 5: Dealer Bulk Upload Inventory', () => {
    it('Step 5.1: Verified dealer uploads CSV inventory', async () => {
      const headers = 'brand,model,variant,bodyType,manufacturingYear,registrationYear,registrationNumber,fuelType,transmission,kmDriven,previousOwners,condition,colour,seatingCapacity,city,state,pincode,askingPrice,purpose';
      const row1 = 'Maruti,Swift,ZXi,Hatchback,2020,2020,MH02AB1111,Petrol,Manual,30000,1,Good,White,5,Mumbai,Maharashtra,400053,550000,sale';
      const row2 = 'Honda,City,V,Sedan,2021,2021,MH02AB2222,Petrol,Manual,20000,1,Good,Silver,5,Mumbai,Maharashtra,400053,800000,sale';
      const csvContent = `${headers}\n${row1}\n${row2}`;

      const res = await request(app)
        .post('/api/dealers/inventory/bulk-upload?mode=atomic')
        .set('Authorization', `Bearer ${dealerToken}`)
        .send({ csvText: csvContent });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.createdCount).toBe(2);
      expect(res.body.data.errors.length).toBe(0);
    });

    it('Step 5.2: Verify imported vehicles appear in dealer inventory', async () => {
      const res = await request(app)
        .get('/api/dealers/inventory')
        .set('Authorization', `Bearer ${dealerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data.items || res.body.data;
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });
});
