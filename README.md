# Practical 8: Performance Optimization and Lazy Loading in React

**Course**: Advanced Web Development Frameworks (ITUE301)  
**CO/PO Mapping**: CO1, CO2 / PO3, PO5  
**Pass Threshold**: 5 / 10 Marks (Rubric: Concepts 2M, Implementation 4M, Correctness 2M, Reflection 1M, Evidence 1M)

---

## 🎯 Objective

To improve frontend application performance using **route-based code splitting**, dynamic imports with `React.lazy()` and `<Suspense>`, **structural skeleton fallbacks**, and isolated third-party library chunking (**Chart.js**), measuring before/after bundle sizes and load times with browser developer tools.

---

## 🏗️ Architecture & Code-Splitting Data Flow

```text
BEFORE (Monolithic single bundle loaded upfront):
main.bundle.js ──────────────► [Home / Tasks][Projects][Contact][Chart.js (~180 KB)] all loaded upfront

AFTER (Route-Based Code Splitting with Suspense):
main.bundle.js ────────► Loaded on initial visit (/)
Projects.chunk.js ─────► Loaded ONLY when /projects is visited
Contact.chunk.js ──────► Loaded ONLY when /contact is visited
vendor-charts.chunk.js ─► Loaded ONLY when /analytics is visited
```

---

## 🚀 Key Features Implemented (Practical 8)

1. **Route-Based Code Splitting (`react-router-dom` + `React.lazy`)**:
   - `/`: Core Kanban Board and Task Stream
   - `/projects`: Sprints, milestones, and project workload tracking (Lazy Loaded)
   - `/analytics`: Task metrics and productivity analytics (Lazy Loaded)
   - `/contact`: Technical feedback and engineering support form (Lazy Loaded)
2. **Structural Skeleton Fallback UI (`PageSkeletonFallback.jsx`)**:
   - Shimmer glassmorphic placeholder preventing layout shifts (Cumulative Layout Shift = 0) while chunks download.
3. **Anti-Flicker Minimum Delay (`lazyWithDelay.js`)**:
   - Guaranteed minimum 300 ms duration for loading transitions on fast networks to prevent distracting spinner flashes.
4. **Heavy Third-Party Component Splitting (Chart.js & `react-chartjs-2`)**:
   - The ~180 KB canvas charting engine is completely isolated into `vendor-charts-*.js` and never downloaded by users who stay on the main task board.
5. **React DevTools Profiler Optimization (`React.memo`)**:
   - Custom shallow equality comparator in `TaskCard.jsx` eliminates unnecessary re-renders when parent states change.
6. **Smart Hover & Idle Preloading**:
   - Route chunks prefetch on navigation tab hover (`onMouseEnter`) and during browser idle periods (`requestIdleCallback`).

---

## 📊 Bundle Size Metrics (Vite Build)

Run the production build:
```bash
npm run build --prefix client
```

### Build Chunk Breakdown:
| Chunk | Size | Gzip Size | Trigger / Load Condition |
| :--- | :--- | :--- | :--- |
| `vendor-charts-*.js` | **179.33 kB** | 61.92 kB | **On-demand**: only when `/analytics` is opened |
| `vendor-react-*.js` | **181.75 kB** | 57.16 kB | Critical runtime on first visit |
| `vendor-router-*.js` | **39.16 kB** | 14.09 kB | Critical routing runtime |
| `index-*.js` (App Shell) | **36.62 kB** | 9.74 kB | Main application shell |
| `vendor-icons-*.js` | **13.13 kB** | 4.79 kB | Lucide icon glyphs |
| `Projects-*.js` | **8.36 kB** | 2.19 kB | **On-demand**: only when `/projects` is visited |
| `Contact-*.js` | **8.31 kB** | 2.47 kB | **On-demand**: only when `/contact` is visited |
| `Analytics-*.js` | **4.84 kB** | 1.76 kB | **On-demand**: only when `/analytics` is visited |

---

## 🛠️ How to Run Locally

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Frontend client dependencies
cd client
npm install
cd ..
```

### 2. Start Application
```bash
npm run dev
```
- **React Frontend**: `http://localhost:5173` (or `5174`)
- **Express Backend**: `http://localhost:5000`

### 3. Run Automated Tests
```bash
npm test
```

---

## 🧪 Browser DevTools Verification Guide

