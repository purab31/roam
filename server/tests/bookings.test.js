const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const Booking = require('../src/models/booking.model');
const UnavailableDate = require('../src/models/unavailableDate.model');
const Notification = require('../src/models/notification.model');

describe('Sprint 6: Rental Bookings, Availability & Overlap Concurrency', () => {
  let replSet;
  let ownerUser, ownerToken;
  let renterUser, renterToken;
  let renterUser2, renterToken2;
  let deactivatedUser, deactivatedToken;
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

    // 4. Deactivated User
    const resDeact = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Deactivated User',
        email: 'deactivated@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919820111114',
        capabilities: ['renter'],
        acceptTerms: true,
      });
    deactivatedToken = resDeact.headers['set-cookie'][0].split(';')[0].split('=')[1];
    deactivatedUser = resDeact.body.data.user;
    await User.findByIdAndUpdate(deactivatedUser.id || deactivatedUser._id, {
      accountStatus: 'deactivated',
    });

    // 5. Vehicle owned by owner
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

    // 6. Rental Listing
    listing = await Listing.create({
      vehicleRef: vehicle._id,
      ownerRef: { type: 'user', id: ownerUser.id || ownerUser._id },
      purpose: 'rent',
      moderationStatus: 'approved',
      rental: {
        dailyPrice: 250000, // ₹2,500 / day
        weeklyPrice: 1500000, // ₹15,000 / week
        securityDeposit: 1000000, // ₹10,000 deposit
        minDays: 2,
        maxDays: 30,
        status: 'active',
      },
      statusHistory: [],
    });
  });

  describe('Booking Request Creation & Validation', () => {
    test('renter successfully submits a valid booking request', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({
          listingId: listing._id.toString(),
          startDate: '2026-12-01T10:00:00.000Z',
          endDate: '2026-12-05T10:00:00.000Z', // 4 days
          notes: 'Family vacation trip',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const booking = res.body.data.booking;
      expect(booking.status).toBe('requested');
      expect(booking.pricing.days).toBe(4);
      expect(booking.pricing.baseRate).toBe(4 * 250000); // 1,000,000 paise (₹10,000)
      expect(booking.pricing.deposit).toBe(1000000);
      expect(booking.pricing.estimatedTotal).toBe(2000000);

      // Notification sent to owner
      const notification = await Notification.findOne({
        recipient: ownerUser.id || ownerUser._id,
      });
      expect(notification).not.toBeNull();
      expect(notification.type).toBe('rental');
      expect(notification.title).toBe('New Rental Booking Request');
    });

    test('rejects unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          listingId: listing._id.toString(),
          startDate: '2026-12-01T10:00:00.000Z',
          endDate: '2026-12-05T10:00:00.000Z',
        });

      expect(res.status).toBe(401);
    });

    test('blocks deactivated user with 403', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${deactivatedToken}`)
        .send({
          listingId: listing._id.toString(),
          startDate: '2026-12-01T10:00:00.000Z',
          endDate: '2026-12-05T10:00:00.000Z',
        });

      expect(res.status).toBe(403);
    });

    test('owner cannot book their own listing (403 CANNOT_BOOK_OWN_LISTING)', async () => {
      // Give owner renter capability temporarily to test self-booking prevention
      await User.findByIdAndUpdate(ownerUser.id || ownerUser._id, {
        capabilities: ['seller', 'renter'],
      });

      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({
          listingId: listing._id.toString(),
          startDate: '2026-12-01T10:00:00.000Z',
          endDate: '2026-12-05T10:00:00.000Z',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CANNOT_BOOK_OWN_LISTING');
    });

    test('rejects return date before or equal to pickup date (400)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({
          listingId: listing._id.toString(),
          startDate: '2026-12-05T10:00:00.000Z',
          endDate: '2026-12-02T10:00:00.000Z',
        });

      expect(res.status).toBe(400);
    });

    test('rejects duration below minDays (min 2 days, requested 1 day) (400)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', `roam_token=${renterToken}`)
        .send({
          listingId: listing._id.toString(),
          startDate: '2026-12-01T10:00:00.000Z',
          endDate: '2026-12-02T10:00:00.000Z', // 1 day
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/below the minimum required duration/i);
    });
  });

  describe('Overlap Matrix & Acceptance Conflict Prevention', () => {
    let confirmedBooking;

    beforeEach(async () => {
      // Confirmed baseline booking: Dec 10 to Dec 15
      confirmedBooking = await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-10T10:00:00.000Z'),
        endDate: new Date('2026-12-15T10:00:00.000Z'),
        pricing: {
          baseRate: 1250000,
          days: 5,
          deposit: 1000000,
          estimatedTotal: 2250000,
        },
        status: 'confirmed',
      });
    });

    test('rejects accept for partial overlap (starts before Dec 10, ends inside: Dec 8 - Dec 12) (409 RENTAL_DATE_CONFLICT)', async () => {
      const b = await Booking.create({
        renter: renterUser2.id || renterUser2._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-08T10:00:00.000Z'),
        endDate: new Date('2026-12-12T10:00:00.000Z'),
        pricing: { baseRate: 1000000, days: 4, deposit: 1000000, estimatedTotal: 2000000 },
        status: 'requested',
      });

      const res = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RENTAL_DATE_CONFLICT');
    });

    test('rejects accept for partial overlap (starts inside, ends after: Dec 13 - Dec 18) (409 RENTAL_DATE_CONFLICT)', async () => {
      const b = await Booking.create({
        renter: renterUser2.id || renterUser2._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-13T10:00:00.000Z'),
        endDate: new Date('2026-12-18T10:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'requested',
      });

      const res = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RENTAL_DATE_CONFLICT');
    });

    test('rejects accept for contained overlap (Dec 11 - Dec 14) (409 RENTAL_DATE_CONFLICT)', async () => {
      const b = await Booking.create({
        renter: renterUser2.id || renterUser2._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-11T10:00:00.000Z'),
        endDate: new Date('2026-12-14T10:00:00.000Z'),
        pricing: { baseRate: 750000, days: 3, deposit: 1000000, estimatedTotal: 1750000 },
        status: 'requested',
      });

      const res = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RENTAL_DATE_CONFLICT');
    });

    test('rejects accept for containing overlap (Dec 8 - Dec 18) (409 RENTAL_DATE_CONFLICT)', async () => {
      const b = await Booking.create({
        renter: renterUser2.id || renterUser2._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-08T10:00:00.000Z'),
        endDate: new Date('2026-12-18T10:00:00.000Z'),
        pricing: { baseRate: 2500000, days: 10, deposit: 1000000, estimatedTotal: 3500000 },
        status: 'requested',
      });

      const res = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RENTAL_DATE_CONFLICT');
    });

    test('allows accept for adjacent booking ending exactly when confirmed begins (Dec 5 - Dec 10) (Same-day turnaround)', async () => {
      const b = await Booking.create({
        renter: renterUser2.id || renterUser2._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-05T10:00:00.000Z'),
        endDate: new Date('2026-12-10T10:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'requested',
      });

      const res = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('confirmed');
    });

    test('allows accept for adjacent booking starting exactly when confirmed ends (Dec 15 - Dec 20)', async () => {
      const b = await Booking.create({
        renter: renterUser2.id || renterUser2._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-15T10:00:00.000Z'),
        endDate: new Date('2026-12-20T10:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'requested',
      });

      const res = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('confirmed');
    });
  });

  describe('Blocked Dates & Pending Behavior', () => {
    test('owner blocks dates via UnavailableDate and conflicting booking is blocked on accept', async () => {
      // 1. Add blocked dates: Dec 20 to Dec 24
      const addRes = await request(app)
        .post(`/api/listings/${listing._id}/unavailable-dates`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({
          startDate: '2026-12-20T00:00:00.000Z',
          endDate: '2026-12-24T00:00:00.000Z',
          reason: 'Routine scheduled maintenance',
        });

      expect(addRes.status).toBe(201);
      const dateId = addRes.body.data.unavailableDate.id;

      // 2. Booking requested for Dec 21 - Dec 26
      const b = await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-21T00:00:00.000Z'),
        endDate: new Date('2026-12-26T00:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'requested',
      });

      // 3. Try accept -> fails 409
      const acceptRes = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      expect(acceptRes.status).toBe(409);
      expect(acceptRes.body.error.code).toBe('RENTAL_DATE_CONFLICT');

      // 4. Delete the blocked date
      const delRes = await request(app)
        .delete(`/api/listings/${listing._id}/unavailable-dates/${dateId}`)
        .set('Cookie', `roam_token=${ownerToken}`);

      expect(delRes.status).toBe(200);

      // 5. Try accept again -> now succeeds!
      const acceptRes2 = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });

      expect(acceptRes2.status).toBe(200);
      expect(acceptRes2.body.data.booking.status).toBe('confirmed');
    });

    test('pending / requested bookings do NOT block each other until confirmed', async () => {
      // Renter 1 requests Dec 10 to Dec 15
      const b1 = await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-10T10:00:00.000Z'),
        endDate: new Date('2026-12-15T10:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'requested',
      });

      // Renter 2 requests overlapping Dec 12 to Dec 16
      const b2 = await Booking.create({
        renter: renterUser2.id || renterUser2._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-12T10:00:00.000Z'),
        endDate: new Date('2026-12-16T10:00:00.000Z'),
        pricing: { baseRate: 1000000, days: 4, deposit: 1000000, estimatedTotal: 2000000 },
        status: 'requested',
      });

      // Both can exist in requested status simultaneously
      const listRes = await request(app)
        .get('/api/bookings?role=owner')
        .set('Cookie', `roam_token=${ownerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items.length).toBe(2);

      // Owner accepts b1
      const accept1 = await request(app)
        .patch(`/api/bookings/${b1._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });
      expect(accept1.status).toBe(200);

      // Now attempting to accept b2 is blocked
      const accept2 = await request(app)
        .patch(`/api/bookings/${b2._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'accept' });
      expect(accept2.status).toBe(409);
      expect(accept2.body.error.code).toBe('RENTAL_DATE_CONFLICT');
    });
  });

  describe('Race Condition: Concurrent Accepts', () => {
    test('two concurrent accepts for overlapping dates cannot both succeed', async () => {
      const b1 = await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-10T10:00:00.000Z'),
        endDate: new Date('2026-12-15T10:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'requested',
      });

      const b2 = await Booking.create({
        renter: renterUser2.id || renterUser2._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-11T10:00:00.000Z'),
        endDate: new Date('2026-12-16T10:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'requested',
      });

      // Fire both accept requests concurrently
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/bookings/${b1._id}/status`)
          .set('Cookie', `roam_token=${ownerToken}`)
          .send({ action: 'accept' }),
        request(app)
          .patch(`/api/bookings/${b2._id}/status`)
          .set('Cookie', `roam_token=${ownerToken}`)
          .send({ action: 'accept' }),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      // Verify in DB that only one confirmed booking exists
      const confirmedCount = await Booking.countDocuments({
        listing: listing._id,
        status: 'confirmed',
      });
      expect(confirmedCount).toBe(1);
    });
  });

  describe('Rejection & Availability Endpoint', () => {
    test('owner can reject a booking request with notification to renter', async () => {
      const b = await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-10T10:00:00.000Z'),
        endDate: new Date('2026-12-15T10:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'requested',
      });

      const res = await request(app)
        .patch(`/api/bookings/${b._id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ action: 'reject', reason: 'Vehicle booked for personal use' });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('rejected');

      const notification = await Notification.findOne({
        recipient: renterUser.id || renterUser._id,
        title: 'Booking Request Declined',
      });
      expect(notification).not.toBeNull();
      expect(notification.message).toContain('Vehicle booked for personal use');
    });

    test('GET /api/listings/:id/availability returns confirmed bookings and blocked dates', async () => {
      await Booking.create({
        renter: renterUser.id || renterUser._id,
        listing: listing._id,
        ownerRef: listing.ownerRef,
        startDate: new Date('2026-12-10T10:00:00.000Z'),
        endDate: new Date('2026-12-15T10:00:00.000Z'),
        pricing: { baseRate: 1250000, days: 5, deposit: 1000000, estimatedTotal: 2250000 },
        status: 'confirmed',
      });

      await UnavailableDate.create({
        listing: listing._id,
        startDate: new Date('2026-12-24T00:00:00.000Z'),
        endDate: new Date('2026-12-26T00:00:00.000Z'),
        reason: 'Holiday',
        createdBy: ownerUser.id || ownerUser._id,
      });

      const res = await request(app).get(
        `/api/listings/${listing._id}/availability?from=2026-12-01T00:00:00.000Z&to=2026-12-31T00:00:00.000Z`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.confirmedBookings.length).toBe(1);
      expect(res.body.data.unavailableDates.length).toBe(1);
    });
  });
});
