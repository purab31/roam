const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const Offer = require('../src/models/offer.model');
const Transaction = require('../src/models/transaction.model');
const Notification = require('../src/models/notification.model');

describe('Sprint 4: Sale Completion Transactions API', () => {
  let replSet;
  let sellerUser, sellerToken;
  let buyerUser, buyerToken;
  let otherUser, otherToken;
  let listing;
  let acceptedOffer;

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
    await Transaction.deleteMany({});
    await Offer.deleteMany({});
    await Notification.deleteMany({});
    await Listing.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // Seller
    const resSeller = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Karan Mehra',
        email: 'karan@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919811122233',
        capabilities: ['seller'],
        acceptTerms: true,
      });
    sellerToken = resSeller.headers['set-cookie'][0].split(';')[0].split('=')[1];
    sellerUser = resSeller.body.data.user;

    // Buyer
    const resBuyer = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Ananya Sen',
        email: 'ananya@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919811122234',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    buyerToken = resBuyer.headers['set-cookie'][0].split(';')[0].split('=')[1];
    buyerUser = resBuyer.body.data.user;

    // Other
    const resOther = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Rohan Bose',
        email: 'rohan@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919811122235',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    otherToken = resOther.headers['set-cookie'][0].split(';')[0].split('=')[1];
    otherUser = resOther.body.data.user;

    // Vehicle & Listing
    const vehicle = await Vehicle.create({
      brand: 'Maruti',
      model: 'Baleno',
      variant: 'Alpha',
      bodyType: 'Hatchback',
      manufacturingYear: 2021,
      registrationYear: 2021,
      registrationNumber: 'DL01EF9012',
      colour: 'Nexa Blue',
      previousOwners: 1,
      seatingCapacity: 5,
      fuelType: 'Petrol',
      transmission: 'Manual',
      kmDriven: 30000,
      condition: 'Very Good',
      ownerRef: { type: 'user', id: sellerUser._id },
      location: { country: 'India', state: 'Delhi', city: 'Delhi', pincode: '110001' },
    });

    listing = await Listing.create({
      vehicleRef: vehicle._id,
      ownerRef: { type: 'user', id: sellerUser._id },
      purpose: 'sale',
      moderationStatus: 'approved',
      sale: {
        enabled: true,
        status: 'active',
        askingPrice: 75000000, // ₹7,50,000
      },
    });

    acceptedOffer = await Offer.create({
      listing: listing._id,
      offeredBy: buyerUser._id,
      seller: sellerUser._id,
      amount: 72000000,
      status: 'accepted',
      awaitingResponseFrom: 'none',
      history: [
        { actor: buyerUser._id, action: 'submitted', amount: 72000000, timestamp: new Date() },
        { actor: sellerUser._id, action: 'accepted', amount: 72000000, timestamp: new Date() },
      ],
    });
  });

  describe('POST /api/transactions (Completion & Status Authority)', () => {
    it('should record completion transaction, mark listing sold, and mark offer completed', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          offerId: acceptedOffer._id.toString(),
          finalAmount: 72000000,
          notes: 'Cash and bank transfer settlement completed outside platform.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.finalAmount).toBe(72000000);
      expect(res.body.data.transactionType).toBe('sale');

      // Verify listing is now sold (Spec 7.4 & 18.2)
      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing.sale.status).toBe('sold');

      // Verify offer is now completed
      const updatedOffer = await Offer.findById(acceptedOffer._id);
      expect(updatedOffer.status).toBe('completed');
      expect(updatedOffer.history.some(h => h.action === 'completed')).toBe(true);

      // Verify notification created for buyer
      const notifBuyer = await Notification.findOne({ recipient: buyerUser._id, title: 'Vehicle Purchase Completed' });
      expect(notifBuyer).toBeTruthy();
    });

    it('should reject non-seller attempt with 403 Forbidden (Adjustment 5)', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          offerId: acceptedOffer._id.toString(),
          finalAmount: 72000000,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_SELLER');
    });

    it('should reject transaction when offer is not in accepted status with 409 Conflict', async () => {
      const pendingOffer = await Offer.create({
        listing: listing._id,
        offeredBy: otherUser._id,
        seller: sellerUser._id,
        amount: 70000000,
        status: 'submitted',
        awaitingResponseFrom: 'seller',
      });

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          offerId: pendingOffer._id.toString(),
          finalAmount: 70000000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject double submit on same offer with 409 Conflict (Unique index check - Adjustment 5)', async () => {
      // First completion succeeds
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          offerId: acceptedOffer._id.toString(),
          finalAmount: 72000000,
        });

      // Second attempt must fail with 409 Conflict
      const resDuplicate = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          offerId: acceptedOffer._id.toString(),
          finalAmount: 72000000,
        });

      expect(resDuplicate.status).toBe(409);
    });

    it('should return transaction history on GET /api/transactions/my', async () => {
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          offerId: acceptedOffer._id.toString(),
          finalAmount: 72000000,
        });

      const resSeller = await request(app)
        .get('/api/transactions/my')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(resSeller.status).toBe(200);
      expect(resSeller.body.data.items).toHaveLength(1);
      expect(resSeller.body.data.items[0].finalAmount).toBe(72000000);

      const resBuyer = await request(app)
        .get('/api/transactions/my')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(resBuyer.status).toBe(200);
      expect(resBuyer.body.data.items).toHaveLength(1);
    });
  });
});
