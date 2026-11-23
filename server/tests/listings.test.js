const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');

describe('Sprint 2: Listing Management & State Machine API', () => {
  let mongod;
  let sellerToken;
  let sellerUser;
  let otherSellerToken;
  let otherSellerUser;
  let vehicle;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Listing.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // 1. Create seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Seller One',
        email: 'seller1@roam.local',
        mobile: '+919876543201',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        capabilities: ['seller'],
        acceptTerms: true,
      });
    sellerToken = sellerRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
    sellerUser = sellerRes.body.data.user;

    // 2. Create another seller
    const otherSellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Seller Two',
        email: 'seller2@roam.local',
        mobile: '+919876543202',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        capabilities: ['seller'],
        acceptTerms: true,
      });
    otherSellerToken = otherSellerRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
    otherSellerUser = otherSellerRes.body.data.user;

    // 3. Create a vehicle for seller
    const vehicleRes = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        brand: 'Honda',
        model: 'City',
        bodyType: 'Sedan',
        manufacturingYear: 2021,
        registrationYear: 2021,
        registrationNumber: 'DL 01 AB 9999',
        fuelType: 'Petrol',
        transmission: 'Manual',
        kmDriven: 28000,
        previousOwners: 1,
        condition: 'Very Good',
        colour: 'Modern Steel',
        seatingCapacity: 5,
        location: {
          country: 'India',
          state: 'Delhi',
          city: 'New Delhi',
          area: 'Connaught Place',
          pincode: '110001',
        },
      });
    vehicle = vehicleRes.body.data;
    vehicle.id = vehicle.id || vehicle._id;
  });

  describe('POST /api/listings', () => {
    it('should create a listing with pending_review status when submitted without saveAsDraft', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          vehicleId: vehicle.id,
          purpose: 'sale',
          sale: {
            askingPrice: 95000000, // 9,50,000 INR in paise
            negotiable: true,
            minAcceptableOffer: 90000000,
            description: 'Well maintained family car with complete service records.',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.moderationStatus).toBe('pending_review');
      expect(res.body.data.sale.status).toBe('inactive');
      expect(res.body.data.sale.askingPrice).toBe(95000000);
      expect(res.body.data.sale.minAcceptableOffer).toBe(90000000);
      expect(res.body.data.statusHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('should create a draft listing when saveAsDraft is true', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          vehicleId: vehicle.id,
          purpose: 'sale',
          saveAsDraft: true,
          sale: {
            askingPrice: 95000000,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.moderationStatus).toBe('draft');
      expect(res.body.data.sale.status).toBe('inactive');
    });

    it('should reject listing creation for a vehicle owned by another user with 403', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${otherSellerToken}`)
        .send({
          vehicleId: vehicle.id,
          purpose: 'sale',
          sale: { askingPrice: 95000000 },
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should reject validation when askingPrice is negative', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          vehicleId: vehicle.id,
          purpose: 'sale',
          sale: { askingPrice: -1000 },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject validation when minAcceptableOffer > askingPrice', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          vehicleId: vehicle.id,
          purpose: 'sale',
          sale: {
            askingPrice: 80000000,
            minAcceptableOffer: 85000000,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/listings & GET /api/listings/my (Private Field & Public Stripping)', () => {
    let listingId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          vehicleId: vehicle.id,
          purpose: 'sale',
          sale: {
            askingPrice: 95000000,
            negotiable: true,
            minAcceptableOffer: 90000000,
            description: 'Owner description',
          },
        });
      listingId = res.body.data.id || res.body.data._id;
      await Listing.findByIdAndUpdate(listingId, {
        moderationStatus: 'approved',
        'sale.status': 'active',
      });
    });

    it('should strip minAcceptableOffer and private vehicle fields in public GET /api/listings', async () => {
      const res = await request(app).get('/api/listings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = Array.isArray(res.body.data) ? res.body.data : res.body.data.items;
      expect(items.length).toBe(1);

      const item = items[0];
      expect(item.sale.askingPrice).toBe(95000000);
      // STRICT PRIVACY: minAcceptableOffer must NEVER be returned publicly
      expect(item.sale.minAcceptableOffer).toBeUndefined();

      // Vehicle registrationNumber must be stripped
      if (item.vehicleRef && typeof item.vehicleRef === 'object') {
        expect(item.vehicleRef.registrationNumber).toBeUndefined();
        expect(item.vehicleRef.documents).toBeUndefined();
      }
    });

    it('should return all owner listings including minAcceptableOffer in GET /api/listings/my', async () => {
      const res = await request(app)
        .get('/api/listings/my')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].sale.minAcceptableOffer).toBe(90000000);
    });
  });

  describe('PATCH /api/listings/:id/status (State Machine & ConflictError)', () => {
    let listingId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          vehicleId: vehicle.id,
          purpose: 'sale',
          sale: { askingPrice: 95000000 },
        });
      listingId = res.body.data.id || res.body.data._id;
      await Listing.findByIdAndUpdate(listingId, {
        moderationStatus: 'approved',
        'sale.status': 'active',
      });
    });

    it('should allow valid status transitions: active -> inactive -> active', async () => {
      // 1. Deactivate
      const deactRes = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'deactivate' });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.sale.status).toBe('inactive');

      // 2. Reactivate
      const actRes = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'activate' });

      expect(actRes.status).toBe(200);
      expect(actRes.body.data.sale.status).toBe('active');
    });

    it('should allow reserving and unreserving: active -> reserved -> unreserve (active)', async () => {
      // 1. Reserve
      const resRes = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'reserve' });

      expect(resRes.status).toBe(200);
      expect(resRes.body.data.sale.status).toBe('reserved');

      // 2. Unreserve
      const unresRes = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'unreserve' });

      expect(unresRes.status).toBe(200);
      expect(unresRes.body.data.sale.status).toBe('active');
    });

    it('should allow marking as sold and then REJECT reactivating sold with 409 ConflictError', async () => {
      // 1. Mark sold
      const soldRes = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'sold' });

      expect(soldRes.status).toBe(200);
      expect(soldRes.body.data.sale.status).toBe('sold');

      // 2. Attempt to reactivate sold listing -> 409 INVALID_STATUS_TRANSITION
      const invalidRes = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'activate' });

      expect(invalidRes.status).toBe(409);
      expect(invalidRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should return 403 when another user attempts to change status', async () => {
      const res = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${otherSellerToken}`)
        .send({ action: 'deactivate' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });
  });

  describe('DELETE /api/listings/:id (Soft Delete)', () => {
    let listingId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          vehicleId: vehicle.id,
          purpose: 'sale',
          sale: { askingPrice: 95000000 },
        });
      listingId = res.body.data.id || res.body.data._id;
    });

    it('should soft-delete listing by setting moderationStatus to removed and logging statusHistory', async () => {
      const res = await request(app)
        .delete(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listing.moderationStatus).toBe('removed');
      expect(res.body.data.listing.sale.status).toBe('inactive');

      // Verify listing still exists in database with 'removed' status
      const dbListing = await Listing.findById(listingId);
      expect(dbListing).not.toBeNull();
      expect(dbListing.moderationStatus).toBe('removed');
      expect(dbListing.statusHistory.some(h => h.toStatus === 'removed')).toBe(true);
    });

    it('should return 403 when another user attempts to delete listing', async () => {
      const res = await request(app)
        .delete(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${otherSellerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });
  });
});
