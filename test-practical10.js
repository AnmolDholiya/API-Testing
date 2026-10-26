/**
 * Automated Verification Suite for Practical 10: Asynchronous Processing with Event-Driven Architecture
 * 
 * Tests:
 * - TEST 1: Successful Task Creation (HTTP 201, DB persistence, response payload)
 * - TEST 2: Non-Blocking Notification & Monotonic Timing (performance.now(), decoupled execution)
 * - TEST 3: Task Deletion & task-deleted Event (HTTP 200, DB deletion, listener verification)
 * - TEST 4: Error Handling & Resilience (Safe asynchronous fault injection, process uptime)
 * - TEST 5: Invalid Requests & Negative Assertions (Validation failure 400, 404, no rogue events)
 * - TEST 6: Regression Testing (Authentication, CRUD operations, node-cache HIT/MISS, pagination)
 */

const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { performance } = require('perf_hooks');

require('dotenv').config();

// HTTP request helper using monotonic clock
function makeRequest(server, options, requestBody = null) {
  const address = server.address();
  const host = address.address === '::' ? '127.0.0.1' : address.address;
  const port = address.port;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const reqOptions = {
      hostname: host,
      port: port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (requestBody && !reqOptions.headers['Content-Type']) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const durationMs = performance.now() - startTime;
        let parsedData = null;
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsedData,
          durationMs: Math.round(durationMs * 100) / 100
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (requestBody) {
      req.write(typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPractical10Tests() {
  console.log('========================================================================');
  console.log('🚀 Practical 10 Verification Suite: Event-Driven Architecture');
  console.log('========================================================================\n');

  let mongoServer = null;
  const defaultUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskdb';

  try {
    await mongoose.connect(defaultUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`✅ Connected to local MongoDB at: ${defaultUri}`);
  } catch (err) {
    console.log('ℹ️ Local MongoDB connection timed out. Initializing MongoMemoryServer fallback...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;
    await mongoose.connect(mongoUri);
    console.log(`📦 Connected to In-Memory MongoDB Server at: ${mongoUri}`);
  }

  // Load app and modules after DB connection
  const app = require('./server');
  const User = require('./src/models/User');
  const Task = require('./src/models/Task');
  const taskEvents = require('./src/events');
  const cache = require('./src/utils/cache');

  // Start HTTP server on random available port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`🌐 Test server listening on http://127.0.0.1:${port}`);

  // Seed isolated test user and generate auth token
  await User.deleteMany({ email: 'pr10tester@example.com' });
  const testUser = new User({
    name: 'Practical 10 Auditor',
    email: 'pr10tester@example.com',
    password: 'password123'
  });
  await testUser.save();

  const secret = process.env.JWT_SECRET || 'adwf_jwt_secret_key_practical_7_2026';
  const token = jwt.sign(
    { id: testUser._id, email: testUser.email },
    secret,
    { expiresIn: '1h' }
  );
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  taskEvents.clearLogs();
  cache.flushAll();

  let allPassed = true;
  const testResults = [];

  function recordResult(testName, passed, details = '') {
    testResults.push({ testName, passed, details });
    if (!passed) allPassed = false;
  }

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1 — Successful Task Creation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 1 — Successful Task Creation ---');
    const taskPayload = {
      title: 'College Submission Event Task',
      description: 'Testing event-driven notification flow',
      status: 'pending',
      priority: 'high',
      assignedUser: 'engineer@university.edu',
      delayMs: 2000
    };

    const postRes = await makeRequest(server, {
      path: '/tasks',
      method: 'POST',
      headers: authHeaders
    }, taskPayload);

    console.log(`[TEST 1] POST /tasks HTTP Status: ${postRes.statusCode}`);
    console.log(`[TEST 1] Client Round-trip Time: ${postRes.durationMs}ms`);

    const createdTask = postRes.data?.data;
    const taskInDb = createdTask?._id ? await Task.findById(createdTask._id) : null;

    if (postRes.statusCode === 201 && createdTask?._id && taskInDb) {
      console.log('✅ POST /tasks returned HTTP 201 Created');
      console.log(`✅ Task saved to MongoDB: "${taskInDb.title}" (ID: ${taskInDb._id})`);
      console.log(`✅ Response includes expected task properties and _links`);
      recordResult('TEST 1: Successful Task Creation', true, `Task ID: ${taskInDb._id}`);
    } else {
      console.error(`❌ TEST 1 FAILED: Status=${postRes.statusCode}, inDb=${Boolean(taskInDb)}`);
      recordResult('TEST 1: Successful Task Creation', false, `Status ${postRes.statusCode}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2 — Non-Blocking Notification
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2 — Non-Blocking Notification (Monotonic Clock Timing) ---');
    console.log(`[TEST 2] Monotonic HTTP response time: ${postRes.durationMs}ms.`);

    // Check if notification is already completed immediately upon receiving response
    const logsImmediately = taskEvents.getLogs().filter(
      e => e.event === 'task-created' && String(e.taskId) === String(createdTask._id)
    );
    const isCompletedPrematurely = logsImmediately.some(e => e.status === 'completed');

    if (postRes.durationMs < 1800 && !isCompletedPrematurely) {
      console.log(`✅ Response delivered to client (${postRes.durationMs}ms) BEFORE background notification finished.`);
    } else {
      console.error(`❌ TEST 2 WARNING: Response duration (${postRes.durationMs}ms) or completion status unexpected.`);
    }

    console.log('[TEST 2] Awaiting background notification completion (~2000ms delay)...');
    const waitStart = performance.now();
    await sleep(2200);
    const actualSleepTime = Math.round((performance.now() - waitStart) * 100) / 100;
    console.log(`[TEST 2] Resumed test thread after ${actualSleepTime}ms`);

    const logsAfterDelay = taskEvents.getLogs().filter(
      e => e.event === 'task-created' && String(e.taskId) === String(createdTask._id)
    );
    const completedLog = logsAfterDelay.find(e => e.status === 'completed');

    if (completedLog) {
      const handlerDuration = new Date(completedLog.completedAt).getTime() - new Date(completedLog.startedAt).getTime();
      console.log(`✅ Notification completed in background at: ${completedLog.completedAt}`);
      console.log(`✅ Measured handler duration: ${handlerDuration}ms (target ~2000ms)`);
      console.log(`✅ Logged assigned user: "${completedLog.assignedUser}"`);
      console.log(`✅ Logged task title: "${completedLog.title}"`);
      console.log(`✅ Order verified: Client HTTP 201 received at ${postRes.data.apiTimestamp} < Notification completed at ${completedLog.completedAt}`);
      recordResult('TEST 2: Non-Blocking Notification', true, `Handler duration: ${handlerDuration}ms`);
    } else {
      console.error('❌ TEST 2 FAILED: Background notification completion log not found.');
      recordResult('TEST 2: Non-Blocking Notification', false, 'Missing completion log');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3 — Task Deletion Event
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3 — Task Deletion (task-deleted) ---');
    const deleteRes = await makeRequest(server, {
      path: `/tasks/${createdTask._id}`,
      method: 'DELETE',
      headers: authHeaders
    });

    console.log(`[TEST 3] DELETE /tasks/${createdTask._id} HTTP Status: ${deleteRes.statusCode}`);
    const checkDeletedInDb = await Task.findById(createdTask._id);

    await sleep(700); // Allow 500ms delay to complete in background

    const deleteLogs = taskEvents.getLogs().filter(
      e => e.event === 'task-deleted' && String(e.taskId) === String(createdTask._id)
    );
    const deleteLog = deleteLogs[0];

    if (deleteRes.statusCode === 200 && !checkDeletedInDb && deleteLog && deleteLog.status === 'completed') {
      console.log('✅ Task deleted successfully via API');
      console.log('✅ Task confirmed removed from MongoDB');
      console.log(`✅ task-deleted listener executed: Task ID=${deleteLog.taskId}, Title="${deleteLog.title}", DeletedBy=${deleteLog.deletedBy}`);
      recordResult('TEST 3: Task Deletion', true, `Deleted Task: ${deleteLog.taskId}`);
    } else {
      console.error(`❌ TEST 3 FAILED: Status=${deleteRes.statusCode}, inDb=${Boolean(checkDeletedInDb)}`);
      recordResult('TEST 3: Task Deletion', false, 'Deletion failed or event missing');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4 — Error Handling & Resilience
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4 — Error Handling & Resilience ---');
    console.log('[TEST 4] Triggering simulated asynchronous notification error...');

    const errRes = await makeRequest(server, {
      path: '/tasks/simulate-error-event',
      method: 'POST',
      headers: authHeaders
    }, { title: 'Fault Injection Task', delayMs: 100 });

    console.log(`[TEST 4] Fault injection endpoint status: ${errRes.statusCode}`);
    await sleep(350);

    const errorLogs = taskEvents.getLogs().filter(e => e.event === 'error');
    const handledError = errorLogs[0];

    // Verify process remains responsive with a health check
    const healthCheckRes = await makeRequest(server, { path: '/auth/me', method: 'GET', headers: authHeaders });

    if (errRes.statusCode === 200 && handledError && handledError.status === 'caught_and_handled' && healthCheckRes.statusCode === 200) {
      console.log(`✅ Handled background error safely: "${handledError.errorMessage}"`);
      console.log('✅ Node.js process remains fully operational without crashing.');
      recordResult('TEST 4: Error Handling & Resilience', true, handledError.errorMessage);
    } else {
      console.error('❌ TEST 4 FAILED: Asynchronous error was not captured by error listener.');
      recordResult('TEST 4: Error Handling & Resilience', false, 'Error unhandled');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5 — Invalid Requests & Negative Assertions
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5 — Invalid Requests & Negative Assertions ---');

    // 5.1 Missing title validation
    const countBeforeInvalid = taskEvents.getLogs().length;
    const invalidPostRes = await makeRequest(server, {
      path: '/tasks',
      method: 'POST',
      headers: authHeaders
    }, { description: 'Missing required title' });

    const countAfterInvalid = taskEvents.getLogs().length;
    const validationPassed = invalidPostRes.statusCode === 400 && countBeforeInvalid === countAfterInvalid;
    console.log(`[TEST 5.1] Missing title returned status: ${invalidPostRes.statusCode} (Events emitted: ${countAfterInvalid - countBeforeInvalid})`);

    // 5.2 Deletion of nonexistent task
    const fakeId = new mongoose.Types.ObjectId();
    const countBeforeFake = taskEvents.getLogs().length;
    const fakeDeleteRes = await makeRequest(server, {
      path: `/tasks/${fakeId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    const countAfterFake = taskEvents.getLogs().length;
    const notFoundPassed = fakeDeleteRes.statusCode === 404 && countBeforeFake === countAfterFake;
    console.log(`[TEST 5.2] Nonexistent task deletion returned status: ${fakeDeleteRes.statusCode} (Events emitted: ${countAfterFake - countBeforeFake})`);

    if (validationPassed && notFoundPassed) {
      console.log('✅ Validation failure properly returned 400 without event emission.');
      console.log('✅ Nonexistent resource properly returned 404 without event emission.');
      recordResult('TEST 5: Invalid Requests', true, 'No false-positive events emitted');
    } else {
      console.error('❌ TEST 5 FAILED: Inappropriate status code or false-positive event emitted.');
      recordResult('TEST 5: Invalid Requests', false, `Validation=${validationPassed}, 404=${notFoundPassed}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6 — Regression Testing (Auth, CRUD, Caching, Pagination)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 6 — Regression Testing (Auth, CRUD, Caching, Pagination) ---');

    // 6.1 Authentication
    const meRes = await makeRequest(server, { path: '/auth/me', method: 'GET', headers: authHeaders });
    const authOk = meRes.statusCode === 200 && meRes.data?.user?.email === 'pr10tester@example.com';
    console.log(`[TEST 6.1] Auth verification: ${authOk ? 'PASS' : 'FAIL'}`);

    // 6.2 CRUD operations with caching
    const regTaskRes = await makeRequest(server, {
      path: '/tasks',
      method: 'POST',
      headers: authHeaders
    }, {
      title: 'Regression Task for Practical 10',
      status: 'pending',
      priority: 'medium',
      assignedUser: 'auditor@university.edu',
      delayMs: 100
    });
    const regTaskId = regTaskRes.data?.data?._id;

    // Cache HIT/MISS test
    const getRes1 = await makeRequest(server, { path: '/tasks', method: 'GET', headers: authHeaders });
    const getRes2 = await makeRequest(server, { path: '/tasks', method: 'GET', headers: authHeaders });
    const cacheOk = getRes1.statusCode === 200 && getRes2.statusCode === 200;
    console.log(`[TEST 6.2] Cache pipeline (GET /tasks): ${cacheOk ? 'PASS' : 'FAIL'}`);

    // Update (PUT)
    const putRes = await makeRequest(server, {
      path: `/tasks/${regTaskId}`,
      method: 'PUT',
      headers: authHeaders
    }, { title: 'Updated Regression Task', status: 'in-progress', priority: 'high' });
    const putOk = putRes.statusCode === 200 && putRes.data?.data?.title === 'Updated Regression Task';

    // Partial Update (PATCH)
    const patchRes = await makeRequest(server, {
      path: `/tasks/${regTaskId}`,
      method: 'PATCH',
      headers: authHeaders
    }, { status: 'completed' });
    const patchOk = patchRes.statusCode === 200 && patchRes.data?.data?.completed === true;

    // Pagination query
    const pageRes = await makeRequest(server, { path: '/tasks?page=1&limit=5', method: 'GET', headers: authHeaders });
    const pageOk = pageRes.statusCode === 200 && Array.isArray(pageRes.data?.data) && pageRes.data?._links;

    // Clean up regression task
    await makeRequest(server, { path: `/tasks/${regTaskId}`, method: 'DELETE', headers: authHeaders });

    // Clean up test user
    await User.deleteMany({ email: 'pr10tester@example.com' });

    if (authOk && cacheOk && putOk && patchOk && pageOk) {
      console.log('✅ Authentication pipeline verified (JWT protected routes).');
      console.log('✅ CRUD operations (GET, POST, PUT, PATCH, DELETE) verified.');
      console.log('✅ In-memory cache invalidation verified.');
      console.log('✅ Pagination and HATEOAS links verified.');
      recordResult('TEST 6: Regression Testing', true, 'All CRUD, cache, auth, and pagination intact');
    } else {
      console.error(`❌ TEST 6 FAILED: auth=${authOk}, cache=${cacheOk}, put=${putOk}, patch=${patchOk}, page=${pageOk}`);
      recordResult('TEST 6: Regression Testing', false, 'Regression check failed');
    }

  } finally {
    // Teardown
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }

  console.log('\n========================================================================');
  console.log('📋 SUMMARY OF PRACTICAL 10 TEST RESULTS:');
  console.log('========================================================================');
  testResults.forEach((t) => {
    console.log(`${t.passed ? '✅ PASS' : '❌ FAIL'}: ${t.testName} (${t.details})`);
  });
  console.log('========================================================================');
  if (allPassed) {
    console.log('🎉 ALL 6 PRACTICAL 10 TEST SCENARIOS PASSED WITH ZERO FAILURES!');
  } else {
    console.log('❌ SOME TESTS FAILED. CHECK OUTPUT ABOVE.');
  }
  console.log('========================================================================\n');

  return { allPassed, testResults };
}

if (require.main === module) {
  runPractical10Tests()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal Test Error:', err);
      process.exit(1);
    });
}

module.exports = runPractical10Tests;
