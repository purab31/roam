const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');

describe('Sprint 2: Vehicle Management & Media API', () => {
  let mongod;
  let sellerToken;
  let sellerUser;
  let otherSellerToken;
  let otherSellerUser;
  let buyerToken;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  const validVehiclePayload = {
    brand: 'Toyota',
    model: 'Innova Crysta',
    variant: '2.4 ZX',
    bodyType: 'Minivan',
    manufacturingYear: 2022,
    registrationYear: 2022,
    registrationNumber: 'MH 02 CL 1234',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    kmDriven: 35000,
    previousOwners: 1,
    condition: 'Excellent',
    colour: 'Pearl White',
    seatingCapacity: 7,
    engineOrBattery: '2.4L Diesel Engine',
    location: {
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      area: 'Andheri West',
      pincode: '400053',
    },
    features: ['Leather Seats', 'Sunroof', 'Touchscreen Infotainment'],
  };

  beforeEach(async () => {
    await Listing.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // 1. Create primary seller
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

    // 3. Create a buyer without seller capability
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Buyer User',
        email: 'buyer@roam.local',
        mobile: '+919876543203',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    buyerToken = buyerRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });

  describe('POST /api/vehicles', () => {
    it('should create a vehicle record when authenticated as seller', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(validVehiclePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.brand).toBe('Toyota');
      expect(res.body.data.model).toBe('Innova Crysta');
      expect(res.body.data.registrationNumber).toBe('MH 02 CL 1234');
      expect(res.body.data.ownerRef.id).toBe(sellerUser._id || sellerUser.id);
    });

    it('should reject creation with 403 when user lacks seller or dealer capability', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(validVehiclePayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should reject creation with 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .send(validVehiclePayload);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_ERROR');
    });

    it('should reject validation when registrationYear < manufacturingYear', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          ...validVehiclePayload,
          manufacturingYear: 2023,
          registrationYear: 2021,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject validation when manufacturingYear > current year + 1', async () => {
      const currentYear = new Date().getFullYear();
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          ...validVehiclePayload,
          manufacturingYear: currentYear + 2,
          registrationYear: currentYear + 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject validation when kmDriven is negative', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          ...validVehiclePayload,
          kmDriven: -500,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/vehicles/:id (Private Field Sanitization)', () => {
    let vehicleId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(validVehiclePayload);
      vehicleId = res.body.data.id;
    });

    it('should return registrationNumber and documents to the vehicle owner', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.registrationNumber).toBe('MH 02 CL 1234');
      expect(Array.isArray(res.body.data.documents)).toBe(true);
    });

    it('should strip registrationNumber and documents for another user or public request', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${otherSellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.registrationNumber).toBeUndefined();
      expect(res.body.data.documents).toBeUndefined();
      expect(res.body.data.brand).toBe('Toyota');
    });
  });

  describe('PUT & DELETE /api/vehicles/:id (Ownership Enforcement)', () => {
    let vehicleId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(validVehiclePayload);
      vehicleId = res.body.data.id;
    });

    it('should allow owner to update vehicle', async () => {
      const res = await request(app)
        .put(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ colour: 'Metallic Silver' });

      expect(res.status).toBe(200);
      expect(res.body.data.colour).toBe('Metallic Silver');
    });

    it('should return 403 FORBIDDEN when another user attempts to update vehicle', async () => {
      const res = await request(app)
        .put(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${otherSellerToken}`)
        .send({ colour: 'Midnight Black' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should block vehicle DELETE when it has a non-removed listing (409 Conflict)', async () => {
      // Create listing for vehicle
      await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          vehicleId,
          purpose: 'sale',
          sale: { askingPrice: 180000000 },
        });

      const res = await request(app)
        .delete(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACTIVE_LISTINGS_EXIST');
    });

    it('should allow vehicle DELETE when vehicle has no active listings', async () => {
      const res = await request(app)
        .delete(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Vehicle.findById(vehicleId);
      expect(check).toBeNull();
    });
  });

  describe('Vehicle Media & Document Endpoints', () => {
    let vehicleId;

    // Valid 1x1 PNG buffer with valid signature: 89 50 4E 47 0D 0A 1A 0A
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);

    // Valid PDF buffer with signature: 25 50 44 46 (%PDF)
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(validVehiclePayload);
      vehicleId = res.body.data.id;
    });

    it('should reject image upload with invalid MIME or corrupted signature', async () => {
      const res = await request(app)
        .post(`/api/vehicles/${vehicleId}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .attach('image', Buffer.from('plain text pretend image'), 'fake.png');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should upload valid image, set cover on first image, and support cover switch', async () => {
      // 1. Upload first image
      const img1Res = await request(app)
        .post(`/api/vehicles/${vehicleId}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .attach('image', validPngBuffer, 'photo1.png');

      expect(img1Res.status).toBe(200);
      expect(img1Res.body.data.images.length).toBe(1);
      expect(img1Res.body.data.images[0].isCover).toBe(true);

      const firstImageId = img1Res.body.data.images[0]._id || img1Res.body.data.images[0].id;

      // 2. Upload second image
      const img2Res = await request(app)
        .post(`/api/vehicles/${vehicleId}/images`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .attach('image', validPngBuffer, 'photo2.png');

      expect(img2Res.status).toBe(200);
      expect(img2Res.body.data.images.length).toBe(2);
      expect(img2Res.body.data.images[1].isCover).toBe(false);

      const secondImageId = img2Res.body.data.images[1]._id || img2Res.body.data.images[1].id;

      // 3. Set second image as cover
      const coverRes = await request(app)
        .patch(`/api/vehicles/${vehicleId}/images/${secondImageId}/cover`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(coverRes.status).toBe(200);
      const images = coverRes.body.data.images;
      const img1 = images.find(i => (i._id || i.id) === firstImageId);
      const img2 = images.find(i => (i._id || i.id) === secondImageId);
      expect(img1.isCover).toBe(false);
      expect(img2.isCover).toBe(true);

      // 4. Verify Express serves the uploaded image statically with cross-origin CORP header
      const staticRes = await request(app).get(img2.url);
      expect(staticRes.status).toBe(200);
      expect(staticRes.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('should upload private document, allow owner to download, and reject other user with 403', async () => {
      // 1. Upload document as owner
      const docRes = await request(app)
        .post(`/api/vehicles/${vehicleId}/documents`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .field('name', 'Registration Certificate')
        .attach('document', validPdfBuffer, 'rc.pdf');

      expect(docRes.status).toBe(200);
      expect(docRes.body.data.documents.length).toBe(1);
      const docId = docRes.body.data.documents[0]._id || docRes.body.data.documents[0].id;

      // 2. Owner can download document
      const downloadRes = await request(app)
        .get(`/api/vehicles/${vehicleId}/documents/${docId}/download`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toContain('application/pdf');

      // 3. Another user gets 403 FORBIDDEN
      const forbiddenRes = await request(app)
        .get(`/api/vehicles/${vehicleId}/documents/${docId}/download`)
        .set('Authorization', `Bearer ${otherSellerToken}`);

      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.error.code).toBe('FORBIDDEN_ERROR');
    });
  });
});
