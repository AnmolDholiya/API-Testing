# StudentHub & Task Management System

[![CI Pipeline](https://github.com/AnmolDholiya/API-Testing/actions/workflows/ci.yml/badge.svg)](https://github.com/AnmolDholiya/API-Testing/actions/workflows/ci.yml)

**Course**: Advanced Web Development Frameworks (ITUE301)  
**Repository**: [AnmolDholiya/API-Testing](https://github.com/AnmolDholiya/API-Testing)  
**CI/CD Status**: Automated GitHub Actions Workflow on `main` branch push  

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

---

# Practical 11: Containerization with Docker and Docker Compose

**Course**: Advanced Web Development Frameworks (ITUE301)  
**CO/PO Mapping**: CO1, CO2, CO4 / PO3, PO5  

---

## 1. 🎯 Objective

To containerize the full-stack StudentHub Task Management application into multi-container microservices using **Docker** and **Docker Compose**, providing reproducible, isolated, and production-ready environments for:
- **Frontend SPA**: React 19 + Vite 8 compiled into high-performance static assets and served by an Nginx web server.
- **Backend API**: Node.js 20 (Express) REST API with JWT authentication, in-memory caching, and native event-driven asynchronous processing.
- **Database**: MongoDB 7.0 database engine with persistent data storage via a named Docker volume.
- **Internal Networking**: Isolated bridge network (`app-network`) enabling inter-service DNS resolution without hardcoded IP addresses or `localhost` dependencies.

---

## 2. 🧰 Technologies Used

- **Docker**: Engine version 29+ (Open-source container virtualization platform)
- **Docker Compose**: Compose v2/v5 (Multi-container orchestration)
- **Frontend**: React 19, Vite 8, React Router v7, Nginx Alpine
- **Backend**: Node.js 20 Alpine, Express 4, Mongoose 9, native `events` (EventEmitter), `node-cache`
- **Database**: Official MongoDB 7.0 Community Edition image (`mongo:7.0`)
- **Networking & Storage**: Docker bridge network (`app-network`) and named volume (`mongodb_data`)

---

## 3. 🏗️ Project Architecture & Service Topology

```text
                               Host Browser / Postman
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼ (Port 5173)                               ▼ (Port 5000)
    ┌───────────────────────────────┐           ┌───────────────────────────────┐
    │       frontend container      │           │       backend container       │
    │        (nginx:alpine)         │           │      (node:20-alpine)         │
    │                               │           │                               │
    │  - Serves React + Vite bundle │           │  - Express REST API           │
    │  - Handles SPA client routing │           │  - JWT Auth + Validation      │
    │  - Reverse proxies:           │           │  - EventEmitter (Async logs)  │
    │    /tasks ──────┐             │           │  - /health endpoint           │
    │    /auth  ──────┼─────────────┼──────────►│                               │
    │    /health ─────┘             │           │  MONGO_URI:                   │
    └───────────────────────────────┘           │  mongodb://mongodb:27017/     │
                   ▲                            └───────────────┬───────────────┘
                   │                                            │
                   │           app-network (Bridge)             ▼
                   │                               ┌─────────────────────────────┐
                   │                               │      mongodb container      │
                   │                               │        (mongo:7.0)          │
                   │                               │                             │
                   └───────────────────────────────┤  - Port: 27017              │
                                                   │  - Healthcheck (mongosh)    │
                                                   └──────────────┬──────────────┘
                                                                  │
                                                        Mounted at /data/db
                                                                  ▼
                                                   ┌─────────────────────────────┐
                                                   │    mongodb_data (Volume)    │
                                                   │   (Persistent Host Disk)    │
                                                   └─────────────────────────────┘
```

---

## 4. 📦 Explanation of Containers

### A. Frontend Container (`frontend`)
- **Base Images**: Multi-stage build using `node:20-alpine` (builder) and `nginx:alpine` (production runtime).
- **Stage 1 (Builder)**: Installs dependencies using `npm ci` and runs `npm run build` to generate an optimized, minified production bundle in `dist/`.
- **Stage 2 (Runtime)**: Minimal Nginx image copying compiled assets into `/usr/share/nginx/html`.
- **Nginx Configuration (`client/nginx.conf`)**:
  - Directs all client-side navigation (`/projects`, `/analytics`, `/contact`) to `index.html` via `try_files $uri $uri/ /index.html;`, avoiding 404 errors on browser page reloads.
  - Acts as an API reverse proxy forwarding `/tasks`, `/auth`, and `/health` directly to `http://backend:5000`, eliminating Cross-Origin Resource Sharing (CORS) friction.
- **Port**: Exposed on container `5173`, published to host `5173:5173`.

### B. Backend Container (`backend`)
- **Base Image**: Official `node:20-alpine`.
- **Optimization**: Copies `package.json` and `package-lock.json` before source code, executing `npm ci --omit=dev` to cache production dependencies.
- **Connection**: Uses `mongodb://mongodb:27017/taskdb` to communicate with the database container via Docker's internal DNS.
- **Startup Order**: Uses `depends_on` with `condition: service_healthy` to guarantee that Node.js starts only after MongoDB has initialized and passed its ping check.
- **Port**: Exposed on container `5000`, published to host `5000:5000`.

### C. Database Container (`mongodb`)
- **Base Image**: Official `mongo:7.0`.
- **Storage**: Maps named Docker volume `mongodb_data` to `/data/db`.
- **Health Check**: Executes `mongosh --eval "db.adminCommand('ping')"` every 10 seconds to verify database responsiveness before downstream services connect.
- **Port**: Published to host `27017:27017` for development GUI inspection (Compass/mongosh).

---

## 5. 🌐 Docker Network and Named Volume Configuration

### Bridge Network (`app-network`)
```yaml
networks:
  app-network:
    name: app-network
    driver: bridge
```
All three containers share `app-network`. Services resolve each other by container service name:
- Backend connects to `mongodb:27017`.
- Frontend Nginx proxy connects to `backend:5000`.

### Persistent Volume (`mongodb_data`)
```yaml
volumes:
  mongodb_data:
    name: mongodb_data
```
The named volume preserves database state on the host file system. Even if containers are stopped or recreated (`docker compose down` followed by `docker compose up`), all tasks, users, and credentials remain intact.

---

## 6. ⚙️ Prerequisites

Before running the containerized application, ensure you have:
1. **Docker Desktop** installed and running (Windows / macOS / Linux).
2. **Docker Compose v2+** (`docker compose version`).
3. Port availability for `5173`, `5000`, and `27017`.

---

## 7. 🚀 Installation & Setup Instructions

### Step 1: Clone Repository
```bash
git clone https://github.com/AnmolDholiya/API-Testing.git
cd API-Testing
```

### Step 2: Configure Environment Variables
Create a `.env` file from the provided example:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

---

## 8. 🔑 Environment Variable Configuration

The default `.env` file includes:

```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb://mongodb:27017/taskdb
JWT_SECRET=adwf_jwt_secret_key_practical_7_2026
JWT_EXPIRES_IN=1h
```

---

## 9. 🛠️ Commands to Build and Start Containers

### Build and Start in Foreground (Interactive Logs)
```bash
docker compose up --build
```

### Build and Start in Detached Mode (Background)
```bash
docker compose up --build -d
```

### Or using npm convenience scripts
```bash
npm run docker:build
npm run docker:up
```

---

## 10. 🔍 Commands to Inspect Containers and Logs

### Check Running Containers
```bash
docker compose ps
# or
docker ps
```

### View Combined Logs
```bash
docker compose logs
```

### Follow Specific Service Logs
```bash
# Follow backend logs
docker compose logs -f backend

# Follow frontend logs
docker compose logs -f frontend

# Follow MongoDB logs
docker compose logs -f mongodb
```

### Validate Docker Compose Configuration
```bash
docker compose config
```

---

## 11. 🌐 Application URLs & Endpoints

| Service / Interface | Local URL | Description |
| :--- | :--- | :--- |
| **Frontend Application** | `http://localhost:5173` | React 19 + Vite Kanban board and analytics dashboard |
| **Backend Health Check** | `http://localhost:5000/health` | Service and database connectivity status check |
| **Backend Interactive Dashboard** | `http://localhost:5000` | Static Express dashboard testing Practical 10 events |
| **User Authentication** | `POST http://localhost:5000/auth/login` | JWT login endpoint |
| **Task CRUD & Async Events** | `http://localhost:5000/tasks` | Task creation (201 Created), list, and deletion |
| **Event Audit Metrics** | `GET http://localhost:5000/tasks/debug/events` | Practical 10 in-memory event audit log |
| **Cache Debug Metrics** | `GET http://localhost:5000/tasks/debug/cache` | Practical 9 in-memory cache hits/misses |
| **MongoDB Direct Port** | `localhost:27017` | Direct database connection for MongoDB Compass |

---

## 12. 🛑 Instructions for Stopping the Application

### Stop Containers (Preserves Database Data)
```bash
docker compose down
```
> [!IMPORTANT]
> Running `docker compose down` gracefully stops and removes the containers while **preserving** the `mongodb_data` volume and all your stored tasks and users.

### Stop and Wipe Database Data (Caution!)
```bash
# ONLY use when you intentionally want to wipe all stored database data:
docker compose down -v
```

---

## 13. 💾 Database Persistence Explanation

In Docker, container file systems are **ephemeral**—any file written directly inside a container's writable layer is lost when the container is deleted.

To prevent data loss:
1. Docker Compose declares a named volume: `mongodb_data`.
2. The volume is mounted to MongoDB's internal data directory: `/data/db`.
3. When MongoDB writes BSON documents and WiredTiger storage files, they are written directly to host storage managed by the Docker engine.
4. When you execute `docker compose down` and later `docker compose up -d`, the new MongoDB container re-attaches to `mongodb_data`, immediately restoring all previous tasks, users, and audit records.

---

## 14. 🔧 Common Troubleshooting Steps

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Port Conflict (`bind: address already in use`)** | Local MongoDB or Node server is running on port 27017, 5000, or 5173 on the host machine. | Stop local services before launching Docker: `net stop MongoDB` or terminate running `node server.js` processes. |
| **Backend Fails to Connect to MongoDB** | Backend started before MongoDB finished initializing. | Ensure `depends_on` specifies `condition: service_healthy` in `docker-compose.yml`. |
| **React Router 404 on Page Refresh** | Web server trying to find physical file matching client route. | Nginx must include `try_files $uri $uri/ /index.html;` in `nginx.conf`. |
| **Frontend Cannot Reach API** | Frontend container attempting to reach `localhost:5000` inside its own container network. | Use the Nginx reverse proxy configuration (`proxy_pass http://backend:5000;`) so browser requests are forwarded over Docker's internal `app-network`. |
| **Docker Desktop Daemon Not Running** | Docker Desktop engine is stopped on Windows. | Launch Docker Desktop from the Start menu and wait for the status bar icon to show "Engine Running". |

---

# Practical 12: CI/CD Pipeline with GitHub Actions

**Course**: Advanced Web Development Frameworks (ITUE301)  
**Status**: Automated Continuous Integration (CI) Pipeline  
**Badge**: [![CI Pipeline](https://github.com/AnmolDholiya/API-Testing/actions/workflows/ci.yml/badge.svg)](https://github.com/AnmolDholiya/API-Testing/actions/workflows/ci.yml)

---

## 1. 🎯 Objective

To implement an automated **Continuous Integration (CI)** pipeline using **GitHub Actions** that:
1. Triggers automatically on every code push to the `main` branch (and supports manual triggers via `workflow_dispatch`).
2. Provisions an isolated Ubuntu virtual machine environment (`ubuntu-latest`).
3. Sets up Node.js runtime environment (version 20).
4. Installs project dependencies deterministically via `npm install`.
5. Executes automated backend integration tests using **Jest** and **Supertest**.
6. Demonstrates a controlled pipeline failure on incorrect assertions (Red X) followed by a passing pipeline upon correction (Green Checkmark).

---

## 2. 🏗️ CI Pipeline Architecture

```text
[ Developer Machine ]
        │
        │ git push origin main
        ▼
[ GitHub Repository: AnmolDholiya/API-Testing ]
        │
        ▼ (.github/workflows/ci.yml triggers)
┌──────────────────────────────────────────────────────────┐
│ GitHub Actions Runner: ubuntu-latest                     │
│                                                          │
│  Step 1: actions/checkout@v4                             │
│          └── Fetches repository source code              │
│                                                          │
│  Step 2: actions/setup-node@v4                           │
│          └── Installs Node.js 20.x & npm                 │
│                                                          │
│  Step 3: npm install                                     │
│          └── Installs runtime & dev dependencies         │
│                                                          │
│  Step 4: npm test                                        │
│          └── Runs Jest + Supertest (tests/api.test.js)   │
│              - GET /health                               │
│              - GET /tasks (401 without JWT)              │
│              - GET /tasks (200 with JWT)                 │
│              - POST /tasks (201 Created)                 │
│              - POST /tasks (400 validation error)        │
│              - GET /tasks/:id (404 not found)            │
└──────────────────────────┬───────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      ❌ Non-Zero Exit Code         ✅ Exit Code 0
      Pipeline FAILED (Red X)       Pipeline PASSED (Green Check)
```

---

## 3. ⚙️ GitHub Actions Workflow Configuration

Workflow file location: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

```yaml
name: CI Pipeline

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-and-test:
    name: Install Dependencies and Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Run automated tests
        run: npm test
```

---

## 4. 🧪 Test Suite Specifications (`tests/api.test.js`)

The test suite tests the backend Express application using **Supertest** without requiring manual server startup (because `server.js` guards `app.listen` with `require.main === module` and exports `app` directly).

| Test # | Endpoint & Scenario | Method | Expected Status | Assertion Focus |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Public Health Check | `GET /health` | `200 OK` | `{ status: "ok", service: "task-manager-backend", timestamp }` |
| **2** | Unauthenticated Task Retrieval | `GET /tasks` | `401 Unauthorized` | Rejection guard when `Authorization: Bearer <token>` is omitted |
| **3** | Authenticated Task Retrieval | `GET /tasks` | `200 OK` | Verifies task array and HATEOAS navigational links |
| **4** | Valid Task Creation | `POST /tasks` | `201 Created` | Verifies new task creation, ID assignment, and event trigger |
| **5** | Missing Required Title | `POST /tasks` | `400 Bad Request` | Verifies schema validation rejection |
| **6** | Non-existent Task Query | `GET /tasks/:id` | `404 Not Found` | Verifies graceful 404 response for absent ObjectIds |

> [!NOTE]
> The test runner connects to the local MongoDB if available, or automatically falls back to an isolated in-memory MongoDB instance (`mongodb-memory-server`) in cloud CI runners, ensuring zero dependency on host-specific credentials or external databases.

---

## 5. 🔬 How to Run Tests Locally

Execute the test suite in the backend root directory:

```bash
# Run Jest automated test suite
npm test

# Run tests with coverage report
npm test -- --coverage
```

---

## 6. 🚨 Controlled Failure & Pass Demonstration Procedure

Practical 12 explicitly requires demonstrating a failed pipeline followed by a successful one.

### Step A: Introduce Deliberate Failure
In [`tests/api.test.js`](tests/api.test.js), line 82:
```javascript
// Change from 200 to 500:
expect(res.statusCode).toBe(500); // Deliberate failure demonstration
```

Run locally to confirm non-zero exit code:
```bash
npm test
```
Result: Jest fails with exit code `1` (`Expected: 500, Received: 200`).

### Step B: Push Deliberate Failure to GitHub
```bash
git add tests/api.test.js
git commit -m "test: demonstrate deliberate CI pipeline assertion failure"
git push origin main
```
Result in GitHub Actions:
- Workflow run status: **Failed ❌**
- Test step shows red mark with stack trace identifying `tests/api.test.js:82`.

### Step C: Restore Correct Assertion
In [`tests/api.test.js`](tests/api.test.js), restore line 82:
```javascript
expect(res.statusCode).toBe(200);
```

Verify locally:
```bash
npm test
```
Result: `Test Suites: 1 passed, 1 total; Tests: 6 passed, 6 total`.

### Step D: Push Correction to GitHub
```bash
git add tests/api.test.js
git commit -m "fix: restore expected 200 status code in health check test"
git push origin main
```
Result in GitHub Actions:
- Workflow run status: **Passed ✅**
- README badge reflects passing green status.

---

## 7. 💡 Continuous Integration (CI) vs Continuous Deployment (CD)

- **Continuous Integration (CI)**: The automated practice of frequently merging code changes into a central repository, followed by automated dependency installation, linting, and automated test execution. CI validates that changes do not break existing functionality before integration.
- **Continuous Deployment (CD)**: The automated process where every change that passes the CI pipeline is automatically packaged (e.g., Docker image built and pushed to a registry) and deployed directly to production infrastructure without human intervention.
- **This Practical's Scope**: Focuses strictly on **CI** (automated integration testing and workflow status validation), providing the foundation upon which CD stages can safely be added.