1. Open DevTools (**F12**) and navigate to the **Network** tab.
2. Set filter to **JS**.
3. Reload `http://localhost:5173/`: Note that `Projects`, `Contact`, and `vendor-charts` are **not** present in the network waterfall.
4. Click **Projects**: Observe `Projects-*.js` load in the network waterfall.
5. Click **Analytics**: Observe `vendor-charts-*.js` (179 kB) load on demand.
6. Set Network Throttling to **Slow 3G**: Navigate between tabs to view the shimmer skeleton fallback UI in action.

---

## 📄 Lab Report
For the complete report, theoretical analysis, and viva responses, refer to:
- [LAB_REPORT.md](file:///d:/5TH%20SEM/ADWF/PRACTICAL/PR8/API-Testing/LAB_REPORT.md)

---

# Practical 9 — In-Memory Caching and Query Optimization

## 1. Objective
To implement server-side in-memory caching using `node-cache` in the Task Management Express + MongoDB REST API, optimize read latency for frequent database queries, enforce automatic cache invalidation on write mutations, and measure API response times before and after caching.

## 2. Technology Used
- **Runtime & Framework**: Node.js & Express.js (CommonJS)
- **Database**: MongoDB with Mongoose ODM
- **Caching Engine**: `node-cache` (Process-local in-memory key-value store)
- **Authentication**: JSON Web Token (JWT) Bearer Authentication via `authMiddleware`

## 3. Cache Implementation
A shared singleton cache instance is configured in `src/utils/cache.js`:
```javascript
const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 60,       // Default TTL: 60 seconds
  checkperiod: 120  // Automatic sweep period: 120 seconds
});

module.exports = cache;
```

## 4. Cache TTL
- **Default TTL (`stdTTL`)**: `60` seconds. Cached records automatically expire after 60 seconds unless renewed or invalidated.
- **Check Period (`checkperiod`)**: `120` seconds. Background timer automatically cleans up expired keys from process memory.

## 5. Cache Key for All Tasks
- **Key**: `"all_tasks"`
- **Endpoint**: `GET /tasks` (when called without query filters)
- **Behavior**: On first request (MISS), queries MongoDB, stores formatted response payload with HATEOAS links in `"all_tasks"`. Subsequent requests (HIT) serve directly from memory without executing `Task.find()`.

## 6. Cache Key for Individual Task
- **Prefix**: `"task_"`
- **Pattern**: `task_<TASK_ID>` (e.g., `task_670a12b3c4d5e6f789012345`)
- **Endpoint**: `GET /tasks/:id`
- **Behavior**: On first request (MISS), queries `Task.findById(id)`. If found, stores payload in cache. If not found, returns `404 Not Found` without polluting the cache.

## 7. Cache Invalidation Strategy
To guarantee data consistency between RAM and MongoDB:
- **POST `/tasks`**: After `newTask.save()` completes successfully, invalidates:
  - `cache.del("all_tasks")`
- **PUT `/tasks/:id` & PATCH `/tasks/:id`**: After `findByIdAndUpdate()` succeeds, invalidates:
  - `cache.del("all_tasks")`
  - `cache.del("task_" + req.params.id)`
- **DELETE `/tasks/:id`**: After `findByIdAndDelete()` succeeds, invalidates:
  - `cache.del("all_tasks")`
  - `cache.del("task_" + req.params.id)`
- **Failure Safety**: If a database write operation fails or validation rejects the payload, invalidation is bypassed, preserving existing valid cache.

## 8. HIT/MISS Behavior & Console Logging
Every cacheable request logs its outcome and increments internal metric counters:
- `CACHE HIT: all_tasks`
- `CACHE MISS: all_tasks`
- `CACHE HIT: task_<id>`
- `CACHE MISS: task_<id>`
- `CACHE INVALIDATED: all_tasks`
- `CACHE INVALIDATED: task_<id>`

## 9. Debug Endpoint
- **Endpoint**: `GET /tasks/debug/cache`
- **Authentication**: Protected via Bearer JWT (`authMiddleware`)
- **Route Placement**: Placed **before** `GET /tasks/:id` in `taskRoutes.js` to prevent Express route matching from treating `"debug"` as a MongoDB ObjectId.
- **Response Format**:
```json
{
  "success": true,
  "cacheHits": 12,
  "cacheMisses": 4,
  "keys": ["all_tasks", "task_65f000000000000000000001"],
  "stats": {
    "hits": 12,
    "misses": 4,
    "keys": 2,
    "ksize": 34,
    "vsize": 1820
  }
}
```

## 10. How to Test Using Postman
1. **Set Bearer Token**: Obtain JWT via `POST /auth/login` and set `Authorization: Bearer <token>`.
2. **First Request**: Send `GET http://localhost:5000/tasks`.
   - Server logs: `CACHE MISS: all_tasks`
   - Response time represents a cold fetch querying MongoDB.
3. **Second Request**: Send `GET http://localhost:5000/tasks` again immediately.
   - Server logs: `CACHE HIT: all_tasks`
   - Response time drops significantly as data is served from RAM.
4. **Create Task**: Send `POST http://localhost:5000/tasks` with task JSON body.
   - Server logs: `CACHE INVALIDATED: all_tasks`
5. **Third Request**: Send `GET http://localhost:5000/tasks`.
   - Server logs: `CACHE MISS: all_tasks`
   - Shows newly created task immediately.
6. **Check Metrics**: Send `GET http://localhost:5000/tasks/debug/cache` to view total hits, misses, and active keys.

## 11. Response-Time Comparison Table

| Condition | Request 1 | Request 2 | Request 3 | Average |
| :--- | :---:| :---:| :---:| :---:|
| **Without Cache (Cold / MISS)** | *To be measured* | *To be measured* | *To be measured* | *To be measured* |
| **With Cache (RAM / HIT)** | *To be measured* | *To be measured* | *To be measured* | *To be measured* |

*(Note: Response times are to be measured directly in Postman by observing the time metric on the response panel).*

## 12. Architectural Discussion & Limitations

### Why Cache Invalidation is Required
Without proactive cache invalidation, write operations (`POST`, `PUT`, `PATCH`, `DELETE`) would update MongoDB while subsequent client read queries would continue receiving stale, outdated responses from RAM until the 60-second TTL expires. Invalidating the cache immediately upon successful database mutations ensures **read-after-write consistency** across the system.

### Why node-cache is Process-Local
`node-cache` stores key-value pairs directly in the Node.js V8 heap memory of the specific process running the server. 
- In a production environment with **horizontal scaling** (e.g., multiple instances behind an NGINX load balancer, Kubernetes pods, or PM2 cluster mode), each process maintains its own isolated memory space.
- A write mutation hitting Instance A would only invalidate Instance A's local cache, leaving Instance B and Instance C serving stale data to other users.
- For distributed multi-server deployments, a centralized distributed in-memory cache such as **Redis** or **Memcached** is required so all server instances share a single source of cached truth.

---

# Practical 10: Asynchronous Processing with Event-Driven Architecture

**Course**: Advanced Web Development Frameworks (ITUE301)  
**CO/PO Mapping**: CO1, CO2, CO4 / PO3, PO5  

---

## 1. 🎯 Objective

To decouple long-running background tasks (e.g., email alerts, audit logs, notifications) from the client-facing HTTP request-response pipeline using Node.js's native `EventEmitter` module, proving that the HTTP response returns immediately (HTTP 201 Created) while background processing executes asynchronously without blocking the Node.js event loop.

---

## 2. 🏗️ Architecture & Event Flow

```text
Client (Postman / Browser)
   │
   │ 1. POST /tasks (JSON payload)
   ▼
Express Route Handler (/tasks)
   │
   ├─► 2. Validate request (validateTask middleware)
   ├─► 3. Save task document to MongoDB (await Task.save())
   ├─► 4. Invalidate in-memory cache (cache.del('all_tasks'))
   │
   ├─► 5. Dispatch HTTP 201 Response IMMEDIATELY ──► Client receives response (<30ms)
   │
   └─► 6. Schedule Event on Event Loop (setImmediate)
         │
         ▼
   Native EventEmitter (TaskEvents)
         │
         ├─► Emits 'task-created' event
         │
         ▼
   Notification Listener (src/listeners.js)
         │
         ├─► Logs: Handler started, Task ID, Task Title, Assigned User
         ├─► Enters non-blocking timer: setTimeout(..., 2000ms)
         │     (Event Loop remains free to handle incoming requests)
         │
         └─► [After 2000ms delay]
               ├─► Logs: Notification completed at timestamp
               └─► Writes record to in-memory audit log
```

---

## 3. 📂 Files Modified / Created

| File | Purpose |
| :--- | :--- |
| `src/events.js` | Dedicated module extending native Node.js `EventEmitter` and exporting a shared singleton instance. |
| `src/listeners.js` | Dedicated listeners module registering `task-created`, `task-deleted`, and `error` handlers before server startup. |
| `src/routes/taskRoutes.js` | POST `/tasks` and DELETE `/tasks/:id` endpoints updated with `setImmediate()` asynchronous event dispatch. |
| `src/models/Task.js` | Schema includes `assignedUser` field utilized by event handlers. |
| `server.js` | Imports `src/listeners.js` during server initialization before routes are mounted. |
| `public/index.html` | Interactive frontend testing dashboard displaying real-time decoupled API vs background listener execution. |
| `test-practical10.js` | Automated verification suite testing all 6 required scenarios using `performance.now()`. |

---

## 4. ⚙️ EventEmitter Implementation

The shared `EventEmitter` is implemented in `src/events.js`:

```javascript
const EventEmitter = require('events');

class TaskEvents extends EventEmitter {
  constructor() {
    super();
    this.eventLogs = [];
  }

  recordLog(entry) {
    this.eventLogs.unshift({ ...entry, loggedAt: new Date().toISOString() });
    if (this.eventLogs.length > 100) this.eventLogs.pop();
  }

  getLogs() {
    return this.eventLogs;
  }

  clearLogs() {
    this.eventLogs = [];
  }
}

module.exports = new TaskEvents();
```

---

## 5. 🗄️ How to Start MongoDB

Start your local MongoDB service:

```bash
# Windows Service
net start MongoDB

# Or via mongod binary
mongod --dbpath "C:\data\db"
```

*(Note: The test suite includes an automatic fallback to `mongodb-memory-server` if local MongoDB is not running).*

---

## 6. 🔐 How to Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/taskdb
JWT_SECRET=adwf_jwt_secret_key_practical_7_2026
JWT_EXPIRES_IN=1h
```

---

## 7. 🚀 How to Start the Server

```bash
# Run backend only
npm run server

# Or run full-stack (Backend + Frontend)
npm run dev
```

---

## 8. 🧪 How to Execute the Tests

```bash
# Run Practical 10 automated test suite
npm run test:pr10

# Run default test suite
npm test

# Run Practical 9 regression test suite
npm run test:pr9
```

---

## 9. 📡 How to Test POST /tasks and DELETE /tasks/:id

### A. POST /tasks (Task Creation + Async Notification)
- **URL**: `http://localhost:5000/tasks`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Body**:
```json
{
  "title": "College Submission Event Task",
  "description": "Demonstrating Practical 10 event decoupling",
  "priority": "high",
  "status": "pending",
  "assignedUser": "engineer@university.edu",
  "delayMs": 2000
}
```
- **Observed Behavior**:
  - Response status `201 Created` returns in **< 30 ms**.
  - Server terminal logs notification starting immediately.
  - Server terminal logs notification completion **2 seconds later**.

### B. DELETE /tasks/:id (Task Deletion + Async Cleanup)
- **URL**: `http://localhost:5000/tasks/<TASK_OBJECT_ID>`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Observed Behavior**:
  - Response status `200 OK` returns immediately.
  - `[Task Deleted]` event runs asynchronously in the background.

---

## 10. 📋 Sample Console Output

```text
[API] Task saved successfully.
CACHE INVALIDATED: all_tasks
[API] Response sent at: 2026-10-26T14:45:39.826Z
[Notification] Handler started at: 2026-10-26T14:45:39.828Z
[Notification] Task ID: 6adf67937b616f73d40b6f49
[Notification] Task: College Submission Event Task
[Notification] Task Created At: 2026-10-26T14:45:39.824Z
[Notification] Assigned User: engineer@university.edu
[Notification] Notification completed at: 2026-10-26T14:45:41.842Z
```

---

## 11. ⏱️ Why the HTTP Response Does Not Wait for the Notification

In `src/routes/taskRoutes.js`, the response is finalized and dispatched to the operating system's network socket via `res.status(201).json(...)`. The event dispatching code is enclosed within `setImmediate(() => { ... })`:

```javascript
res.status(201).json({ success: true, data: taskObj, ... });

setImmediate(() => {
  try {
    taskEvents.emit('task-created', eventPayload);
  } catch (emitErr) {
    taskEvents.emit('error', emitErr);
  }
});
```

Because `setImmediate()` defers execution to the **Check phase** of the libuv event loop after the current I/O poll phase, Express finishes flushing the HTTP response buffers to the client before the listener's timer begins. Furthermore, the listener employs `setTimeout(..., 2000)` which registers a timer in libuv's **Timers phase**, completely freeing the JavaScript call stack.

---

## 12. 🔍 Why emit() Itself is Synchronous

A common misconception is that Node.js `EventEmitter` is inherently asynchronous. In truth, `EventEmitter.prototype.emit()` is **completely synchronous**:

When `emit('event-name', data)` is called:
1. Node.js retrieves the internal array of listener functions registered for that event name.
2. It iterates through the array and executes each function **synchronously on the current call stack in the order they were registered**.
3. `emit()` does not return until all listener functions have finished executing their synchronous code.

Therefore, merely placing `emit()` after `res.json()` does **not** decouple execution if the listener contains CPU-bound or synchronous work. True decoupling requires explicitly offloading execution using `setImmediate()`, `process.nextTick()`, or asynchronous primitives like `setTimeout()` / Promises.

---

## 13. ⚠️ Limitations of an In-Memory EventEmitter

While native `EventEmitter` is lightweight, zero-dependency, and ideal for intra-process decoupling, it has distinct architectural limitations in enterprise systems:

1. **Non-Durable (Memory-Only)**: Events live purely in Node.js process RAM. If the server process crashes or restarts while a `setTimeout()` delay is pending, all in-flight events are permanently lost with no recovery mechanism.
2. **Single-Process Scope**: Native events cannot traverse process boundaries. In a multi-instance or clustered environment (e.g., Kubernetes pods, PM2 cluster mode), an event emitted on Pod A is completely invisible to Pod B.
3. **No Backpressure or Concurrency Control**: If 10,000 tasks are created concurrently, 10,000 unthrottled timer callbacks will spawn simultaneously in memory, risking heap exhaustion.
4. **No Retry Mechanism**: If an asynchronous task fails (e.g., an external mail server is down), native `EventEmitter` does not provide built-in retry queues, exponential backoff, or Dead Letter Queues (DLQ).

For mission-critical production systems requiring durability, acknowledgment, and distributed delivery, message brokers such as **RabbitMQ**, **BullMQ / Redis Streams**, or **Apache Kafka** are standard.

---

## 14. 📚 Lab Manual Reflection Questions & Answers

### Q1: What is the difference between synchronous and asynchronous event handling in Node.js?
**Answer:**  
In **synchronous event handling**, when an event is emitted, the event emitter immediately executes every registered listener function one by one on the main JavaScript call stack. The code following `emit()` will not execute until every listener has returned. If a listener performs heavy computation or blocks, the entire application blocks.  
In **asynchronous event handling**, the listener's heavy work or I/O is scheduled onto the event loop using non-blocking primitives (such as `setImmediate()`, `setTimeout()`, or `Promise`/`async-await`). The main thread and caller continue their execution immediately, allowing the client to receive an instant HTTP response while the event listener finishes processing in a subsequent event loop iteration.

### Q2: Why shouldn't heavy computations or long-running tasks be run directly inside synchronous event listeners?
**Answer:**  
Node.js runs user JavaScript code on a **single thread (the event loop)**. If a synchronous listener executes a CPU-heavy loop, file compression, or synchronous I/O, it monopolizes the call stack. While that computation runs, the event loop cannot process incoming HTTP requests, handle database responses, or fire timer callbacks. Every client connected to the application experiences high latency or timeouts. Offloading long-running tasks asynchronously ensures the event loop remains responsive.

### Q3: How does Node.js's event-driven architecture compare to a dedicated message broker (like RabbitMQ or Redis Pub/Sub)?
**Answer:**  
| Feature | Node.js `EventEmitter` | Dedicated Broker (RabbitMQ / BullMQ / Kafka) |
| :--- | :--- | :--- |
| **Scope** | Intra-process (single Node.js process only) | Inter-process & distributed across multi-server clusters |
| **Persistence / Durability** | Volatile (stored in process memory; lost on crash) | Durable (persisted to disk; survives server restarts) |
| **Delivery Guarantees** | At-most-once (no ACK, retry, or DLQ) | At-least-once / Exactly-once with ACKs and Dead Letter Queues |
| **Concurrency / Worker Queuing** | All listeners run in same process memory | Tasks can be load-balanced across worker pools |
| **Dependencies & Overhead**| Zero external dependencies; near-zero latency | Requires running separate service infrastructure |


