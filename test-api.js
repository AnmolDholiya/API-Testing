/**
 * Automated Verification Script for Practical 4 Task Management REST API - Level 3 HATEOAS Suite
 * Tests Mongoose Integration, Schema Validation, Enum Constraints, ObjectId Validation, 
 * Centralized Error Pipeline, and Level 3 HATEOAS Hypermedia Links.
 */
const http = require('http');
const mongoose = require('mongoose');

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('🧪 Starting Practical 4 Level 3 HATEOAS Test Suite');
  console.log('----------------------------------------------------\n');

  let mongoServer = null;
  const defaultUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskdb';

  // Attempt connection to local MongoDB first
  try {
    await mongoose.connect(defaultUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`✅ Connected to local MongoDB at: ${defaultUri}`);
  } catch (err) {
    console.log('ℹ️ Local MongoDB connection failed or timed out. Initializing MongoMemoryServer...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;
    await mongoose.connect(mongoUri);
    console.log(`📦 Connected to In-Memory MongoDB Server at: ${mongoUri}`);
  }

  const app = require('./server.js');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const BASE_URL = `http://localhost:${port}`;

  function makeRequest(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: { ...headers }
      };

      let dataString = '';
      if (body !== null) {
        dataString = typeof body === 'string' ? body : JSON.stringify(body);
        if (!headers['Content-Type'] && !headers['content-type'] && headers['Content-Type'] !== null) {
          options.headers['Content-Type'] = 'application/json';
        }
        options.headers['Content-Length'] = Buffer.byteLength(dataString);
      }

      const req = http.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, rawBody: responseBody });
          }
        });
      });

      req.on('error', err => reject(err));
      if (body !== null) req.write(dataString);
      req.end();
    });
  }

  let passed = 0;
  let failed = 0;

  async function assertTest(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  let createdTaskId = null;

  // ── Existing Baseline Regression Tests ─────────────────────────────────────

  // Test 1: GET /tasks
  await assertTest('GET /tasks should return 200 OK and array of tasks with collection links', async () => {
    const res = await makeRequest('/tasks');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.success || !Array.isArray(res.body.data)) throw new Error('Invalid response structure');
    if (!res.body._links) throw new Error('Missing collection-level _links');
  });

  // Test 2: POST /tasks with valid payload
  await assertTest('POST /tasks should trim title, set defaults, and return 201 Created with HATEOAS links', async () => {
    const res = await makeRequest('/tasks', 'POST', {
      title: '   HATEOAS Level 3 Integration Test   ',
      description: 'Testing hypermedia response links',
      status: 'pending'
    });
    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    if (res.body.data.title !== 'HATEOAS Level 3 Integration Test') {
      throw new Error(`Pre-save title trim failed. Got '${res.body.data.title}'`);
    }
    if (res.body.data.status !== 'pending') throw new Error('Default status should be pending');
    if (!res.body.data._id) throw new Error('Missing MongoDB _id in response');
    if (!res.body._links || !res.body._links.self) throw new Error('Missing POST HATEOAS _links');
    createdTaskId = res.body.data._id;
  });

  // Test 3: POST /tasks with explicit enum priority 'high'
  await assertTest('POST /tasks with priority "high" should accept enum value', async () => {
    const res = await makeRequest('/tasks', 'POST', {
      title: 'Urgent Task',
      priority: 'high'
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (res.body.data.priority !== 'high') throw new Error('Priority was not set to high');
  });

  // Test 4: Missing required title field
  await assertTest('POST /tasks without title should return 400 Bad Request validation error', async () => {
    const res = await makeRequest('/tasks', 'POST', { description: 'No title provided' });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    if (res.body.error !== 'Validation Error' || !Array.isArray(res.body.details)) {
      throw new Error('Response is not structured JSON validation error format');
    }
  });

  // Test 5: Invalid priority value
  await assertTest('POST /tasks with invalid priority "super-high" should return 400 validation error', async () => {
    const res = await makeRequest('/tasks', 'POST', { title: 'Invalid Enum Task', priority: 'super-high' });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    if (res.body.error !== 'Validation Error') throw new Error('Expected structured validation error');
  });

  // ── Level 3 HATEOAS Specific Tests ─────────────────────────────────────────

  // Test 6: GET /tasks/:id contains _links.self
  await assertTest('1. GET /tasks/:id contains _links.self', async () => {
    const res = await makeRequest(`/tasks/${createdTaskId}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const links = res.body._links || res.body.data._links;
    if (!links || !links.self || links.self.method !== 'GET') {
      throw new Error('Missing or invalid _links.self');
    }
  });

  // Test 7: GET /tasks/:id contains update link
  await assertTest('2. GET /tasks/:id contains update link (PUT)', async () => {
    const res = await makeRequest(`/tasks/${createdTaskId}`);
    const links = res.body._links || res.body.data._links;
    if (!links || !links.update || links.update.method !== 'PUT') {
      throw new Error('Missing or invalid _links.update');
    }
  });

  // Test 8: GET /tasks/:id contains partialUpdate link
  await assertTest('3. GET /tasks/:id contains partialUpdate link (PATCH)', async () => {
    const res = await makeRequest(`/tasks/${createdTaskId}`);
    const links = res.body._links || res.body.data._links;
    if (!links || !links.partialUpdate || links.partialUpdate.method !== 'PATCH') {
      throw new Error('Missing or invalid _links.partialUpdate');
    }
  });

  // Test 9: GET /tasks/:id contains delete link
  await assertTest('4. GET /tasks/:id contains delete link (DELETE)', async () => {
    const res = await makeRequest(`/tasks/${createdTaskId}`);
    const links = res.body._links || res.body.data._links;
    if (!links || !links.delete || links.delete.method !== 'DELETE') {
      throw new Error('Missing or invalid _links.delete');
    }
  });

  // Test 10: GET /tasks/:id contains collection link
  await assertTest('5. GET /tasks/:id contains collection link', async () => {
    const res = await makeRequest(`/tasks/${createdTaskId}`);
    const links = res.body._links || res.body.data._links;
    if (!links || !links.collection || links.collection.href !== '/tasks') {
      throw new Error('Missing or invalid _links.collection');
    }
  });

  // Test 11: Pending task contains start link
  await assertTest('6. Pending task contains start link', async () => {
    const res = await makeRequest(`/tasks/${createdTaskId}`);
    const links = res.body._links || res.body.data._links;
    if (!links || !links.start || links.start.method !== 'PATCH') {
      throw new Error('Pending task must expose "start" link');
    }
  });

  // Test 12: In-progress task contains complete link
  await assertTest('7. In-progress task contains complete link', async () => {
    // Transition task to in-progress via PATCH
    const patchRes = await makeRequest(`/tasks/${createdTaskId}`, 'PATCH', { status: 'in-progress' });
    if (patchRes.status !== 200) throw new Error(`Expected 200, got ${patchRes.status}`);
    const links = patchRes.body._links || patchRes.body.data._links;
    if (!links || !links.complete || links.complete.method !== 'PATCH') {
      throw new Error('In-progress task must expose "complete" link');
    }
    if (links.start) throw new Error('In-progress task must NOT expose "start" link');
  });

  // Test 13: Completed task does not contain complete link
  await assertTest('8. Completed task does not contain complete link', async () => {
    // Transition task to completed via PATCH
    const patchRes = await makeRequest(`/tasks/${createdTaskId}`, 'PATCH', { status: 'completed' });
    if (patchRes.status !== 200) throw new Error(`Expected 200, got ${patchRes.status}`);
    const links = patchRes.body._links || patchRes.body.data._links;
    if (links.complete) throw new Error('Completed task must NOT expose "complete" link');
    if (links.start) throw new Error('Completed task must NOT expose "start" link');
  });

  // Test 14: GET /tasks contains task-level HATEOAS links
  await assertTest('9. GET /tasks contains task-level HATEOAS links in data array', async () => {
    const res = await makeRequest('/tasks');
    const firstTask = res.body.data[0];
    if (!firstTask || !firstTask._links || !firstTask._links.self) {
      throw new Error('Task item in array missing _links.self');
    }
  });

  // Test 15: GET /tasks contains collection-level links
  await assertTest('10. GET /tasks contains collection-level links', async () => {
    const res = await makeRequest('/tasks');
    if (!res.body._links || !res.body._links.create || !res.body._links.first) {
      throw new Error('GET /tasks missing collection-level _links');
    }
  });

  // Test 16: Pagination contains first link
  await assertTest('11. Pagination contains first link', async () => {
    const res = await makeRequest('/tasks?page=1&limit=5');
    if (!res.body._links || !res.body._links.first) {
      throw new Error('Pagination missing "first" link');
    }
  });

  // Test 17: Pagination contains next link when applicable
  await assertTest('12. Pagination contains next link when applicable', async () => {
    // Create multiple tasks to ensure > 1 page
    for (let i = 0; i < 5; i++) {
      await makeRequest('/tasks', 'POST', { title: `Pagination Task ${i}` });
    }
    const res = await makeRequest('/tasks?page=1&limit=2');
    if (!res.body._links || !res.body._links.next) {
      throw new Error('Pagination page 1 missing "next" link when more pages exist');
    }
  });

  // Test 18: Pagination contains previous link when applicable
  await assertTest('13. Pagination contains previous link when applicable', async () => {
    const res = await makeRequest('/tasks?page=2&limit=2');
    if (!res.body._links || !res.body._links.previous) {
      throw new Error('Pagination page 2 missing "previous" link');
    }
  });

  // Test 19: Pagination preserves search/status/limit query parameters
  await assertTest('14. Pagination preserves search/status/limit query parameters', async () => {
    const res = await makeRequest('/tasks?search=Pagination&status=pending&page=1&limit=2');
    const nextHref = res.body._links?.next?.href;
    if (!nextHref) throw new Error('Missing next href');
    if (!nextHref.includes('search=Pagination') || !nextHref.includes('status=pending') || !nextHref.includes('limit=2')) {
      throw new Error(`Pagination link did not preserve query params: ${nextHref}`);
    }
  });

  // Test 20: POST /tasks returns HATEOAS links
  await assertTest('15. POST /tasks returns HATEOAS links', async () => {
    const res = await makeRequest('/tasks', 'POST', { title: 'New HATEOAS Task' });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (!res.body._links || !res.body._links.self || !res.body._links.delete) {
      throw new Error('POST /tasks missing expected HATEOAS links');
    }
  });

  // Test 21: PATCH /tasks/:id regenerates links according to new status
  await assertTest('16. PATCH /tasks/:id regenerates links according to new status', async () => {
    const postRes = await makeRequest('/tasks', 'POST', { title: 'State Test Task', status: 'pending' });
    const id = postRes.body.data._id;

    // PATCH to in-progress
    const patchRes1 = await makeRequest(`/tasks/${id}`, 'PATCH', { status: 'in-progress' });
    if (!patchRes1.body._links.complete) throw new Error('PATCH to in-progress did not generate complete link');

    // PATCH to completed
    const patchRes2 = await makeRequest(`/tasks/${id}`, 'PATCH', { status: 'completed' });
    if (patchRes2.body._links.complete) throw new Error('PATCH to completed should remove complete link');
  });

  // Test 22: PUT /tasks/:id regenerates links according to new status
  await assertTest('17. PUT /tasks/:id regenerates links according to new status', async () => {
    const postRes = await makeRequest('/tasks', 'POST', { title: 'PUT State Task', status: 'pending' });
    const id = postRes.body.data._id;

    const putRes = await makeRequest(`/tasks/${id}`, 'PUT', { title: 'PUT Updated Task', status: 'in-progress' });
    if (putRes.status !== 200) throw new Error(`Expected 200, got ${putRes.status}`);
    if (!putRes.body._links.complete) throw new Error('PUT update to in-progress did not expose complete link');
  });

  // Test 23: Invalid task IDs still return proper error
  await assertTest('18. Invalid task IDs still return existing proper error (400)', async () => {
    const res = await makeRequest('/tasks/invalid-123-abc');
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Test 24: Non-existent ObjectId returns 404
  await assertTest('19. Non-existent ObjectId returns 404 Not Found', async () => {
    const res = await makeRequest('/tasks/507f1f77bcf86cd799439011');
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  // Test 25: DELETE /tasks/:id
  await assertTest('20. DELETE /tasks/:id deletes document and returns 200 OK', async () => {
    const postRes = await makeRequest('/tasks', 'POST', { title: 'Task To Delete' });
    const id = postRes.body.data._id;

    const delRes = await makeRequest(`/tasks/${id}`, 'DELETE');
    if (delRes.status !== 200) throw new Error(`Expected 200, got ${delRes.status}`);

    const getRes = await makeRequest(`/tasks/${id}`);
    if (getRes.status !== 404) throw new Error('Deleted task should return 404');
  });

  // Test 26: Global Error Handler route
  await assertTest('GET /tasks/test-error triggers Global Error Handler with 500 status', async () => {
    const res = await makeRequest('/tasks/test-error');
    if (res.status !== 500) throw new Error(`Expected 500, got ${res.status}`);
  });

  console.log('\n----------------------------------------------------');
  console.log(`📊 Test Execution Summary: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------');

  server.close();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
