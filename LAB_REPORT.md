# Practical 7 Lab Report: Authentication and Middleware Pipeline

**Course**: Advanced Web Development Frameworks (ITUE301)  
**CO/PO Mapping**: CO2, CO6 / PO3, PO5  
**Evaluation Rubric**: 10 Marks Total (Passing: 5/10)

---

## 1. Objective

To implement secure **JWT-based authentication** (JSON Web Tokens), **password hashing using bcrypt**, and **server-side input validation** as part of the Express middleware pipeline for the full-stack Task Management application.

---

## 2. Theoretical Concepts & Architecture

### 2.1 Authentication & Middleware Pipeline Architecture
```text
                          ┌─────────────────────────────┐
                          │   Client (React / Postman)  │
                          └──────────────┬──────────────┘
                                         │ HTTP Request
                                         ▼
                    ┌──────────────────────────────────────────┐
                    │            Express App Stack             │
                    ├──────────────────────────────────────────┤
                    │ 1. CORS & JSON Body Parser Middleware    │
                    │ 2. Request Logger Middleware             │
                    ├──────────────────────────────────────────┤
                    │           Authentication Routes          │
                    │   • POST /auth/register                  │
                    │   • POST /auth/login                     │
                    │   • GET  /auth/me                        │
                    ├──────────────────────────────────────────┤
                    │        Protected Task Pipeline           │
                    │                                          │
                    │  [ 3. Auth Middleware (JWT Verify) ]     │
                    │          │ (req.user set)                │
                    │          ▼                               │
                    │  [ 4. Input Validation Middleware ]      │
                    │          │ (validates title/priority)    │
                    │          ▼                               │
                    │  [ 5. Task Controller & Mongoose ODM ]   │
                    └──────────────────┬───────────────────────┘
                                       │ Mongoose Driver
                                       ▼
                    ┌──────────────────────────────────────────┐
                    │             MongoDB Database             │
                    │     (Collections: users, tasks)          │
                    └──────────────────────────────────────────┘
```

### 2.2 Security Fundamentals
1. **Password Hashing (bcrypt)**:
   - Passwords are never stored as plain text. `bcrypt` automatically salts and applies a computationally expensive key derivation function (10 salt rounds), protecting against rainbow table attacks.
2. **Stateless JWT Tokens**:
   - On successful login, the server signs a cryptographic token containing user claims (`id`, `email`) and an expiry (`1h`).
   - The client stores the token in `localStorage` and includes it in the HTTP `Authorization: Bearer <token>` header on subsequent requests.
3. **Middleware Pipeline**:
   - **`authMiddleware`**: Intercepts requests, extracts the Bearer token, verifies its signature using `process.env.JWT_SECRET` inside a `try/catch` block, and attaches `req.user`. Missing or invalid tokens return `401 Unauthorized`.
   - **`validateTask`**: Validates request parameters (e.g., non-empty `title`, valid `priority` and `status` enums) before reaching controllers, returning `400 Bad Request` if invalid.

---

## 3. Step-by-Step Implementation

### Step 1: Install Required Dependencies
```bash
npm install bcryptjs jsonwebtoken
```

### Step 2: Create User Model with Pre-Save Hashing (`src/models/User.js`)
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  }
}, { timestamps: true });

// Pre-save hook: Hash password with bcrypt before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Never expose password hash in JSON responses
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
```

### Step 3: Implement Authentication Routes (`src/routes/authRoutes.js`)
- **`POST /auth/register`**: Hashes password, saves user to MongoDB, issues signed JWT (`201 Created`).
- **`POST /auth/login`**: Compares password hash via `bcrypt.compare`, signs JWT token (`200 OK`).
- **`GET /auth/me`**: Returns currently logged-in user profile from decoded JWT (`200 OK`).

### Step 4: Create JWT Authentication Middleware (`src/middleware/auth.js`)
```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied: No authorization token provided (Format: Bearer <token>)'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'adwf_jwt_secret_key_practical_7_2026';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired token'
    });
  }
};

module.exports = authMiddleware;
```

### Step 5: Create Server-Side Task Input Validation Middleware (`src/middleware/validateTask.js`)
```javascript
const validateTask = (req, res, next) => {
  const errors = [];
  const { title, priority, status } = req.body;

  if (req.method === 'POST' || (req.method === 'PUT' && title !== undefined)) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.push({ field: 'title', message: 'Task title is required and cannot be blank' });
    }
  }

  if (priority !== undefined) {
    const allowed = ['low', 'medium', 'high'];
    if (!allowed.includes(priority)) {
      errors.push({ field: 'priority', message: `'${priority}' is invalid. Allowed: ${allowed.join(', ')}` });
    }
  }

  if (status !== undefined) {
    const allowed = ['pending', 'in-progress', 'completed'];
    if (!allowed.includes(status)) {
      errors.push({ field: 'status', message: `'${status}' is invalid. Allowed: ${allowed.join(', ')}` });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation Error', details: errors });
  }

  next();
};

module.exports = validateTask;
```

### Step 6: Apply Middlewares to Task Routes (`src/routes/taskRoutes.js`)
```javascript
// Protect all task endpoints with authMiddleware
router.use(authMiddleware);

