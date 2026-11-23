const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const Dealer = require('../src/models/dealer.model');
const Booking = require('../src/models/booking.model');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

describe('Sprint 10: Security & Negative Authorization Table-Driven Tests', () => {
  let replSet;
  const pwd = 'Password@123';
  let ownerUser, otherUser, dealerUser, otherDealerUser, blockedUser, deactivatedUser;
  let ownerToken, otherToken, dealerToken, otherDealerToken, blockedToken, deactivatedToken;
  let vehicle, listing, dealerDoc, booking;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri());

    const pwd = 'Password@123';

    // 1. Owner User
    ownerUser = await User.create({
      fullName: 'Owner Seller',
      email: 'owner@roam.local',
      mobile: '+919811000001',
      passwordHash: pwd,
      capabilities: ['buyer', 'seller'],
      accountStatus: 'active',
    });
    ownerToken = jwt.sign({ id: ownerUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 2. Other User
    otherUser = await User.create({
      fullName: 'Other Buyer',
      email: 'other@roam.local',
      mobile: '+919811000002',
      passwordHash: pwd,
      capabilities: ['buyer'],
      accountStatus: 'active',
    });
    otherToken = jwt.sign({ id: otherUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 3. Dealer User
    dealerUser = await User.create({
      fullName: 'Dealer Dave',
      email: 'dealer@roam.local',
      mobile: '+919811000003',
      passwordHash: pwd,
      capabilities: ['buyer', 'dealer'],
      accountStatus: 'active',
    });
    dealerToken = jwt.sign({ id: dealerUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 4. Other Dealer User
    otherDealerUser = await User.create({
      fullName: 'Other Dealer',
      email: 'otherdealer@roam.local',
      mobile: '+919811000004',
      passwordHash: pwd,
      capabilities: ['buyer', 'dealer'],
      accountStatus: 'active',
    });
    otherDealerToken = jwt.sign({ id: otherDealerUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 5. Blocked User
    blockedUser = await User.create({
      fullName: 'Blocked User',
      email: 'blocked@roam.local',
      mobile: '+919811000005',
      passwordHash: pwd,
      capabilities: ['buyer', 'seller'],
      accountStatus: 'blocked',
    });
    blockedToken = jwt.sign({ id: blockedUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 6. Deactivated User
    deactivatedUser = await User.create({
      fullName: 'Deactivated User',
      email: 'deactivated@roam.local',
      mobile: '+919811000006',
      passwordHash: pwd,
      capabilities: ['buyer', 'seller'],
      accountStatus: 'deactivated',
    });
    deactivatedToken = jwt.sign({ id: deactivatedUser._id }, config.jwtSecret, { expiresIn: '1d' });

    // 7. Seed Dealer Doc
    dealerDoc = await Dealer.create({
      user: dealerUser._id,
      dealershipName: 'Dave Premier Motors',
      ownerName: 'Dave Premier',
      businessEmail: 'dealer@roam.local',
      phone: '+919811000003',
      address: 'Main Rd',
      city: 'Mumbai',
      pincode: '400001',
      registrationInfo: {
        registrationNumber: 'REG-DAVE-101',
        taxId: 'TAX-DAVE-202',
        state: 'Maharashtra',
      },
      verificationStatus: 'approved',
      documents: [{ name: 'License', url: '/uploads/documents/fake-dealer.pdf', fileType: 'application/pdf', size: 100 }],
    });

    // 8. Seed Vehicle & Listing
    vehicle = await Vehicle.create({
      brand: 'Honda',
      model: 'City',
      variant: 'ZX',
      bodyType: 'Sedan',
      manufacturingYear: 2021,
      registrationYear: 2021,
      registrationNumber: 'MH 01 AB 1234',
      fuelType: 'Petrol',
      transmission: 'Manual',
      kmDriven: 20000,
      condition: 'Excellent',
      colour: 'White',
      location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
      ownerRef: { type: 'user', id: ownerUser._id },
      documents: [{ name: 'RC', url: '/uploads/documents/fake-rc.pdf', fileType: 'application/pdf', size: 50 }],
      images: [{ url: '/uploads/images/placeholders/placeholder-sedan.svg', isCover: true, order: 0 }],
    });

    listing = await Listing.create({
      vehicleRef: vehicle._id,
      ownerRef: { type: 'user', id: ownerUser._id },
      purpose: 'both',
      moderationStatus: 'approved',
      sale: { status: 'active', askingPrice: 90000000 },
      rental: { dailyPrice: 250000, minDays: 1, maxDays: 30 },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // 9. Seed Booking
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
    booking = await Booking.create({
      listing: listing._id,
      renter: otherUser._id,
      ownerRef: { type: 'user', id: ownerUser._id },
      startDate: tomorrow,
      endDate: dayAfter,
      pricing: {
        baseRate: 250000,
        days: 1,
        additionalCharges: 0,
        deposit: 500000,
        estimatedTotal: 750000,
      },
      status: 'pending',
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. Static File Serving Security (Fix 1)', () => {
    it('should return 404 for direct unauthenticated document request at /uploads/documents', async () => {
      const res = await request(app).get('/uploads/documents/fake-rc.pdf');
      expect(res.status).toBe(404);
    });

    it('should return 200 for public placeholder images at /uploads/images/placeholders', async () => {
      const res = await request(app).get('/uploads/images/placeholders/placeholder-suv.svg');
      expect(res.status).toBe(200);
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });
  });

  describe('2. Negative Authorization: Document Downloads', () => {
    it('should reject unauthenticated request for private vehicle document with 401', async () => {
      const docId = vehicle.documents[0]._id;
      const res = await request(app).get(`/api/vehicles/${vehicle._id}/documents/${docId}/download`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_ERROR');
    });

    it('should reject non-owner user request for private vehicle document with 403', async () => {
      const docId = vehicle.documents[0]._id;
      const res = await request(app)
        .get(`/api/vehicles/${vehicle._id}/documents/${docId}/download`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should reject non-owner user request for dealer document download with 403', async () => {
      const docId = dealerDoc.documents[0]._id;
      const res = await request(app)
        .get(`/api/dealers/${dealerDoc._id}/documents/${docId}/download`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });
  });

  describe('3. Negative Authorization: Ownership & Status Controls', () => {
    it('should deny non-owner from updating listing status with 403', async () => {
      const res = await request(app)
        .patch(`/api/listings/${listing._id}/status`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: 'reserved' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should deny non-owner from renewing listing with 403', async () => {
      const res = await request(app)
        .post(`/api/listings/${listing._id}/renew`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should deny non-owner from managing unavailable dates with 403', async () => {
      const res = await request(app)
        .post(`/api/listings/${listing._id}/unavailable-dates`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString(),
          reason: 'Maintenance',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should deny non-dealer from calling bulk inventory status with 403', async () => {
      const res = await request(app)
        .patch('/api/dealers/inventory/bulk-status')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ listingIds: [listing._id.toString()], action: 'deactivate' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_DEALER');
    });

    it('should deny unrelated user from updating booking status with 403', async () => {
      // Third user not owner and not renter
      const thirdUser = await User.create({
        fullName: 'Third Person',
        email: 'third@roam.local',
        mobile: '+919811000099',
        passwordHash: pwd,
        capabilities: ['buyer'],
        accountStatus: 'active',
      });
      const thirdToken = jwt.sign({ id: thirdUser._id }, config.jwtSecret, { expiresIn: '1d' });

      const res = await request(app)
        .patch(`/api/bookings/${booking._id}/status`)
        .set('Authorization', `Bearer ${thirdToken}`)
        .send({ action: 'cancel' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should deny unrelated user from requesting booking modification with 403', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking._id}/modification`)
        .set('Authorization', `Bearer ${dealerToken}`)
        .send({
          startDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 4 * 86400000).toISOString(),
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should deny non-owner from uploading dealer logo with 403', async () => {
      const pngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
      const res = await request(app)
        .post(`/api/dealers/${dealerDoc._id}/logo`)
        .set('Authorization', `Bearer ${otherDealerToken}`)
        .attach('logo', pngBuffer, 'test.png');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should deny non-owner from uploading dealer documents with 403', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%test\n%%EOF');
      const res = await request(app)
        .post(`/api/dealers/${dealerDoc._id}/documents`)
        .set('Authorization', `Bearer ${otherDealerToken}`)
        .attach('document', pdfBuffer, 'test.pdf');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });
  });

  describe('4. Negative Authorization: User States (Blocked, Deactivated, Capability)', () => {
    it('should reject blocked user on any authenticated route with 403', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${blockedToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('blocked');
    });

    it('should reject deactivated user from creating listings with 403', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${deactivatedToken}`)
        .send({
          vehicleId: vehicle._id.toString(),
          purpose: 'sale',
          sale: { askingPrice: 50000000 },
        });
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Deactivated');
    });

    it('should reject granting dealer or admin capability via POST /api/users/capabilities with 400', async () => {
      const resAdmin = await request(app)
        .post('/api/users/capabilities')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ capability: 'admin' });
      expect(resAdmin.status).toBe(400);

      const resDealer = await request(app)
        .post('/api/users/capabilities')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ capability: 'dealer' });
      expect(resDealer.status).toBe(400);
    });

    it('should reject unauthenticated request for password change with 401', async () => {
      const res = await request(app)
        .put('/api/users/password')
        .send({ currentPassword: 'Password@123', newPassword: 'NewPassword@123' });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated request for account deactivation with 401', async () => {
      const res = await request(app).patch('/api/users/account-status');
      expect(res.status).toBe(401);
    });
  });
});
