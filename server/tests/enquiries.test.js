const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const Enquiry = require('../src/models/enquiry.model');
const Notification = require('../src/models/notification.model');

describe('Sprint 4: Enquiries & Communication API', () => {
  let mongod;
  let sellerUser, sellerToken;
  let buyerUser, buyerToken;
  let otherUser, otherToken;
  let deactivatedUser, deactivatedToken;
  let listing;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'roam_test' },
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Enquiry.deleteMany({});
    await Notification.deleteMany({});
    await Listing.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // 1. Seller user
    const resSeller = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Seller Sharma',
        email: 'seller@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919876543210',
        capabilities: ['seller'],
        acceptTerms: true,
      });
    sellerToken = resSeller.headers['set-cookie'][0].split(';')[0].split('=')[1];
    sellerUser = resSeller.body.data.user;

    // 2. Buyer user
    const resBuyer = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Buyer Roy',
        email: 'buyer@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919876543211',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    buyerToken = resBuyer.headers['set-cookie'][0].split(';')[0].split('=')[1];
    buyerUser = resBuyer.body.data.user;

    // 3. Third-party user
    const resOther = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Other Person',
        email: 'other@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919876543212',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    otherToken = resOther.headers['set-cookie'][0].split(';')[0].split('=')[1];
    otherUser = resOther.body.data.user;

    // 4. Deactivated user
    const resDeact = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Deactivated User',
        email: 'deact@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919876543213',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    deactivatedToken = resDeact.headers['set-cookie'][0].split(';')[0].split('=')[1];
    deactivatedUser = resDeact.body.data.user;
    await User.findByIdAndUpdate(deactivatedUser._id, { accountStatus: 'deactivated' });

    // 5. Create Vehicle & Listing
    const vehicle = await Vehicle.create({
      brand: 'Honda',
      model: 'City',
      variant: 'ZX CVT',
      bodyType: 'Sedan',
      manufacturingYear: 2021,
      registrationYear: 2021,
      registrationNumber: 'MH01AB1234',
      colour: 'Polar White',
      previousOwners: 1,
      seatingCapacity: 5,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      kmDriven: 25000,
      condition: 'Excellent',
      ownerRef: { type: 'user', id: sellerUser._id },
      location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
    });

    listing = await Listing.create({
      vehicleRef: vehicle._id,
      ownerRef: { type: 'user', id: sellerUser._id },
      purpose: 'sale',
      moderationStatus: 'approved',
      sale: {
        enabled: true,
        status: 'active',
        askingPrice: 125000000, // ₹12,50,000 in paise
        negotiable: true,
      },
    });
  });

  describe('POST /api/enquiries', () => {
    it('should successfully submit an enquiry and notify the seller', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: listing._id.toString(),
          subject: 'Inspection request',
          message: 'Can I inspect the vehicle this weekend in Mumbai?',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subject).toBe('Inspection request');
      expect(res.body.data.status).toBe('open');
      expect(res.body.data.enquirer.toString()).toBe(buyerUser._id);
      expect(res.body.data.recipient.toString()).toBe(sellerUser._id);

      // Verify notification created for seller
      const notif = await Notification.findOne({ recipient: sellerUser._id, type: 'enquiry' });
      expect(notif).toBeTruthy();
      expect(notif.title).toBe('New Vehicle Enquiry');
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .send({
          listingId: listing._id.toString(),
          subject: 'General Question',
          message: 'Is the price negotiable?',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_ERROR');
    });

    it('should reject enquiry with 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: listing._id.toString(),
          message: 'Hi',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject self-enquiry with 403 Forbidden (Adjustment 8)', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          listingId: listing._id.toString(),
          subject: 'Self enquiry',
          message: 'Testing enquiry on own vehicle',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_SELF_ENQUIRY');
    });

    it('should block deactivated accounts from submitting enquiries with 403', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${deactivatedToken}`)
        .send({
          listingId: listing._id.toString(),
          subject: 'Deactivated test',
          message: 'Should not be allowed',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
      expect(res.body.error.message).toContain('deactivated');
    });
  });

  describe('GET /api/enquiries & /:id (Threading & Permissions)', () => {
    let enquiryId;

    beforeEach(async () => {
      const enquiry = await Enquiry.create({
        enquirer: buyerUser._id,
        listing: listing._id,
        recipient: sellerUser._id,
        subject: 'Service records inquiry',
        message: 'Do you have full authorized dealer service history?',
        status: 'open',
      });
      enquiryId = enquiry._id.toString();
    });

    it('should return sent enquiries to the buyer and received enquiries to the seller', async () => {
      const resBuyer = await request(app)
        .get('/api/enquiries?type=sent')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(resBuyer.status).toBe(200);
      expect(resBuyer.body.data.items).toHaveLength(1);
      expect(resBuyer.body.data.items[0].subject).toBe('Service records inquiry');

      const resSeller = await request(app)
        .get('/api/enquiries?type=received')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(resSeller.status).toBe(200);
      expect(resSeller.body.data.items).toHaveLength(1);
    });

    it('should allow participant to view single enquiry thread on GET /:id', async () => {
      const res = await request(app)
        .get(`/api/enquiries/${enquiryId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(enquiryId);
      expect(res.body.data.listing).toBeTruthy();
    });

    it('should block non-participant third party from viewing thread with 403 (Adjustment 8)', async () => {
      const res = await request(app)
        .get(`/api/enquiries/${enquiryId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_PARTICIPANT');
    });

    it('should allow seller to reply, transitioning status to answered and notifying buyer', async () => {
      const res = await request(app)
        .post(`/api/enquiries/${enquiryId}/replies`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          message: 'Yes, full service history available at Honda South Mumbai.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.replies).toHaveLength(1);
      expect(res.body.data.status).toBe('answered');

      // Verify notification for buyer
      const notif = await Notification.findOne({ recipient: buyerUser._id, type: 'enquiry' });
      expect(notif).toBeTruthy();
      expect(notif.title).toBe('New Reply on Enquiry');
    });

    it('should allow updating status to resolved', async () => {
      const res = await request(app)
        .patch(`/api/enquiries/${enquiryId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');
    });
  });
});