// Apply input validation to write routes
router.post('/', validateTask, createTaskHandler);
router.put('/:id', validateTaskId, validateTask, updateTaskHandler);
router.patch('/:id', validateTaskId, validateTask, patchTaskHandler);
```

---

## 4. Key Questions & Analysis

### Q1: Why must passwords be hashed before storage instead of saved as plain text, even in a lab/demo project?
**Answer**:  
1. **Defense in Depth**: If the database is compromised, leaked, or exposed via unauthorized logs or backups, hashed passwords cannot be read directly.
2. **Credential Reuse Risk**: Users frequently reuse passwords across multiple services. A breach of plain text passwords would compromise user accounts on external platforms.
3. **One-Way Functions**: `bcrypt` is a cryptographically secure one-way hash that incorporates unique salts and configurable work factors (cost factor), preventing brute-force and pre-computed rainbow table attacks.

### Q2: What does the authentication middleware actually verify, and what happens if the token is missing or expired?
**Answer**:  
1. **Verification Process**: The middleware extracts the token from `Authorization: Bearer <token>`, verifies the cryptographic HMAC signature using the server's secret (`JWT_SECRET`), and checks if `exp` (timestamp) has passed.
2. **Missing Token**: Returns `401 Unauthorized` with an explicit error message prompting the client to log in.
3. **Expired or Tampered Token**: `jwt.verify()` throws `TokenExpiredError` or `JsonWebTokenError`. Caught inside `try/catch`, returning `401 Unauthorized` without crashing the Express server.

### Q3: Why should input validation happen on the server even if the frontend already validates the same fields?
**Answer**:  
1. **Client Bypass**: Client-side validation can easily be bypassed using Postman, cURL, browser DevTools, or malicious scripts.
2. **Data Integrity & Security**: Server-side validation is the authoritative gatekeeper protecting database consistency, preventing malformed records, null injection, and invalid enum states.
3. **Multi-Client Support**: Server-side validation uniformly protects all present and future clients (web, mobile app, 3rd party APIs).

---

## 5. Verification & Automated Test Evidence

### Test Suite Execution Output (`npm test`):
```text
> task-manager-api@1.0.0 test
> node test-api.js

----------------------------------------------------
🧪 Starting Practical 7 Authentication & Middleware Suite
----------------------------------------------------

✅ Connected to local MongoDB at: mongodb://127.0.0.1:27017/taskdb
MongoDB connected successfully to mongodb://127.0.0.1:27017/taskdb

📌 Section 1: Authentication & User Registration (bcrypt + JWT)
--------------------------------------------------------------
✅ PASS: POST /auth/register should hash password, save user, and return 201 Created with JWT
✅ PASS: POST /auth/register with existing email should return 400 Bad Request
✅ PASS: POST /auth/register with short password (<6 chars) should return 400 Bad Request
✅ PASS: POST /auth/login with valid credentials should return 200 OK and JWT token
✅ PASS: POST /auth/login with incorrect password should return 401 Unauthorized
✅ PASS: GET /auth/me with Bearer token should return 200 OK and current user profile
✅ PASS: GET /auth/me without token should return 401 Unauthorized

📌 Section 2: Protected Task Routes & Input Validation Middleware
-----------------------------------------------------------------
✅ PASS: GET /tasks without Authorization header should return 401 Unauthorized
✅ PASS: GET /tasks with invalid token string should return 401 Unauthorized
✅ PASS: POST /tasks without title should be rejected by validation middleware with 400 Bad Request
✅ PASS: POST /tasks with invalid priority should be rejected by validation middleware with 400 Bad Request
✅ PASS: POST /tasks with valid Bearer token creates task and returns 201 Created with HATEOAS links
✅ PASS: GET /tasks with Bearer token should return 200 OK with data array
✅ PASS: GET /tasks/:id with Bearer token returns single task with HATEOAS links
✅ PASS: PATCH /tasks/:id with Bearer token updates status to in-progress
✅ PASS: PUT /tasks/:id with Bearer token updates task title
✅ PASS: DELETE /tasks/:id with Bearer token removes task from MongoDB
✅ PASS: GET /tasks/test-error triggers Global Error Handler with 500 status

----------------------------------------------------
📊 Test Execution Summary: 18 Passed, 0 Failed
----------------------------------------------------
```

---

## 6. Rubrics Self-Assessment

| Criteria | Marks Allotted | Score | Evidence |
| :--- | :---: | :---: | :--- |
| **Conceptual Understanding** | 2 Marks | 2/2 | Comprehensive analysis of bcrypt salting, JWT stateless tokens, server-side validation necessity, and token lifecycle. |
| **Implementation** | 4 Marks | 4/4 | Complete User model with bcrypt pre-save hashing, `register`/`login`/`me` endpoints, `authMiddleware`, `validateTask`, protected task routes, and React JWT auth UI. |
| **Correctness** | 2 Marks | 2/2 | All 18 automated backend test cases passed (100% pass rate); complete flow tested in Postman and React UI. |
| **Reflection & Troubleshooting** | 1 Mark | 1/1 | Handled token expiration, 401 auto-redirection on frontend, safe `try/catch` token verification, and input error arrays. |
| **Lab File Evidence** | 1 Mark | 1/1 | Complete lab report containing architecture diagrams, code implementations, theory answers, and execution logs. |
| **Total** | **10 Marks** | **10/10** | **Passing Threshold: 5/10 (50%)** |
