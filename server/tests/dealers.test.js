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
const Transaction = require('../src/models/transaction.model');
const Notification = require('../src/models/notification.model');
const config = require('../src/config/env');

describe('Sprint 5: Dealers & Owner-to-Dealer Purchase Workflow API', () => {
  let replSet;
  let adminUser, adminToken;
  let ownerUser, ownerToken;
  let dealerAUser, dealerAToken, dealerA;
  let dealerBUser, dealerBToken, dealerB;
  let individualBuyerUser, individualBuyerToken;
  let ownerListing, ownerVehicle;

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
    await Dealer.deleteMany({});
    await User.deleteMany({});

    // 1. Admin
    const hashedPassword = await bcrypt.hash('Password@123', 10);
    adminUser = await User.create({
      fullName: 'Platform Administrator',
      email: 'admin@roam.local',
      passwordHash: hashedPassword,
      mobile: '+919999999999',
      capabilities: ['admin'],
      accountStatus: 'active',
    });
    adminToken = jwt.sign({ id: adminUser._id }, config.jwtSecret, { expiresIn: '7d' });

    // 2. Individual Owner (Seller)
    ownerUser = await User.create({
      fullName: 'Vikram Malhotra',
      email: 'vikram@roam.local',
      passwordHash: hashedPassword,
      mobile: '+919811122233',
      capabilities: ['seller'],
      accountStatus: 'active',
    });
    ownerToken = jwt.sign({ id: ownerUser._id }, config.jwtSecret, { expiresIn: '7d' });

    // 3. Dealer A User
    dealerAUser = await User.create({
      fullName: 'Rajesh Sharma',
      email: 'rajesh@apexmotors.local',
      passwordHash: hashedPassword,
      mobile: '+919822233344',
      capabilities: ['buyer'],
      accountStatus: 'active',
    });
    dealerAToken = jwt.sign({ id: dealerAUser._id }, config.jwtSecret, { expiresIn: '7d' });

    // 4. Dealer B User
    dealerBUser = await User.create({
      fullName: 'Suresh Patel',
      email: 'suresh@citywheels.local',
      passwordHash: hashedPassword,
      mobile: '+919833344455',
      capabilities: ['buyer'],
      accountStatus: 'active',
    });
    dealerBToken = jwt.sign({ id: dealerBUser._id }, config.jwtSecret, { expiresIn: '7d' });

    // 5. Individual Buyer
    individualBuyerUser = await User.create({
      fullName: 'Pooja Verma',
      email: 'pooja@roam.local',
      passwordHash: hashedPassword,
      mobile: '+919844455566',
      capabilities: ['buyer'],
      accountStatus: 'active',
    });
    individualBuyerToken = jwt.sign({ id: individualBuyerUser._id }, config.jwtSecret, { expiresIn: '7d' });

    // Create an individual owner vehicle & listing
    const resVehicle = await request(app)
      .post('/api/vehicles')
      .set('Cookie', `roam_token=${ownerToken}`)
      .send({
        brand: 'Honda',
        model: 'City',
        variant: 'ZX CVT',
        bodyType: 'Sedan',
        manufacturingYear: 2021,
        registrationYear: 2021,
        registrationNumber: 'MH02CB1234',
        fuelType: 'Petrol',
        transmission: 'Automatic',
        kmDriven: 28000,
        previousOwners: 1,
        condition: 'Excellent',
        colour: 'White',
        seatingCapacity: 5,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          area: 'Andheri West',
          pincode: '400053',
        },
      });
    ownerVehicle = resVehicle.body.data;

    const resListing = await request(app)
      .post('/api/listings')
      .set('Cookie', `roam_token=${ownerToken}`)
      .send({
        vehicleId: ownerVehicle.id,
        purpose: 'sale',
        saveAsDraft: false,
        sale: {
          askingPrice: 110000000, // ₹11,00,000 (paise)
          minAcceptableOffer: 95000000,
          negotiable: true,
          description: 'Single owner Honda City in mint condition',
        },
      });
    ownerListing = resListing.body.data;
    await Listing.findByIdAndUpdate(ownerListing.id || ownerListing._id, {
      moderationStatus: 'approved',
      'sale.status': 'active',
    });
  });

  describe('1. Dealer Registration & Capabilities', () => {
    it('should register a new dealership, assign verificationStatus pending, and grant dealer capability', async () => {
      const res = await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
          description: 'Premier certified pre-owned car dealership in Mumbai.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dealershipName).toBe('Apex Motor Corp');
      expect(res.body.data.verificationStatus).toBe('pending');

      dealerA = res.body.data;

      // Verify user document gained dealer capability
      const updatedUser = await User.findById(dealerAUser._id);
      expect(updatedUser.capabilities).toContain('dealer');
    });

    it('should reject duplicate dealer registration for the same user account with 409', async () => {
      await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
        });

      const resDuplicate = await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp Second Attempt',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact2@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
        });

      expect(resDuplicate.status).toBe(409);
      expect(resDuplicate.body.error.code).toBe('DEALER_ALREADY_REGISTERED');
    });
  });

  describe('2. Verification Gating & Publishing Enforcement', () => {
    let unverifiedDealerToken, unverifiedDealerVehicle;

    beforeEach(async () => {
      // Register dealer A as pending
      await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
        });

      unverifiedDealerToken = dealerAToken;

      // Dealer creates a vehicle
      const resV = await request(app)
        .post('/api/vehicles')
        .set('Cookie', `roam_token=${unverifiedDealerToken}`)
        .send({
          brand: 'Hyundai',
          model: 'Creta',
          variant: 'SX (O)',
          bodyType: 'SUV',
          manufacturingYear: 2022,
          registrationYear: 2022,
          registrationNumber: 'MH02XY9999',
          fuelType: 'Diesel',
          transmission: 'Automatic',
          kmDriven: 18000,
          previousOwners: 1,
          condition: 'Excellent',
          colour: 'Phantom Black',
          seatingCapacity: 5,
          location: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400053',
          },
        });
      unverifiedDealerVehicle = resV.body.data;
      expect(unverifiedDealerVehicle.ownerRef.type).toBe('dealer');
    });

    it('should block unverified dealer from publishing a live listing with 403 DEALER_VERIFICATION_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', `roam_token=${unverifiedDealerToken}`)
        .send({
          vehicleId: unverifiedDealerVehicle.id,
          purpose: 'sale',
          saveAsDraft: false, // Trying to publish immediately
          sale: {
            askingPrice: 165000000,
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DEALER_VERIFICATION_REQUIRED');
    });

    it('should allow unverified dealer to save a listing as draft', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', `roam_token=${unverifiedDealerToken}`)
        .send({
          vehicleId: unverifiedDealerVehicle.id,
          purpose: 'sale',
          saveAsDraft: true,
          sale: {
            askingPrice: 165000000,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.moderationStatus).toBe('draft');
      expect(res.body.data.sale.status).toBe('inactive');
    });

    it('should block unverified dealer from activating a draft listing with 403', async () => {
      const resDraft = await request(app)
        .post('/api/listings')
        .set('Cookie', `roam_token=${unverifiedDealerToken}`)
        .send({
          vehicleId: unverifiedDealerVehicle.id,
          purpose: 'sale',
          saveAsDraft: true,
          sale: {
            askingPrice: 165000000,
          },
        });

      const listingId = resDraft.body.data.id;

      const resActivate = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Cookie', `roam_token=${unverifiedDealerToken}`)
        .send({
          action: 'activate',
        });

      expect(resActivate.status).toBe(403);
      expect(resActivate.body.error.code).toBe('DEALER_VERIFICATION_REQUIRED');
    });

    it('should prevent forging ownerRef.type via request body', async () => {
      // Individual owner tries to pass ownerRef: { type: 'dealer' }
      const res = await request(app)
        .post('/api/listings')
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({
          vehicleId: ownerVehicle.id,
          purpose: 'sale',
          saveAsDraft: true,
          ownerRef: { type: 'dealer', id: adminUser._id }, // forged
          sale: { askingPrice: 100000000 },
        });

      expect(res.status).toBe(201);
      // Server must enforce ownerRef.type based on actual user capabilities and vehicle ownerRef
      expect(res.body.data.ownerRef.type).toBe('user');
      expect(res.body.data.ownerRef.id).toBe(ownerUser._id.toString());
    });
  });

  describe('3. Admin Dealer Verification & Authorization', () => {
    let pendingDealerId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
        });
      pendingDealerId = res.body.data.id;
    });

    it('should reject non-admin users from admin routes with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/dealers')
        .set('Cookie', `roam_token=${ownerToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to list dealers and verify (approve) a pending dealership', async () => {
      const resList = await request(app)
        .get('/api/admin/dealers?status=pending')
        .set('Cookie', `roam_token=${adminToken}`);

      expect(resList.status).toBe(200);
      expect(resList.body.data.items.length).toBeGreaterThanOrEqual(1);

      const resApprove = await request(app)
        .patch(`/api/admin/dealers/${pendingDealerId}/verification`)
        .set('Cookie', `roam_token=${adminToken}`)
        .send({
          status: 'approved',
          notes: 'GST and business registration verified.',
        });

      expect(resApprove.status).toBe(200);
      expect(resApprove.body.data.verificationStatus).toBe('approved');
      expect(resApprove.body.data.verifiedAt).toBeTruthy();

      // Verified dealer can now publish listings immediately
      const resV = await request(app)
        .post('/api/vehicles')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          brand: 'Toyota',
          model: 'Innova Crysta',
          variant: '2.4 ZX',
          bodyType: 'Minivan',
          manufacturingYear: 2020,
          registrationYear: 2020,
          registrationNumber: 'MH01AA1111',
          fuelType: 'Diesel',
          transmission: 'Manual',
          kmDriven: 45000,
          previousOwners: 1,
          condition: 'Excellent',
          colour: 'Silver',
          seatingCapacity: 7,
          location: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400053',
          },
        });

      const resPub = await request(app)
        .post('/api/listings')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          vehicleId: resV.body.data.id,
          purpose: 'sale',
          saveAsDraft: false,
          sale: {
            askingPrice: 195000000,
          },
        });

      expect(resPub.status).toBe(201);
      expect(resPub.body.data.moderationStatus).toBe('pending_review');
      expect(resPub.body.data.sale.status).toBe('inactive');
    });

    it('should block suspended dealers from publishing and submitting offers', async () => {
      // Suspend dealer
      await request(app)
        .patch(`/api/admin/dealers/${pendingDealerId}/verification`)
        .set('Cookie', `roam_token=${adminToken}`)
        .send({
          status: 'suspended',
          notes: 'Suspended due to policy violation',
        });

      // Try to submit offer on owner's vehicle
      const resOffer = await request(app)
        .post('/api/offers')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          listingId: ownerListing.id,
          amount: 100000000,
          message: 'Offer from suspended dealer',
        });

      expect(resOffer.status).toBe(403);
      expect(resOffer.body.error.code).toBe('DEALER_SUSPENDED');
    });
  });

  describe('4. Dealer Offers to Owners & Owner Comparison View', () => {
    let offerFromBuyer, offerFromDealerA, offerFromDealerB;

    beforeEach(async () => {
      // Register and approve Dealer A
      const resA = await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
        });
      await request(app)
        .patch(`/api/admin/dealers/${resA.body.data.id}/verification`)
        .set('Cookie', `roam_token=${adminToken}`)
        .send({ status: 'approved' });

      // Register and approve Dealer B
      const resB = await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerBToken}`)
        .send({
          dealershipName: 'City Wheels',
          ownerName: 'Suresh Patel',
          businessEmail: 'sales@citywheels.local',
          phone: '+919833344455',
          address: '88 SV Road',
          city: 'Mumbai',
          pincode: '400054',
        });
      await request(app)
        .patch(`/api/admin/dealers/${resB.body.data.id}/verification`)
        .set('Cookie', `roam_token=${adminToken}`)
        .send({ status: 'approved' });

      // 1. Individual buyer offer
      const res1 = await request(app)
        .post('/api/offers')
        .set('Cookie', `roam_token=${individualBuyerToken}`)
        .send({
          listingId: ownerListing.id,
          amount: 102000000,
          message: 'Interested individual buyer',
        });
      offerFromBuyer = res1.body.data;

      // 2. Dealer A offer
      const res2 = await request(app)
        .post('/api/offers')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          listingId: ownerListing.id,
          amount: 104000000,
          message: 'Immediate dealer purchase and quick payment',
        });
      offerFromDealerA = res2.body.data;

      // 3. Dealer B offer
      const res3 = await request(app)
        .post('/api/offers')
        .set('Cookie', `roam_token=${dealerBToken}`)
        .send({
          listingId: ownerListing.id,
          amount: 106000000,
          message: 'Top dealer offer with door-step inspection',
        });
      offerFromDealerB = res3.body.data;
    });

    it('should return all received offers filtered by listing with dealer summary attached for dealer offers', async () => {
      const res = await request(app)
        .get(`/api/offers/received?listingId=${ownerListing.id}`)
        .set('Cookie', `roam_token=${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(3);

      const dealerAOfferInList = res.body.data.items.find(o => o.id === offerFromDealerA.id);
      expect(dealerAOfferInList).toBeDefined();
      expect(dealerAOfferInList.dealer).toBeDefined();
      expect(dealerAOfferInList.dealer.dealershipName).toBe('Apex Motor Corp');
      expect(dealerAOfferInList.dealer.verificationStatus).toBe('approved');

      const buyerOfferInList = res.body.data.items.find(o => o.id === offerFromBuyer.id);
      expect(buyerOfferInList).toBeDefined();
      expect(buyerOfferInList.dealer).toBeUndefined(); // Individual buyer has no dealer profile
    });
  });

  describe('5. Owner-to-Dealer Acquisition Workflow & Old Listing Effects', () => {
    let acceptedDealerOffer;

    beforeEach(async () => {
      const resA = await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
        });
      await request(app)
        .patch(`/api/admin/dealers/${resA.body.data.id}/verification`)
        .set('Cookie', `roam_token=${adminToken}`)
        .send({ status: 'approved' });

      // Dealer A makes offer
      const resOffer = await request(app)
        .post('/api/offers')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          listingId: ownerListing.id,
          amount: 105000000,
          message: 'Dealer purchase offer',
        });

      // Owner accepts Dealer A offer
      const resAccept = await request(app)
        .patch(`/api/offers/${resOffer.body.data.id}/status`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({ status: 'accepted' });

      acceptedDealerOffer = resAccept.body.data;
    });

    it('should reject dealer offers from standard sale completion with 409 DEALER_ACQUISITION_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({
          offerId: acceptedDealerOffer.id,
          finalAmount: 105000000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DEALER_ACQUISITION_REQUIRED');
    });

    it('should allow dealer to initiate acquisition and confirm, transferring vehicle and closing old listing', async () => {
      // 1. Dealer initiates acquisition
      const resAcquire = await request(app)
        .post('/api/transactions/acquire')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          offerId: acceptedDealerOffer.id,
          notes: 'Acquisition initiated by Apex Motor Corp',
        });

      expect(resAcquire.status).toBe(201);
      expect(resAcquire.body.data.acquisitionStatus).toBe('acquisition_pending');
      const transactionId = resAcquire.body.data._id;

      // 2. Confirm acquisition
      const resConfirm = await request(app)
        .patch(`/api/transactions/${transactionId}/acquisition`)
        .set('Cookie', `roam_token=${ownerToken}`)
        .send({
          action: 'confirm',
          notes: 'Vehicle handed over to dealer with keys and registration documents.',
        });

      expect(resConfirm.status).toBe(200);
      expect(resConfirm.body.data.acquisitionStatus).toBe('acquired');

      // 3. Verify old listing state: sale.status = sold, moderationStatus unchanged
      const updatedListing = await Listing.findById(ownerListing.id);
      expect(updatedListing.sale.status).toBe('sold');
      expect(updatedListing.moderationStatus).toBe('approved');

      // 4. Verify old listing does NOT appear in public discovery search
      const resPublicSearch = await request(app).get('/api/listings');
      const foundInSearch = resPublicSearch.body.data.items.some(
        item => item.id === ownerListing.id
      );
      expect(foundInSearch).toBe(false);

      // 5. Verify vehicle ownership transferred to the dealer
      const updatedVehicle = await Vehicle.findById(ownerVehicle.id);
      expect(updatedVehicle.ownerRef.type).toBe('dealer');
      expect(updatedVehicle.ownerRef.id.toString()).toBe(dealerAUser._id.toString());
    });

    it('should handle acquisition cancellation cleanly and restore listing availability', async () => {
      // Dealer initiates acquisition
      const resAcquire = await request(app)
        .post('/api/transactions/acquire')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          offerId: acceptedDealerOffer.id,
          notes: 'Acquisition initiated',
        });

      const transactionId = resAcquire.body.data._id;

      // Cancel acquisition
      const resCancel = await request(app)
        .patch(`/api/transactions/${transactionId}/acquisition`)
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          action: 'cancel',
          notes: 'Cancelled due to mechanical inspection issues',
        });

      expect(resCancel.status).toBe(200);
      expect(resCancel.body.data.acquisitionStatus).toBe('cancelled');

      // Old listing remains available under owner
      const listingAfterCancel = await Listing.findById(ownerListing.id);
      expect(listingAfterCancel.sale.status).toBe('active');

      const vehicleAfterCancel = await Vehicle.findById(ownerVehicle.id);
      expect(vehicleAfterCancel.ownerRef.type).toBe('user');
      expect(vehicleAfterCancel.ownerRef.id.toString()).toBe(ownerUser._id.toString());
    });
  });

  describe('6. Dealer Discover Feed & Inventory Access Control', () => {
    let dealerAListing;

    beforeEach(async () => {
      const resA = await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
        });
      await request(app)
        .patch(`/api/admin/dealers/${resA.body.data.id}/verification`)
        .set('Cookie', `roam_token=${adminToken}`)
        .send({ status: 'approved' });

      // Dealer A creates an inventory listing
      const resV = await request(app)
        .post('/api/vehicles')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          brand: 'Kia',
          model: 'Seltos',
          variant: 'GTX Plus',
          bodyType: 'SUV',
          manufacturingYear: 2021,
          registrationYear: 2021,
          registrationNumber: 'MH02DD4444',
          fuelType: 'Petrol',
          transmission: 'Automatic',
          kmDriven: 25000,
          previousOwners: 1,
          condition: 'Excellent',
          colour: 'Red',
          seatingCapacity: 5,
          location: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400053',
          },
        });

      const resL = await request(app)
        .post('/api/listings')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          vehicleId: resV.body.data.id,
          purpose: 'sale',
          saveAsDraft: false,
          sale: {
            askingPrice: 145000000,
          },
        });
      dealerAListing = resL.body.data;
    });

    it('should return individual owner listings in dealer discover feed with spec 8.1 filters', async () => {
      const res = await request(app)
        .get('/api/dealers/discover-listings?brand=Honda&city=Mumbai')
        .set('Cookie', `roam_token=${dealerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);

      const item = res.body.data.items[0];
      expect(item.vehicleRef.brand).toBe('Honda');
      expect(item.seller).toBeDefined();
      // Owner contact email/mobile hidden when visibility is false
      expect(item.seller.email).toBeUndefined();
    });

    it('should block dealers from editing other dealers inventory with 403 Forbidden', async () => {
      // Dealer B attempts to update Dealer A's listing
      const res = await request(app)
        .put(`/api/listings/${dealerAListing.id}`)
        .set('Cookie', `roam_token=${dealerBToken}`)
        .send({
          sale: {
            askingPrice: 120000000,
          },
        });

      expect(res.status).toBe(403);
    });
  });

  describe('7. CSV Bulk Upload (Atomic & Partial Modes)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/dealers/register')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({
          dealershipName: 'Apex Motor Corp',
          ownerName: 'Rajesh Sharma',
          businessEmail: 'contact@apexmotors.local',
          phone: '+919822233344',
          address: 'Plot 45, Link Road',
          city: 'Mumbai',
          pincode: '400053',
        });
    });

    it('should reject bulk upload if required headers are missing with 400 ValidationError', async () => {
      const badCsv = `brand,model,askingPrice\nToyota,Fortuner,3000000`;
      const res = await request(app)
        .post('/api/dealers/inventory/bulk-upload')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({ csvText: badCsv });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('CSV missing required columns');
    });

    it('in atomic mode: should reject all rows and save nothing if any row fails validation', async () => {
      const headers =
        'brand,model,variant,bodyType,manufacturingYear,registrationYear,registrationNumber,fuelType,transmission,kmDriven,previousOwners,condition,colour,seatingCapacity,city,state,pincode,askingPrice,purpose';
      const validRow1 =
        'Maruti,Swift,ZXi,Hatchback,2020,2020,MH02AB1111,Petrol,Manual,30000,1,Good,White,5,Mumbai,Maharashtra,400053,550000,sale';
      const invalidRow2 =
        'Honda,City,V,Sedan,2022,2020,MH02AB2222,Petrol,Manual,20000,1,Good,Silver,5,Mumbai,Maharashtra,400053,800000,sale'; // registrationYear < manufacturingYear

      const csvContent = `${headers}\n${validRow1}\n${invalidRow2}`;

      const res = await request(app)
        .post('/api/dealers/inventory/bulk-upload?mode=atomic')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({ csvText: csvContent });

      expect(res.status).toBe(422);
      expect(res.body.data.success).toBe(false);
      expect(res.body.data.createdCount).toBe(0);
      expect(res.body.data.errors.length).toBeGreaterThan(0);
      expect(res.body.data.errors[0].row).toBe(2);

      // Verify no vehicle was created
      const count = await Vehicle.countDocuments({
        'ownerRef.id': dealerAUser._id,
      });
      expect(count).toBe(0);
    });

    it('in partial mode: should save valid rows and report errors for invalid rows', async () => {
      const headers =
        'brand,model,variant,bodyType,manufacturingYear,registrationYear,registrationNumber,fuelType,transmission,kmDriven,previousOwners,condition,colour,seatingCapacity,city,state,pincode,askingPrice,purpose';
      const validRow1 =
        'Maruti,Swift,ZXi,Hatchback,2020,2020,MH02AB1111,Petrol,Manual,30000,1,Good,White,5,Mumbai,Maharashtra,400053,550000,sale';
      const invalidRow2 =
        'Honda,City,V,Sedan,2022,2020,MH02AB2222,Petrol,Manual,20000,1,Good,Silver,5,Mumbai,Maharashtra,400053,800000,sale';

      const csvContent = `${headers}\n${validRow1}\n${invalidRow2}`;

      const res = await request(app)
        .post('/api/dealers/inventory/bulk-upload?mode=partial')
        .set('Cookie', `roam_token=${dealerAToken}`)
        .send({ csvText: csvContent });

      expect(res.status).toBe(200);
      expect(res.body.data.createdCount).toBe(1);
      expect(res.body.data.errors.length).toBe(1);
      expect(res.body.data.errors[0].row).toBe(2);

      // Verify valid vehicle was saved as draft
      const count = await Vehicle.countDocuments({
        'ownerRef.id': dealerAUser._id,
      });
      expect(count).toBe(1);

      const listing = await Listing.findOne({ 'ownerRef.id': dealerAUser._id });
      expect(listing.moderationStatus).toBe('draft');
      expect(listing.sale.status).toBe('inactive');
    });
  });
});
