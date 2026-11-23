const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const Booking = require('../src/models/booking.model');
const Transaction = require('../src/models/transaction.model');
const UnavailableDate = require('../src/models/unavailableDate.model');
const Notification = require('../src/models/notification.model');

describe('Sprint 7: Rental Lifecycle (Handover, Return, Modify, Cancel, History)', () => {
  let replSet;
  let ownerUser, ownerToken;
  let renterUser, renterToken;
  let renterUser2, renterToken2;
  let listing;

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
    await Booking.deleteMany({});
    await UnavailableDate.deleteMany({});
    await Notification.deleteMany({});
    await Listing.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // 1. Owner
    const resOwner = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Rajesh Sharma',
        email: 'owner.rajesh@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820111111',
        capabilities: ['seller'],
        acceptTerms: true,
      });
    ownerToken = resOwner.headers['set-cookie'][0].split(';')[0].split('=')[1];
    ownerUser = resOwner.body.data.user;

    // 2. Renter 1
    const resRenter = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Karan Mehra',
        email: 'karan@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820111112',
        capabilities: ['renter'],
        acceptTerms: true,
      });
    renterToken = resRenter.headers['set-cookie'][0].split(';')[0].split('=')[1];
    renterUser = resRenter.body.data.user;

    // 3. Renter 2
    const resRenter2 = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Simran Kaur',
        email: 'simran@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820111113',
        capabilities: ['renter'],
        acceptTerms: true,
      });
    renterToken2 = resRenter2.headers['set-cookie'][0].split(';')[0].split('=')[1];
    renterUser2 = resRenter2.body.data.user;

    // 4. Vehicle
    const vehicle = await Vehicle.create({
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX (O)',
      bodyType: 'SUV',
      manufacturingYear: 2022,
      registrationYear: 2022,
      registrationNumber: 'MH 02 AB 1234',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      kmDriven: 18000,
      previousOwners: 1,
      condition: 'Excellent',
      colour: 'Polar White',
      location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001' },
      ownerRef: { type: 'user', id: ownerUser.id || ownerUser._id },
    });

    // 5. Listing with 24h cutoff
    listing = await Listing.create({
      vehicleRef: vehicle._id,
      ownerRef: { type: 'user', id: ownerUser.id || ownerUser._id },
      purpose: 'rent',
      moderationStatus: 'approved',
      rental: {
        dailyPrice: 300000, // Rs 3,000 / day
        weeklyPrice: 1800000, // Rs 18,000 / week
        securityDeposit: 500000, // Rs 5,000 deposit
        minDays: 1,
        maxDays: 30,
        cancellationCutoffHours: 24, // 24 hours cutoff
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup',
        status: 'active',
      },
    });
  });

  describe('1. State Machine: Handover, Return, and Transaction Recording', () => {
    it('progresses confirmed -> active (handed over) -> completed (returned) and creates Transaction', async () => {
      // Create and confirm a booking
      const start = new Date(Date.now() + 10 * 86400000).toISOString();
      const end = new Date(Date.now() + 13 * 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data.booking.id;

      // Owner accepts -> confirmed
      const acceptRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.booking.status).toBe('confirmed');

      // Handover: confirmed -> active
      const handoverRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'handover', reason: 'Keys delivered to renter' });
      expect(handoverRes.status).toBe(200);
      expect(handoverRes.body.data.booking.status).toBe('active');

      // Return: active -> completed
      const returnRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'return', reason: 'Vehicle inspected and returned' });
      expect(returnRes.status).toBe(200);
      expect(returnRes.body.data.booking.status).toBe('completed');

      // Check Transaction record created (Adjustment 6)
      const tx = await Transaction.findOne({ bookingRef: bookingId });
      expect(tx).not.toBeNull();
      expect(tx.transactionType).toBe('rental');
      expect(tx.deposit).toBe(500000);
      // finalAmount must equal rental total excluding deposit: 3 days * 300,000 = 900,000
      expect(tx.finalAmount).toBe(900000);
      expect(tx.buyer.toString()).toBe((renterUser.id || renterUser._id).toString());
      expect(tx.seller.toString()).toBe((ownerUser.id || ownerUser._id).toString());
    });

    it('rejects skipping states: confirmed -> completed fails with 409', async () => {
      const start = new Date(Date.now() + 10 * 86400000).toISOString();
      const end = new Date(Date.now() + 12 * 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      const bookingId = createRes.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      // Attempt direct completion without handover
      const skipRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'complete' });
      expect(skipRes.status).toBe(409);
      expect(skipRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('rejects double completion: second complete call fails with 409 and creates exactly 1 Transaction', async () => {
      const start = new Date(Date.now() + 10 * 86400000).toISOString();
      const end = new Date(Date.now() + 12 * 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      const bookingId = createRes.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'handover' });

      // First complete
      const firstRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'complete' });
      expect(firstRes.status).toBe(200);

      // Second complete
      const secondRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'complete' });
      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');

      const txCount = await Transaction.countDocuments({ bookingRef: bookingId });
      expect(txCount).toBe(1);
    });

    it('rejects cancelling an active rental: active -> cancelled fails with 409', async () => {
      const start = new Date(Date.now() + 10 * 86400000).toISOString();
      const end = new Date(Date.now() + 12 * 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      const bookingId = createRes.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'handover' });

      const cancelRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'cancel' });
      expect(cancelRes.status).toBe(409);
      expect(cancelRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('2. Cancellation Policy Cutoff Window', () => {
    it('allows renter to cancel requested booking at any time without cutoff restrictions', async () => {
      // Booking starting in 2 hours
      const start = new Date(Date.now() + 2 * 3600000).toISOString();
      const end = new Date(Date.now() + 26 * 3600000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      const bookingId = createRes.body.data.booking.id;

      const cancelRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ action: 'cancel', reason: 'Change of plans' });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.booking.status).toBe('cancelled');
    });

    it('allows renter to cancel confirmed booking when outside cutoff window (> 24 hours)', async () => {
      // Booking starting in 48 hours
      const start = new Date(Date.now() + 48 * 3600000).toISOString();
      const end = new Date(Date.now() + 72 * 3600000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      const bookingId = createRes.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      const cancelRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ action: 'cancel', reason: 'Cancelling well in advance' });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.booking.status).toBe('cancelled');
    });

    it('blocks renter from cancelling confirmed booking inside cutoff window (< 24 hours) with 409', async () => {
      // Booking starting in 12 hours (within 24h cutoff)
      const start = new Date(Date.now() + 12 * 3600000).toISOString();
      const end = new Date(Date.now() + 36 * 3600000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      const bookingId = createRes.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      const cancelRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ action: 'cancel' });
      expect(cancelRes.status).toBe(409);
      expect(cancelRes.body.error.code).toBe('CANCELLATION_WINDOW_EXPIRED');

      // But owner CAN cancel even inside the cutoff window
      const ownerCancelRes = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'cancel', reason: 'Owner emergency cancellation' });
      expect(ownerCancelRes.status).toBe(200);
      expect(ownerCancelRes.body.data.booking.status).toBe('cancelled');
    });
  });

  describe('3. Booking Modification Lifecycle & Availability Blocking', () => {
    it('modification_requested keeps blocking original dates, proposed dates do not block until approved', async () => {
      // Booking 1 for Day 10 to Day 14
      const start1 = new Date(Date.now() + 10 * 86400000).toISOString();
      const end1 = new Date(Date.now() + 14 * 86400000).toISOString();

      const createRes1 = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start1, endDate: end1 });
      const bookingId1 = createRes1.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bookingId1}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      // Renter 1 requests modification to Day 20 to Day 24
      const proposedStart = new Date(Date.now() + 20 * 86400000).toISOString();
      const proposedEnd = new Date(Date.now() + 24 * 86400000).toISOString();

      const modRes = await request(app)
        .patch(`/api/bookings/${bookingId1}/modification`)
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ startDate: proposedStart, endDate: proposedEnd, reason: 'Travel rescheduled' });
      expect(modRes.status).toBe(200);
      expect(modRes.body.data.booking.status).toBe('modification_requested');
      expect(modRes.body.data.booking.pendingModification).not.toBeNull();

      // TEST A: Booking 1 in modification_requested STILL BLOCKS its CURRENT dates (Day 10 - 14)
      const overlapCurrentRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken2}`)
        .send({ listingId: listing._id.toString(), startDate: start1, endDate: end1 });
      expect(overlapCurrentRes.status).toBe(201);
      const bookingId2 = overlapCurrentRes.body.data.booking.id;

      // Owner attempting to accept Booking 2 on Day 10-14 must be blocked!
      const acceptRes2 = await request(app)
        .patch(`/api/bookings/${bookingId2}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });
      expect(acceptRes2.status).toBe(409);
      expect(acceptRes2.body.error.code).toBe('RENTAL_DATE_CONFLICT');

      // TEST B: Proposed dates (Day 20 - 24) DO NOT block until approved!
      const overlapProposedRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken2}`)
        .send({ listingId: listing._id.toString(), startDate: proposedStart, endDate: proposedEnd });
      expect(overlapProposedRes.status).toBe(201);
      const bookingId3 = overlapProposedRes.body.data.booking.id;

      // Owner accepts Booking 3 on Day 20-24 -> succeeds!
      const acceptRes3 = await request(app)
        .patch(`/api/bookings/${bookingId3}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });
      expect(acceptRes3.status).toBe(200);

      // Now owner tries to approve Booking 1's modification to Day 20-24 -> MUST FAIL because Booking 3 is now confirmed!
      const approveModRes = await request(app)
        .patch(`/api/bookings/${bookingId1}/modification`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'approve' });
      expect(approveModRes.status).toBe(409);
      expect(approveModRes.body.error.code).toBe('RENTAL_DATE_CONFLICT');

      // Owner can reject modification -> Booking 1 reverts cleanly back to confirmed on original dates
      const rejectModRes = await request(app)
        .patch(`/api/bookings/${bookingId1}/modification`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'reject', reason: 'Dates no longer available' });
      expect(rejectModRes.status).toBe(200);
      expect(rejectModRes.body.data.booking.status).toBe('confirmed');
      expect(rejectModRes.body.data.booking.pendingModification).toBeNull();
      expect(rejectModRes.body.data.booking.modificationHistory.length).toBe(1);
      expect(rejectModRes.body.data.booking.modificationHistory[0].action).toBe('rejected');
    });

    it('approves modification when clear, recalculating pricing and updating history', async () => {
      // Booking for Day 10 to Day 13 (3 days @ 300,000 = 900,000)
      const start = new Date(Date.now() + 10 * 86400000).toISOString();
      const end = new Date(Date.now() + 13 * 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      const bookingId = createRes.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      // Extend to 7 days (weekly pricing = 1,800,000)
      const proposedStart = new Date(Date.now() + 10 * 86400000).toISOString();
      const proposedEnd = new Date(Date.now() + 17 * 86400000).toISOString();

      await request(app)
        .patch(`/api/bookings/${bookingId}/modification`)
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ startDate: proposedStart, endDate: proposedEnd, reason: 'Extending stay to 1 week' });

      const approveRes = await request(app)
        .patch(`/api/bookings/${bookingId}/modification`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'approve' });
      expect(approveRes.status).toBe(200);
      const b = approveRes.body.data.booking;
      expect(b.status).toBe('confirmed');
      expect(b.pricing.days).toBe(7);
      expect(b.pricing.baseRate).toBe(1800000);
      expect(b.modificationHistory.length).toBe(1);
      expect(b.modificationHistory[0].action).toBe('approved');
    });

    it('rejects modification requests after pickup date with 409', async () => {
      // Create confirmed booking starting in the past
      const pastStart = new Date(Date.now() - 2 * 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);

      const pastBooking = await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: pastStart,
        endDate: futureEnd,
        pricing: { baseRate: 600000, days: 4, deposit: 500000, estimatedTotal: 1100000 },
        status: 'confirmed',
      });

      const res = await request(app)
        .patch(`/api/bookings/${pastBooking._id}/modification`)
        .set('Cookie', `roam_token=${renterToken}`)
        .send({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 4 * 86400000).toISOString(),
        });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MODIFICATION_NOT_ALLOWED');
    });
  });

  describe('4. Blocked Dates Manager & Overlap Prevention (Adjustment 9)', () => {
    it('rejects adding blocked dates that overlap a confirmed booking with 409', async () => {
      const start = new Date(Date.now() + 10 * 86400000).toISOString();
      const end = new Date(Date.now() + 14 * 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: start, endDate: end });
      const bookingId = createRes.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      // Owner tries to block Day 12 to 16 (overlaps confirmed booking)
      const overlapStart = new Date(Date.now() + 12 * 86400000).toISOString();
      const overlapEnd = new Date(Date.now() + 16 * 86400000).toISOString();

      const blockRes = await request(app)
        .post(`/api/listings/${listing._id}/unavailable-dates`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ startDate: overlapStart, endDate: overlapEnd, reason: 'Personal holiday' });
      expect(blockRes.status).toBe(409);
      expect(blockRes.body.error.code).toBe('BLOCKED_DATE_CONFLICT');
    });

    it('owner can view blocked dates with notes; public endpoint omits notes', async () => {
      const blockStart = new Date(Date.now() + 30 * 86400000).toISOString();
      const blockEnd = new Date(Date.now() + 35 * 86400000).toISOString();

      await request(app)
        .post(`/api/listings/${listing._id}/unavailable-dates`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ startDate: blockStart, endDate: blockEnd, reason: 'Annual servicing' });

      // Owner endpoint includes notes
      const ownerListRes = await request(app)
        .get(`/api/listings/${listing._id}/unavailable-dates`)
        .set('Cookie', `roam_token=${ownerToken}`);
      expect(ownerListRes.status).toBe(200);
      expect(ownerListRes.body.data.unavailableDates.length).toBe(1);
      expect(ownerListRes.body.data.unavailableDates[0].reason).toBe('Annual servicing');

      // Public availability endpoint omits reason
      const publicAvailRes = await request(app)
        .get(`/api/listings/${listing._id}/availability?from=${blockStart}&to=${blockEnd}`);
      expect(publicAvailRes.status).toBe(200);
      const blockedItem = publicAvailRes.body.data.unavailableDates[0];
      expect(blockedItem.reason).toBeUndefined();
    });
  });

  describe('5. IST Midnight Boundary Handling', () => {
    it('correctly handles booking and modification spanning IST midnight boundary (UTC offset)', async () => {
      // 23:50 IST is 18:20 UTC; next day 00:30 IST is 19:00 UTC
      const startIST = '2026-12-01T23:50:00+05:30';
      const endIST = '2026-12-02T00:30:00+05:30';

      const createRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({ listingId: listing._id.toString(), startDate: startIST, endDate: endIST });
      expect(createRes.status).toBe(201);
      const b = createRes.body.data.booking;
      // Minimum duration is 1 calendar day
      expect(b.pricing.days).toBe(1);
      expect(b.pricing.baseRate).toBe(300000);

      // Confirm
      await request(app)
        .patch(`/api/bookings/${b.id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      // Overlap test on the exact same midnight range with Renter 2
      const overlapRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken2}`)
        .send({ listingId: listing._id.toString(), startDate: startIST, endDate: endIST });
      const b2Id = overlapRes.body.data.booking.id;

      const acceptRes = await request(app)
        .patch(`/api/bookings/${b2Id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });
      expect(acceptRes.status).toBe(409);
      expect(acceptRes.body.error.code).toBe('RENTAL_DATE_CONFLICT');
    });
  });

  describe('6. Rental Earnings Summary & View Filtering', () => {
    it('reports recorded earnings from completed rentals only and includes real monthly sparkline series', async () => {
      // 1. Completed booking
      const start1 = new Date(Date.now() - 5 * 86400000).toISOString();
      const end1 = new Date(Date.now() - 2 * 86400000).toISOString();
      const b1 = await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date(start1),
        endDate: new Date(end1),
        pricing: { baseRate: 600000, days: 3, deposit: 500000, estimatedTotal: 1100000 },
        status: 'completed',
        updatedAt: new Date(),
      });

      // 2. Active booking (does not count towards earnings yet)
      await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        pricing: { baseRate: 300000, days: 1, deposit: 500000, estimatedTotal: 800000 },
        status: 'active',
      });

      const summaryRes = await request(app)
        .get('/api/bookings/summary')
        .set('Cookie', `roam_token=${ownerToken}`);
      expect(summaryRes.status).toBe(200);
      const s = summaryRes.body.data;
      expect(s.totalEarnings).toBe(600000); // Only completed, excludes deposit!
      expect(s.completedCount).toBe(1);
      expect(s.activeCount).toBe(1);
      expect(s.recentEarnings.length).toBe(6); // 6-month real series
    });

    it('filters bookings by view: upcoming, active, completed, cancelled', async () => {
      const renterId = renterUser.id || renterUser._id;
      // Seed 4 bookings in different states
      await Booking.create([
        {
          renter: renterId,
          listing: listing._id,
          ownerRef: listing.ownerRef,
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() + 2 * 86400000),
          pricing: { baseRate: 300000, days: 1, deposit: 0, estimatedTotal: 300000 },
          status: 'confirmed',
        },
        {
          renter: renterId,
          listing: listing._id,
          ownerRef: listing.ownerRef,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          pricing: { baseRate: 300000, days: 1, deposit: 0, estimatedTotal: 300000 },
          status: 'active',
        },
        {
          renter: renterId,
          listing: listing._id,
          ownerRef: listing.ownerRef,
          startDate: new Date(Date.now() - 3 * 86400000),
          endDate: new Date(Date.now() - 86400000),
          pricing: { baseRate: 300000, days: 1, deposit: 0, estimatedTotal: 300000 },
          status: 'completed',
        },
        {
          renter: renterId,
          listing: listing._id,
          ownerRef: listing.ownerRef,
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() + 2 * 86400000),
          pricing: { baseRate: 300000, days: 1, deposit: 0, estimatedTotal: 300000 },
          status: 'cancelled',
        },
      ]);

      const upcomingRes = await request(app)
        .get('/api/bookings?view=upcoming')
        .set('Cookie', `roam_token=${renterToken}`);
      expect(upcomingRes.body.data.items.length).toBe(1);

      const activeRes = await request(app)
        .get('/api/bookings?view=active')
        .set('Cookie', `roam_token=${renterToken}`);
      expect(activeRes.body.data.items.length).toBe(1);

      const completedRes = await request(app)
        .get('/api/bookings?view=completed')
        .set('Cookie', `roam_token=${renterToken}`);
      expect(completedRes.body.data.items.length).toBe(1);

      const cancelledRes = await request(app)
        .get('/api/bookings?view=cancelled')
        .set('Cookie', `roam_token=${renterToken}`);
      expect(cancelledRes.body.data.items.length).toBe(1);
    });
  });
});
