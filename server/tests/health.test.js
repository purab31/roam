const request = require('supertest');
const app = require('../src/app');

describe('API Foundation & Health Checks', () => {
  describe('GET /api/health', () => {
    it('should return 200 with healthy status and database info in response envelope', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status', 'healthy');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('database');
    });
  });

  describe('Route Not Found (404)', () => {
    it('should return 404 with NOT_FOUND error code for non-existent route', async () => {
      const res = await request(app).get('/api/non-existent-route');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route GET /api/non-existent-route not found',
        },
      });
    });
  });

  describe('Central Error Handler & Typed AppErrors', () => {
    it('should format ValidationError with 400 and fields', async () => {
      const res = await request(app).get('/api/test/validation-error');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid listing data',
          fields: {
            price: 'Price must be a positive integer',
            title: 'Title is required',
          },
        },
      });
    });

    it('should format AuthError with 401 and AUTH_ERROR code', async () => {
      const res = await request(app).get('/api/test/auth-error');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication token missing or invalid',
        },
      });
    });

    it('should format ForbiddenError with 403 and FORBIDDEN_ERROR code', async () => {
      const res = await request(app).get('/api/test/forbidden-error');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN_ERROR',
          message: 'You do not have the seller capability',
        },
      });
    });

    it('should format ConflictError with 409 and CONFLICT_ERROR code', async () => {
      const res = await request(app).get('/api/test/conflict-error');

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'CONFLICT_ERROR',
          message: 'A booking already exists for the requested dates',
        },
      });
    });

    it('should handle malformed JSON body with 400 MALFORMED_JSON', async () => {
      const res = await request(app)
        .post('/api/health')
        .set('Content-Type', 'application/json')
        .send('{ "invalidJson": ');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MALFORMED_JSON');
    });
  });
});
