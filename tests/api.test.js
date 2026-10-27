/**
 * Practical 12: CI/CD Automated Test Suite
 * Technologies: Jest, Supertest, Express.js, MongoDB / MongoMemoryServer
 * 
 * Tests:
 * 1. GET /health - Public health check endpoint (status 200, service details)
 * 2. GET /tasks without token - Security assertion (status 401 Unauthorized)
 * 3. GET /tasks with valid JWT - Task API retrieval (status 200 OK, array payload)
 * 4. POST /tasks with valid data - Task creation endpoint (status 201 Created)
 * 5. POST /tasks with missing title - Input validation negative assertion (status 400 Bad Request)
 * 6. GET /tasks/:id with non-existent ID - Error handling negative assertion (status 404 Not Found)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let mongoServer = null;
let app = null;
let authToken = null;
let createdTaskId = null;

beforeAll(async () => {
  // Set up database: use local MongoDB if running, otherwise use in-memory MongoDB
  const defaultUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskdb';
  try {
    await mongoose.connect(defaultUri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
  }

  // Import Express application after database URI is configured
  app = require('../server');

  // Seed test user and generate JWT token for authenticated routes
  const User = require('../src/models/User');
  await User.deleteMany({ email: 'ci-tester@example.com' });
  const testUser = new User({
    name: 'CI Pipeline Tester',
    email: 'ci-tester@example.com',
    password: 'password123'
  });
  await testUser.save();

  const secret = process.env.JWT_SECRET || 'adwf_jwt_secret_key_practical_7_2026';
  authToken = jwt.sign(
    { id: testUser._id, email: testUser.email },
    secret,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  // Clean up seeded records
  if (mongoose.connection.readyState === 1) {
    const User = require('../src/models/User');
    const Task = require('../src/models/Task');
    await User.deleteMany({ email: 'ci-tester@example.com' });
    if (createdTaskId) {
      await Task.findByIdAndDelete(createdTaskId);
    }
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('CI/CD Automated API Tests (Practical 12)', () => {

  // ── TEST 1: Health Check Endpoint ──────────────────────────────────────────
  describe('GET /health', () => {
    it('should return HTTP 200 with service status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'task-manager-backend');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // ── TEST 2: Task API Security / Authentication ──────────────────────────────
  describe('GET /tasks (Authentication guard)', () => {
    it('should return HTTP 401 Unauthorized when no JWT token is provided', async () => {
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── TEST 3: Task API Retrieval ──────────────────────────────────────────────
  describe('GET /tasks (Authenticated retrieval)', () => {
    it('should return HTTP 200 and a list of tasks for authenticated requests', async () => {
      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('_links');
    });
  });

  // ── TEST 4: Task Creation Endpoint ──────────────────────────────────────────
  describe('POST /tasks', () => {
    it('should return HTTP 201 Created when creating a valid task', async () => {
      const taskPayload = {
        title: 'CI/CD Automated Test Task',
        description: 'Verifying automated pipeline integration',
        status: 'pending',
        priority: 'high',
        assignedUser: 'ci-tester@example.com'
      };

      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', taskPayload.title);
      expect(res.body.data).toHaveProperty('status', 'pending');
      expect(res.body.data).toHaveProperty('_id');

      createdTaskId = res.body.data._id;
    });

    it('should return HTTP 400 Bad Request when task title is missing', async () => {
      const invalidPayload = {
        description: 'Missing title property',
        status: 'pending'
      };

      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayload);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── TEST 5: Non-existent Task Resource Handling ─────────────────────────────
  describe('GET /tasks/:id (Negative assertion)', () => {
    it('should return HTTP 404 Not Found for non-existent task ObjectId', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

});
