const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');

describe('Sprint 3: Discovery, Search, Filtering & Vehicle Detail API', () => {
  let mongod;
  let sellerUser;
  let sellerToken;
  let dealerUser;
  let otherUserToken;
  let sampleListings = [];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'roam_test' },
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Listing.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    sampleListings = [];

    // 1. Create Individual Seller
    const sellerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Rajesh Sharma',
        email: 'rajesh@roam.local',
        mobile: '+919876500001',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        capabilities: ['seller', 'buyer'],
        acceptTerms: true,
      });
    sellerToken = sellerRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
    sellerUser = sellerRes.body.data.user;

    // Set contact visibility on Rajesh
    await User.findByIdAndUpdate(sellerUser.id || sellerUser._id, {
      contactVisibility: { email: true, mobile: false },
    });

    // 2. Create Dealer User
    const dealerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Elite Motors',
        email: 'elite@roam.local',
        mobile: '+919876500002',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        capabilities: ['dealer', 'seller'],
        acceptTerms: true,
      });
    dealerUser = dealerRes.body.data.user;

    // 3. Create regular Buyer User
    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Sunil Verma',
        email: 'sunil@roam.local',
        mobile: '+919876500003',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    otherUserToken = buyerRes.headers['set-cookie'][0].split(';')[0].split('=')[1];

    // Seed 4 distinct test vehicles & listings for comprehensive query testing
    const dataset = [
      {
        vehicle: {
          brand: 'Honda',
          model: 'City',
          variant: 'ZX i-VTEC',
          bodyType: 'Sedan',
          manufacturingYear: 2021,
          registrationYear: 2021,
          registrationNumber: 'MH 01 AA 1111',
          fuelType: 'Petrol',
          transmission: 'Manual',
          kmDriven: 30000,
          previousOwners: 1,
          condition: 'Excellent',
          colour: 'Radiant Red',
          seatingCapacity: 5,
          location: {
            country: 'India',
            state: 'Maharashtra',
            city: 'Mumbai',
            area: 'Andheri',
            pincode: '400053',
            pickupLocation: 'Andheri West',
          },
          ownerRef: { type: 'user', id: sellerUser.id || sellerUser._id },
        },
        listing: {
          purpose: 'sale',
          moderationStatus: 'approved',
          sale: {
            enabled: true,
            status: 'active',
            askingPrice: 100000000, // 10 Lakhs in paise
            negotiable: true,
            minAcceptableOffer: 92000000, // 9.2 Lakhs private
            description: 'Well-maintained Honda City ZX with sunroof.',
          },
          ownerRef: { type: 'user', id: sellerUser.id || sellerUser._id },
        },
      },
      {
        vehicle: {
          brand: 'Tata',
          model: 'Nexon',
          variant: 'XZ Plus',
          bodyType: 'SUV',
          manufacturingYear: 2022,
          registrationYear: 2022,
          registrationNumber: 'DL 01 BB 2222',
          fuelType: 'Diesel',
          transmission: 'Automatic',
          kmDriven: 18000,
          previousOwners: 1,
          condition: 'Very Good',
          colour: 'Foliage Green',
          seatingCapacity: 5,
          location: {
            country: 'India',
            state: 'Delhi',
            city: 'New Delhi',
            area: 'Saket',
            pincode: '110017',
            pickupLocation: 'Saket District Centre',
          },
          ownerRef: { type: 'dealer', id: dealerUser.id || dealerUser._id },
        },
        listing: {
          purpose: 'both',
          moderationStatus: 'approved',
          sale: {
            enabled: true,
            status: 'active',
            askingPrice: 120000000, // 12 Lakhs
            negotiable: false,
            minAcceptableOffer: 115000000,
            description: 'Rugged Tata Nexon Diesel Automatic SUV.',
          },
          rental: {
            dailyPrice: 350000, // 3500 INR in paise
            status: 'active',
            pickupLocation: 'Saket',
          },
          ownerRef: { type: 'dealer', id: dealerUser.id || dealerUser._id },
        },
      },
      {
        vehicle: {
          brand: 'Hyundai',
          model: 'Creta',
          variant: 'SX Executive',
          bodyType: 'SUV',
          manufacturingYear: 2020,
          registrationYear: 2020,
          registrationNumber: 'KA 01 CC 3333',
          fuelType: 'Petrol',
          transmission: 'Automatic',
          kmDriven: 45000,
          previousOwners: 2,
          condition: 'Good',
          colour: 'Polar White',
          seatingCapacity: 5,
          location: {
            country: 'India',
            state: 'Karnataka',
            city: 'Bengaluru',
            area: 'Indiranagar',
            pincode: '560038',
            pickupLocation: '100ft Road',
          },
          ownerRef: { type: 'user', id: sellerUser.id || sellerUser._id },
        },
        listing: {
          purpose: 'rent',
          moderationStatus: 'approved',
          sale: { enabled: false, status: 'inactive' },
          rental: {
            dailyPrice: 400000, // 4000 INR
            status: 'active',
            pickupLocation: 'Indiranagar',
          },
          ownerRef: { type: 'user', id: sellerUser.id || sellerUser._id },
        },
      },
      {
        vehicle: {
          brand: 'Honda',
          model: 'Civic',
          variant: 'VX CVT',
          bodyType: 'Sedan',
          manufacturingYear: 2019,
          registrationYear: 2019,
          registrationNumber: 'MH 02 DD 4444',
          fuelType: 'Petrol',
          transmission: 'Automatic',
          kmDriven: 52000,
          previousOwners: 1,
          condition: 'Very Good',
          colour: 'Platinum White',
          seatingCapacity: 5,
          location: {
            country: 'India',
            state: 'Maharashtra',
            city: 'Mumbai',
            area: 'Bandra',
            pincode: '400050',
            pickupLocation: 'Bandra West',
          },
          ownerRef: { type: 'user', id: sellerUser.id || sellerUser._id },
        },
        listing: {
          purpose: 'sale',
          moderationStatus: 'approved',
          sale: {
            enabled: true,
            status: 'reserved', // Reserved is publicly visible per Spec 18.1
            askingPrice: 110000000, // 11 Lakhs
            negotiable: true,
            minAcceptableOffer: 105000000,
            description: 'Executive sedan currently reserved for a buyer.',
          },
          ownerRef: { type: 'user', id: sellerUser.id || sellerUser._id },
        },
      },
    ];

    for (const item of dataset) {
      const v = await Vehicle.create(item.vehicle);
      const l = await Listing.create({
        ...item.listing,
        vehicleRef: v._id,
      });
      sampleListings.push({ vehicle: v, listing: l });
    }
  });

  describe('GET /api/listings (Discovery Engine)', () => {
    it('should return all approved active/reserved listings with total and facet counts', async () => {
      const res = await request(app).get('/api/listings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(4);
      expect(res.body.data.total).toBe(4);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(20);

      // Verify facet counts existence
      const facets = res.body.data.facetCounts;
      expect(facets).toBeDefined();
      expect(facets.fuel.Petrol).toBe(3);
      expect(facets.fuel.Diesel).toBe(1);
      expect(facets.bodyType.Sedan).toBe(2);
      expect(facets.bodyType.SUV).toBe(2);
      expect(facets.transmission.Automatic).toBe(3);
      expect(facets.transmission.Manual).toBe(1);
      expect(facets.sellerType.individual).toBe(3);
      expect(facets.sellerType.dealer).toBe(1);
      expect(facets.cities.Mumbai).toBe(2);
    });

    it('should filter by keyword q across brand, model, and description', async () => {
      const res = await request(app).get('/api/listings?q=Nexon');

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].vehicleRef.model).toBe('Nexon');
    });

    it('should safely escape regex special characters in q without throwing', async () => {
      const res = await request(app).get('/api/listings?q=City+(V)');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
    });

    it('should filter by purpose (sale, rent, both)', async () => {
      // Purpose sale should return items with purpose in ['sale', 'both']
      const saleRes = await request(app).get('/api/listings?purpose=sale');
      expect(saleRes.status).toBe(200);
      expect(saleRes.body.data.items.length).toBe(3);

      // Purpose rent should return items with purpose in ['rent', 'both']
      const rentRes = await request(app).get('/api/listings?purpose=rent');
      expect(rentRes.status).toBe(200);
      expect(rentRes.body.data.items.length).toBe(2);
    });

    it('should filter by price range on sale asking price', async () => {
      // Filter prices between 10.5 Lakhs and 13 Lakhs (paise)
      const res = await request(app).get('/api/listings?minPrice=105000000&maxPrice=130000000');
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(2); // Tata Nexon (12L) and Honda Civic (11L)
    });

    it('should filter price by rental.dailyPrice when purpose=rent', async () => {
      const res = await request(app).get('/api/listings?purpose=rent&minPrice=380000');
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].vehicleRef.model).toBe('Creta');
    });

    it('should filter by vehicle attributes (brand, fuel, transmission, bodyType, condition)', async () => {
      const res = await request(app).get(
        '/api/listings?brand=Honda&fuel=Petrol&bodyType=Sedan&transmission=Manual'
      );
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].vehicleRef.model).toBe('City');
    });

    it('should filter by location (city, area, pincode)', async () => {
      const resCity = await request(app).get('/api/listings?city=New%20Delhi');
      expect(resCity.status).toBe(200);
      expect(resCity.body.data.items.length).toBe(1);
      expect(resCity.body.data.items[0].vehicleRef.location.city).toBe('New Delhi');

      const resPin = await request(app).get('/api/listings?pincode=400053');
      expect(resPin.status).toBe(200);
      expect(resPin.body.data.items.length).toBe(1);
      expect(resPin.body.data.items[0].vehicleRef.location.pincode).toBe('400053');
    });

    it('should filter by sellerType (individual vs dealer)', async () => {
      const resDealer = await request(app).get('/api/listings?sellerType=dealer');
      expect(resDealer.status).toBe(200);
      expect(resDealer.body.data.items.length).toBe(1);
      expect(resDealer.body.data.items[0].ownerRef.type).toBe('dealer');

      const resInd = await request(app).get('/api/listings?sellerType=individual');
      expect(resInd.status).toBe(200);
      expect(resInd.body.data.items.length).toBe(3);
    });

    it('should filter by manufacturing year range and km driven', async () => {
      const res = await request(app).get('/api/listings?yearFrom=2021&yearTo=2023&kmMax=25000');
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].vehicleRef.model).toBe('Nexon');
    });

    it('should provide disjunctive facet counts (other options remain visible when a filter is applied)', async () => {
      // When filtering by fuel=Diesel, bodyType facet counts apply all filters,
      // BUT the fuel facet itself is disjunctive and still shows Petrol counts
      const res = await request(app).get('/api/listings?fuel=Diesel');

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      // Disjunctive check: fuel facet still reports Petrol count from other matching records
      expect(res.body.data.facetCounts.fuel.Petrol).toBe(3);
      expect(res.body.data.facetCounts.fuel.Diesel).toBe(1);
    });

    it('should sort correctly by priceAsc, priceDesc, year, and lowestKm', async () => {
      // 1. priceAsc
      const ascRes = await request(app).get('/api/listings?sort=priceAsc');
      expect(ascRes.status).toBe(200);
      const prices = ascRes.body.data.items.map(i => i.sale.askingPrice);
      expect(prices[0]).toBeLessThanOrEqual(prices[1]);

      // 2. priceDesc
      const descRes = await request(app).get('/api/listings?sort=priceDesc');
      expect(descRes.status).toBe(200);
      const descPrices = descRes.body.data.items.map(i => i.sale.askingPrice);
      expect(descPrices[0]).toBeGreaterThanOrEqual(descPrices[1]);

      // 3. year (newest manufacturing year first)
      const yearRes = await request(app).get('/api/listings?sort=year');
      expect(yearRes.status).toBe(200);
      expect(yearRes.body.data.items[0].vehicleRef.manufacturingYear).toBe(2022);

      // 4. lowestKm
      const kmRes = await request(app).get('/api/listings?sort=lowestKm');
      expect(kmRes.status).toBe(200);
      expect(kmRes.body.data.items[0].vehicleRef.kmDriven).toBe(18000);
    });

    it('should reject invalid sort value with 400 ValidationError', async () => {
      const res = await request(app).get('/api/listings?sort=unsupported_sort');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should cap page limit at 50', async () => {
      const res = await request(app).get('/api/listings?limit=100');
      // Zod validation caps limit at 50 or rejects if exceeds max 50
      expect(res.status).toBe(400); // Exceeds max(50)
    });

    it('should strip private fields (minAcceptableOffer, registrationNumber, documents) in public results', async () => {
      const res = await request(app).get('/api/listings');

      expect(res.status).toBe(200);
      for (const item of res.body.data.items) {
        if (item.sale) {
          expect(item.sale.minAcceptableOffer).toBeUndefined();
        }
        if (item.vehicleRef) {
          expect(item.vehicleRef.registrationNumber).toBeUndefined();
          expect(item.vehicleRef.documents).toBeUndefined();
        }
      }
    });

    it('should return empty results gracefully with total 0', async () => {
      const res = await request(app).get('/api/listings?brand=Ferrari');
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(0);
      expect(res.body.data.total).toBe(0);
    });
  });

  describe('GET /api/listings/:id (Vehicle Detail Endpoint)', () => {
    it('should return listing details, seller summary, and similar listings for public user', async () => {
      const target = sampleListings[0]; // Honda City Sedan 10L
      const res = await request(app).get(`/api/listings/${target.listing._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const listing = res.body.data;
      expect(listing.id).toBe(target.listing._id.toString());
      expect(listing.vehicleRef.model).toBe('City');
      // Private fields stripped
      expect(listing.sale.minAcceptableOffer).toBeUndefined();
      expect(listing.vehicleRef.registrationNumber).toBeUndefined();

      // Seller summary check (email visible because contactVisibility.email is true; mobile hidden)
      expect(listing.seller).toBeDefined();
      expect(listing.seller.name).toBe('Rajesh Sharma');
      expect(listing.seller.sellerType).toBe('individual');
      expect(listing.seller.email).toBe('rajesh@roam.local');
      expect(listing.seller.mobile).toBeUndefined();
      expect(listing.seller.passwordHash).toBeUndefined();

      // Similar listings check (Honda Civic is also a Sedan around 11L, within +/-25% of 10L)
      expect(Array.isArray(listing.similarListings)).toBe(true);
      expect(listing.similarListings.length).toBeGreaterThanOrEqual(1);
      const similarCivic = listing.similarListings.find(s => s.vehicleRef.model === 'Civic');
      expect(similarCivic).toBeDefined();
    });

    it('should allow public access to reserved listings', async () => {
      const reservedListing = sampleListings[3]; // Honda Civic (reserved)
      const res = await request(app).get(`/api/listings/${reservedListing.listing._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sale.status).toBe('reserved');
    });

    it('should return 404 for draft, inactive, sold, or removed listings to non-owner users', async () => {
      // 1. Create a draft listing
      const v = await Vehicle.create({
        brand: 'Ford',
        model: 'EcoSport',
        bodyType: 'SUV',
        manufacturingYear: 2021,
        registrationYear: 2021,
        registrationNumber: 'MH 01 EE 5555',
        fuelType: 'Diesel',
        transmission: 'Manual',
        kmDriven: 40000,
        condition: 'Good',
        colour: 'Blue',
        seatingCapacity: 5,
        location: { country: 'India', state: 'Maharashtra', city: 'Mumbai', pincode: '400001' },
        ownerRef: { type: 'user', id: sellerUser.id || sellerUser._id },
      });
      const draftListing = await Listing.create({
        vehicleRef: v._id,
        ownerRef: { type: 'user', id: sellerUser.id || sellerUser._id },
        purpose: 'sale',
        moderationStatus: 'draft',
        sale: { status: 'inactive', askingPrice: 70000000 },
      });

      // Public request without token -> 404
      const publicRes = await request(app).get(`/api/listings/${draftListing._id}`);
      expect(publicRes.status).toBe(404);

      // Other user token -> 404
      const otherRes = await request(app)
        .get(`/api/listings/${draftListing._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);
      expect(otherRes.status).toBe(404);

      // Owner request -> 200 (owner can view own draft)
      const ownerRes = await request(app)
        .get(`/api/listings/${draftListing._id}`)
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.moderationStatus).toBe('draft');
    });
  });
});