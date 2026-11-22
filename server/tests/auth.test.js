const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const app = require('../src/app');
const User = require('../src/models/user.model');
const config = require('../src/config/env');

// Mock User model to run hermetic, fast, self-contained unit/integration tests without external DB
jest.mock('../src/models/user.model');

describe('Sprint 1: Authentication, Capabilities & Profiles', () => {
  let mockUserInstance;
  let sampleHashedPassword;

  beforeAll(async () => {
    sampleHashedPassword = await bcrypt.hash('SecurePassword123!', 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserInstance = {
      _id: '654321654321654321654321',
      fullName: 'John Roam',
      email: 'john@roam.local',
      mobile: '+1234567890',
      passwordHash: sampleHashedPassword,
      capabilities: ['buyer', 'renter'],
      accountStatus: 'active',
      contactVisibility: { email: false, mobile: false },
      profilePhoto: null,
      comparePassword: jest.fn(async pwd => pwd === 'SecurePassword123!'),
      createPasswordResetToken: jest.fn(() => 'sample-plain-reset-token-12345'),
      save: jest.fn(async function () {
        return this;
      }),
      toSafeObject: jest.fn(function () {
        return {
          _id: this._id,
          fullName: this.fullName,
          email: this.email,
          mobile: this.mobile,
          capabilities: this.capabilities,
          accountStatus: this.accountStatus,
          contactVisibility: this.contactVisibility,
          profilePhoto: this.profilePhoto,
        };
      }),
    };
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      fullName: 'Alice Walker',
      email: 'alice@roam.local',
      mobile: '+1987654321',
      password: 'StrongPassword123!',
      passwordConfirm: 'StrongPassword123!',
      acceptTerms: true,
      capabilities: ['buyer', 'seller'],
    };

    it('should successfully register a new user and set httpOnly auth cookie', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        ...mockUserInstance,
        fullName: validRegistrationData.fullName,
        email: validRegistrationData.email,
        mobile: validRegistrationData.mobile,
        capabilities: validRegistrationData.capabilities,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe('alice@roam.local');

      // Check httpOnly cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('roam_token'))).toBe(true);
      expect(cookies.some(c => c.includes('HttpOnly'))).toBe(true);
    });

    it('should reject registration with 409 when email already exists', async () => {
      User.findOne.mockImplementation(({ email }) => {
        if (email === validRegistrationData.email) return Promise.resolve(mockUserInstance);
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT_ERROR');
      expect(res.body.error.message).toBe('Email address is already registered');
    });

    it('should reject registration with 409 when mobile already exists', async () => {
      User.findOne.mockImplementation(({ email, mobile }) => {
        if (email) return Promise.resolve(null);
        if (mobile === validRegistrationData.mobile) return Promise.resolve(mockUserInstance);
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT_ERROR');
      expect(res.body.error.message).toBe('Mobile number is already registered');
    });

    it('should return 400 validation error when required fields are missing or invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'A', // too short
          email: 'not-an-email',
          mobile: '123',
          password: 'StrongPassword123!',
          acceptTerms: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toHaveProperty('email');
      expect(res.body.error.fields).toHaveProperty('fullName');
      expect(res.body.error.fields).toHaveProperty('acceptTerms');
    });

    it('should return 400 validation error when passwords do not match', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistrationData,
          password: 'StrongPassword123!',
          passwordConfirm: 'DifferentPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toHaveProperty('passwordConfirm');
      expect(res.body.error.fields.passwordConfirm).toBe('Passwords do not match');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user with valid credentials and return user and cookie', async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'john@roam.local',
        password: 'SecurePassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john@roam.local');

      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.includes('roam_token'))).toBe(true);
    });

    it('should reject login with 401 when password is wrong', async () => {
      mockUserInstance.comparePassword = jest.fn().mockResolvedValue(false);
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'john@roam.local',
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_ERROR');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject login with 401 when email is not found', async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@roam.local',
        password: 'AnyPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear authentication cookie', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.includes('roam_token=;'))).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password & /reset-password', () => {
    it('should return 200 message and generate single-use token on forgot-password', async () => {
      User.findOne.mockResolvedValue(mockUserInstance);

      const res = await request(app).post('/api/auth/forgot-password').send({
        email: 'john@roam.local',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserInstance.createPasswordResetToken).toHaveBeenCalled();
      expect(mockUserInstance.save).toHaveBeenCalled();
    });

    it('should reject reset-password with 400 when token is invalid or expired', async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app).post('/api/auth/reset-password').send({
        token: 'invalid-or-expired-token',
        password: 'BrandNewPassword123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('invalid or has expired');
    });
  });

  describe('Profile & Password Management', () => {
    let validToken;

    beforeAll(() => {
      validToken = jwt.sign(
        { id: '654321654321654321654321' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
    });

    it('should return current user profile on GET /api/users/profile', async () => {
      User.findById.mockResolvedValue(mockUserInstance);

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john@roam.local');
    });

    it('should reject unauthenticated request with 401 AUTH_ERROR', async () => {
      const res = await request(app).get('/api/users/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_ERROR');
    });

    it('should reject expired session token with 401 AUTH_ERROR', async () => {
      const expiredToken = jwt.sign(
        { id: '654321654321654321654321' },
        config.jwtSecret,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_ERROR');
      expect(res.body.error.message).toContain('expired');
    });

    it('should update profile and contact visibility on PUT /api/users/profile', async () => {
      User.findById.mockResolvedValue(mockUserInstance);
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          fullName: 'Johnathan Roam',
          contactVisibility: { email: true, mobile: false },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserInstance.save).toHaveBeenCalled();
    });

    it('should update password on PUT /api/users/password', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });

      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'SecurePassword123!',
          newPassword: 'BrandNewSecurePassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserInstance.save).toHaveBeenCalled();
    });

    it('should request account deactivation on PATCH /api/users/account-status', async () => {
      User.findById.mockResolvedValue(mockUserInstance);

      const res = await request(app)
        .patch('/api/users/account-status')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserInstance.accountStatus).toBe('deactivation_requested');
    });

    it('should add seller capability on POST /api/users/capabilities', async () => {
      User.findById.mockResolvedValue(mockUserInstance);

      const res = await request(app)
        .post('/api/users/capabilities')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ capability: 'seller' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserInstance.capabilities).toContain('seller');
    });
  });

  describe('Capability & Deactivated User Enforcement', () => {
    it('should return 403 FORBIDDEN when user with only buyer capability hits a seller endpoint', async () => {
      const buyerToken = jwt.sign(
        { id: 'buyer-user-id-123' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const buyerUser = {
        ...mockUserInstance,
        capabilities: ['buyer'],
      };

      User.findById.mockResolvedValue(buyerUser);

      const res = await request(app)
        .get('/api/users/seller-test')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
      expect(res.body.error.message).toContain('seller');
    });

    it('should allow seller endpoint when user has seller capability', async () => {
      const sellerToken = jwt.sign(
        { id: 'seller-user-id-456' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const sellerUser = {
        ...mockUserInstance,
        capabilities: ['buyer', 'seller'],
      };

      User.findById.mockResolvedValue(sellerUser);

      const res = await request(app)
        .get('/api/users/seller-test')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should block deactivated user from create actions with 403', async () => {
      const deactivatedToken = jwt.sign(
        { id: 'deactivated-user-id-789' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const deactivatedUser = {
        ...mockUserInstance,
        accountStatus: 'deactivated',
      };

      User.findById.mockResolvedValue(deactivatedUser);

      const res = await request(app)
        .post('/api/users/create-action-test')
        .set('Authorization', `Bearer ${deactivatedToken}`)
        .send({ test: 'action' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
      expect(res.body.error.message).toContain('deactivated');
    });
  });
});
