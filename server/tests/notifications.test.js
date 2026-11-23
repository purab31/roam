const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Notification = require('../src/models/notification.model');

describe('Sprint 4: Notifications API', () => {
  let mongod;
  let user, userToken;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'roam_test' },
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await User.deleteMany({});

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Devika Pillai',
        email: 'devika@roam.local',
        password: 'Password@123',
        passwordConfirm: 'Password@123',
        mobile: '+919844455566',
        capabilities: ['buyer'],
        acceptTerms: true,
      });
    userToken = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    user = res.body.data.user;

    // Seed sample notifications
    await Notification.create([
      {
        recipient: user._id,
        type: 'offer',
        title: 'Offer Received',
        message: 'You received an offer of ₹10,00,000.',
        read: false,
      },
      {
        recipient: user._id,
        type: 'enquiry',
        title: 'Enquiry Received',
        message: 'A buyer enquired about vehicle history.',
        read: false,
      },
      {
        recipient: user._id,
        type: 'system',
        title: 'Welcome to Roam',
        message: 'Your account is verified.',
        read: true,
      },
    ]);
  });

  it('should retrieve notifications with unread count on GET /api/notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.unreadCount).toBe(2);
  });

  it('should filter notifications by unreadOnly=true', async () => {
    const res = await request(app)
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items.every(n => !n.read)).toBe(true);
  });

  it('should filter notifications by type', async () => {
    const res = await request(app)
      .get('/api/notifications?type=offer')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].type).toBe('offer');
  });

  it('should mark single notification as read on PATCH /api/notifications/:id/read', async () => {
    const unread = await Notification.findOne({ recipient: user._id, read: false });

    const res = await request(app)
      .patch(`/api/notifications/${unread._id}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.read).toBe(true);

    const check = await Notification.findById(unread._id);
    expect(check.read).toBe(true);
  });

  it('should mark all notifications as read on PATCH /api/notifications/read-all', async () => {
    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const remainingUnread = await Notification.countDocuments({ recipient: user._id, read: false });
    expect(remainingUnread).toBe(0);
  });
});
