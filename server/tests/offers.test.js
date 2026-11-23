const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const Offer = require('../src/models/offer.model');
const Notification = require('../src/models/notification.model');

describe('Sprint 4: Offers, Negotiations & Acceptance API', () => {
  let replSet;
  let sellerUser, sellerToken;
  let buyerUser, buyerToken;
  let competingBuyerUser, competingBuyerToken;
  let otherUser, otherToken;
  let deactivatedUser, deactivatedToken;
  let listing;

  beforeAll(async () => {
    // MongoMemoryReplSet for MongoDB transaction testing (Adjustment 1)
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
    await Offer.deleteMany({});
    await Notification.deleteMany({});
    await Listing.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // 1. Seller
    const resSeller = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Aarav Patel',
        email: 'seller.aarav@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820011223',
        capabilities: ['seller'],
        acceptTerms: true,
      });
    sellerToken = resSeller.headers['set-cookie'][0].split(';')[0].split('=')[1];
    sellerUser = resSeller.body.data.user;

    // 2. Buyer 1
    const resBuyer = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Vikram Mehta',
        email: 'vikram@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820011224',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    buyerToken = resBuyer.headers['set-cookie'][0].split(';')[0].split('=')[1];
    buyerUser = resBuyer.body.data.user;

    // 3. Competing Buyer 2
    const resCompBuyer = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Pooja Nair',
        email: 'pooja@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820011225',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    competingBuyerToken = resCompBuyer.headers['set-cookie'][0].split(';')[0].split('=')[1];
    competingBuyerUser = resCompBuyer.body.data.user;

    // 4. Other third-party
    const resOther = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Sneha Rao',
        email: 'sneha@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820011226',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    otherToken = resOther.headers['set-cookie'][0].split(';')[0].split('=')[1];
    otherUser = resOther.body.data.user;

    // 5. Deactivated User
    const resDeact = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Deact Offerer',
        email: 'deact.offer@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820011227',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    deactivatedToken = resDeact.headers['set-cookie'][0].split(';')[0].split('=')[1];
    deactivatedUser = resDeact.body.data.user;
    await User.findByIdAndUpdate(deactivatedUser._id, { accountStatus: 'deactivated' });

    // 6. Seed Vehicle & Active Listing with private minimum acceptable offer
    const vehicle = await Vehicle.create({
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX (O)',
      bodyType: 'SUV',
      manufacturingYear: 2022,
      registrationYear: 2022,
      registrationNumber: 'KA01CD5678',
      colour: 'Titan Grey',
      previousOwners: 1,
      seatingCapacity: 5,
      fuelType: 'Diesel',
      transmission: 'Manual',
      kmDriven: 18000,
      condition: 'Excellent',
      ownerRef: { type: 'user', id: sellerUser._id },
      location: { country: 'India', state: 'Karnataka', city: 'Bengaluru', pincode: '560001' },
    });

    listing = await Listing.create({
      vehicleRef: vehicle._id,
      ownerRef: { type: 'user', id: sellerUser._id },
      purpose: 'sale',
      moderationStatus: 'approved',
      sale: {
        enabled: true,
        status: 'active',
        askingPrice: 150000000, // ₹15,00,000
        negotiable: true,
        minAcceptableOffer: 135000000, // ₹13,50,000 private minimum
      },
    });
  });

  describe('POST /api/offers (Offer Submission & Guards)', () => {
    it('should successfully submit an offer and notify the seller', async () => {
      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 140000000, // ₹14,00,000
          message: 'Can close the deal within 3 days.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(140000000);
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.awaitingResponseFrom).toBe('seller');
      expect(res.body.data.history).toHaveLength(1);
      expect(res.body.data.history[0].action).toBe('submitted');
      // Buyer response must NOT include isBelowMinimum (Adjustment 2)
      expect(res.body.data.isBelowMinimum).toBeUndefined();

      // Verify seller notification
      const notif = await Notification.findOne({ recipient: sellerUser._id, type: 'offer' });
      expect(notif).toBeTruthy();
      expect(notif.title).toBe('New Purchase Offer Received');
    });

    it('should accept offer below minAcceptableOffer and set isBelowMinimum for seller only (Adjustment 2)', async () => {
      // Amount ₹12,00,000 is below minimum of ₹13,50,000
      const resBuyer = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 120000000,
          message: 'My best offer for quick cash settlement.',
        });

      expect(resBuyer.status).toBe(201);
      expect(resBuyer.body.data.isBelowMinimum).toBeUndefined(); // Hidden from buyer!

      // Check seller's received offers: must show isBelowMinimum: true
      const resSeller = await request(app)
        .get('/api/offers/received')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(resSeller.status).toBe(200);
      expect(resSeller.body.data.items).toHaveLength(1);
      expect(resSeller.body.data.items[0].isBelowMinimum).toBe(true);
    });

    it('should reject offer on reserved listing with 409 Conflict (Spec 18.2)', async () => {
      await Listing.findByIdAndUpdate(listing._id, { 'sale.status': 'reserved' });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 140000000,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject offer on sold listing with 409 Conflict (Spec 18.2)', async () => {
      await Listing.findByIdAndUpdate(listing._id, { 'sale.status': 'sold' });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 140000000,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject offer on inactive listing with 409 Conflict', async () => {
      await Listing.findByIdAndUpdate(listing._id, { 'sale.status': 'inactive' });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 140000000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject self-offer with 403 Forbidden (Adjustment 8)', async () => {
      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 140000000,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_SELF_OFFER');
    });

    it('should block deactivated accounts from offering with 403', async () => {
      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${deactivatedToken}`)
        .send({
          listingId: listing._id.toString(),
          amount: 140000000,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
      expect(res.body.error.message).toContain('deactivated');
    });
  });

  describe('Negotiation Thread, Counteroffers & Turn Awareness (Adjustment 4)', () => {
    let offerId;

    beforeEach(async () => {
      const offer = await Offer.create({
        listing: listing._id,
        offeredBy: buyerUser._id,
        seller: sellerUser._id,
        amount: 138000000,
        message: 'Initial buyer offer',
        status: 'submitted',
        awaitingResponseFrom: 'seller',
        history: [
          {
            actor: buyerUser._id,
            action: 'submitted',
            amount: 138000000,
            message: 'Initial buyer offer',
            timestamp: new Date(),
          },
        ],
      });
      offerId = offer._id.toString();
    });

    it('should reject buyer attempting to accept or counter when awaiting seller (Adjustment 4)', async () => {
      // Buyer attempts to accept their own offer
      const resAccept = await request(app)
        .patch(`/api/offers/${offerId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'accepted' });

      expect(resAccept.status).toBe(403);
      expect(resAccept.body.error.code).toBe('FORBIDDEN_WRONG_ACTOR');

      // Buyer attempts to counter their own offer before seller responds
      const resCounter = await request(app)
        .post(`/api/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 142000000 });

      expect(resCounter.status).toBe(403);
      expect(resCounter.body.error.code).toBe('FORBIDDEN_WRONG_ACTOR');
    });

    it('should allow seller to counteroffer, setting awaitingResponseFrom to buyer', async () => {
      const res = await request(app)
        .post(`/api/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          amount: 145000000, // ₹14,50,000
          message: 'Can meet you at ₹14.5L final.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('counteroffer_made');
      expect(res.body.data.amount).toBe(145000000);
      expect(res.body.data.awaitingResponseFrom).toBe('buyer');
      expect(res.body.data.history).toHaveLength(2);

      // Verify notification for buyer
      const notif = await Notification.findOne({ recipient: buyerUser._id, type: 'offer', title: 'Counteroffer Received' });
      expect(notif).toBeTruthy();
    });

    it('should reject seller attempting to accept/counter when awaiting buyer', async () => {
      // Seller counters first
      await request(app)
        .post(`/api/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 145000000 });

      // Seller attempts to counter again before buyer responds
      const res = await request(app)
        .post(`/api/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 143000000 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_WRONG_ACTOR');
    });

    it('should allow buyer to withdraw offer at any time before acceptance', async () => {
      const res = await request(app)
        .patch(`/api/offers/${offerId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'withdrawn' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('withdrawn');
      expect(res.body.data.awaitingResponseFrom).toBe('none');

      // Subsequent actions on withdrawn offer throw 409
      const resNext = await request(app)
        .post(`/api/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 140000000 });

      expect(resNext.status).toBe(409);
      expect(resNext.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject non-participant from viewing thread with 403 (Adjustment 8)', async () => {
      const res = await request(app)
        .get(`/api/offers/${offerId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_PARTICIPANT');
    });
  });

  describe('Offer Acceptance & Concurrency (Adjustments 3, 6, 9 & Spec 18.2)', () => {
    let offer1Id, offer2Id;

    beforeEach(async () => {
      // Create two competing offers on the same listing
      const offer1 = await Offer.create({
        listing: listing._id,
        offeredBy: buyerUser._id,
        seller: sellerUser._id,
        amount: 140000000,
        status: 'submitted',
        awaitingResponseFrom: 'seller',
        history: [{ actor: buyerUser._id, action: 'submitted', amount: 140000000, timestamp: new Date() }],
      });
      offer1Id = offer1._id.toString();

      const offer2 = await Offer.create({
        listing: listing._id,
        offeredBy: competingBuyerUser._id,
        seller: sellerUser._id,
        amount: 142000000,
        status: 'submitted',
        awaitingResponseFrom: 'seller',
        history: [{ actor: competingBuyerUser._id, action: 'submitted', amount: 142000000, timestamp: new Date() }],
      });
      offer2Id = offer2._id.toString();
    });

    it('should accept offer in MongoDB transaction, close competing active offers, and NOT mark listing sold', async () => {
      const res = await request(app)
        .patch(`/api/offers/${offer1Id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('accepted');
      expect(res.body.data.awaitingResponseFrom).toBe('none');

      // Verify competing offer 2 was automatically closed/rejected
      const closedOffer2 = await Offer.findById(offer2Id);
      expect(closedOffer2.status).toBe('rejected');
      expect(closedOffer2.history.some(h => h.action === 'closed_competing_offer')).toBe(true);

      // Verify listing is NOT marked sold (Adjustment 3 & Spec 18.2)
      const currentListing = await Listing.findById(listing._id);
      expect(currentListing.sale.status).not.toBe('sold');

      // Verify competing buyer received 'Offer Closed' notification (Adjustment 9)
      const notifClosed = await Notification.findOne({
        recipient: competingBuyerUser._id,
        title: 'Offer Closed',
      });
      expect(notifClosed).toBeTruthy();

      // Verify accepted buyer received 'Offer Accepted!' notification
      const notifAccepted = await Notification.findOne({
        recipient: buyerUser._id,
        title: 'Offer Accepted!',
      });
      expect(notifAccepted).toBeTruthy();
    });

    it('should handle concurrent accept requests so only one can succeed (Race condition test)', async () => {
      // Fire two concurrent accept calls for offer1 and offer2 simultaneously
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/offers/${offer1Id}/status`)
          .set('Authorization', `Bearer ${sellerToken}`)
          .send({ status: 'accepted' }),
        request(app)
          .patch(`/api/offers/${offer2Id}/status`)
          .set('Authorization', `Bearer ${sellerToken}`)
          .send({ status: 'accepted' }),
      ]);

      const statuses = [res1.status, res2.status];
      // Exactly one must succeed (200) and one must be rejected (409 Conflict)
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      // Verify only one offer in the database is in accepted status
      const acceptedOffers = await Offer.find({ listing: listing._id, status: 'accepted' });
      expect(acceptedOffers).toHaveLength(1);
    });
  });
});
