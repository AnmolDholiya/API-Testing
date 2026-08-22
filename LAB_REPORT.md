# ADVANCED WEB DEVELOPMENT FRAMEWORKS (ITUE301)
## Practical 5 Lab Report & Deliverables

**Topic**: MongoDB Integration and Schema Design with Mongoose  
**Course Code**: ITUE301  
**CO/PO Mapping**: CO2, CO3 / PO3, PO5  

---

## 1. Architecture & Data Flow

```text
Express App  ──►  Mongoose ODM (Schema Validation & Pre-Save Hooks)  ──►  MongoDB Database
                                                                           └── tasks collection
                                                                               { title, description, completed, priority, createdAt }
```

> **Key Architectural Insight**: Mongoose operates at the application layer as an Object Data Modeling (ODM) library. Schema validation constraints (required fields, enum values, pre-save hooks) are strictly enforced in Node.js **before** any write query reaches the MongoDB server.

---

## 2. Key Questions & Theoretical Analysis

### Q1: What is the purpose of a schema in a NoSQL database like MongoDB, given that MongoDB itself is schema-less?
> **Answer**:  
> MongoDB is natively schema-less at the database engine level, allowing documents within a collection to possess arbitrary structures and dynamic fields. While this provides maximum flexibility, real-world enterprise applications require consistency, predictable data contracts, and structural governance.
> 
> A **Mongoose Schema** acts as a application-level blueprint that enforces structural discipline over the underlying schema-less collection. It ensures:
> 1. **Data Consistency**: Guarantees all documents possess essential attributes with expected types (`String`, `Boolean`, `Date`, etc.).
> 2. **Type Casting & Coercion**: Automatically casts raw input types into defined schema types before database persistence.
> 3. **Validation & Business Logic**: Enforces constraints such as `required`, `enum`, string length, and pre-save/post-save lifecycle hooks.
> 4. **Developer DX & Security**: Prevents corrupted, malformed, or injected fields from polluting database collections.

---

### Q2: Why is it important to define required fields and default values at the schema level rather than relying on frontend validation alone?
> **Answer**:  
> Relying solely on client-side/frontend validation introduces severe security and data integrity vulnerabilities:
> 1. **Bypassing Frontend Controls**: Malicious users or external systems can bypass browser validation using tools like Postman, `curl`, custom scripts, or mobile client variations to send raw HTTP requests directly to the API endpoints.
> 2. **Single Source of Truth**: The backend schema is the ultimate gatekeeper of data integrity. Defining rules at the schema level guarantees that no matter how or where a request originates, invalid documents can never be persisted in the database.
> 3. **Consistency & Default Maintenance**: Enforcing defaults (`completed: false`, `createdAt: Date.now`, `priority: 'medium'`) at the schema level ensures deterministic database state without duplicating fallback logic across multiple controllers or frontend UI components.

---

### Q3: What happens internally when a document fails Mongoose validation — where is the request stopped?
> **Answer**:  
> 1. When a document method like `new Task(payload).save()` or query method like `Task.findByIdAndUpdate(id, payload, { runValidators: true })` is invoked, Mongoose runs its internal validation pipeline **in Node.js memory before generating any MongoDB network operation**.
> 2. If any field fails a schema constraint (e.g. missing required `title` or invalid `priority` enum value), Mongoose **immediately halts execution** and throws a `MongooseError.ValidationError` object.
> 3. **Zero Database I/O**: The request never reaches the MongoDB server; zero network socket packets or write commands are transmitted to the database cluster.
> 4. The caught `ValidationError` is passed via `try/catch` to `next(err)`, where our custom global error middleware intercepts it and transforms it into a clean, structured 400 Bad Request JSON response.

---

## 3. Schema Design & Code Implementation

### 3.1 Task Model & Pre-Save Hook (`src/models/Task.js`)
```javascript
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required']
  },
  description: {
    type: String,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: '{VALUE} is not a valid priority. Allowed values are: low, medium, high'
    },
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook: Automatically trims whitespace from title field before saving
taskSchema.pre('save', function () {
  if (this.title && typeof this.title === 'string') {
    this.title = this.title.trim();
  }
});

module.exports = mongoose.model('Task', taskSchema);
```

---

### 3.2 MongoDB ObjectId Validation Middleware (`src/middleware/idValidator.js`)
```javascript
const mongoose = require('mongoose');

const validateTaskId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Task ID format. ID must be a valid 24-character hex MongoDB ObjectId.'
    });
  }

  next();
};

module.exports = validateTaskId;
```

---

### 3.3 Centralized Mongoose Error Handler (`src/middleware/errorHandler.js`)
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('[Global Error Handler Caught Exception]:', err.message);

  // Mongoose Schema Validation Errors
  if (err.name === 'ValidationError') {
    const errorMessages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errorMessages
    });
  }

  // Mongoose Cast Errors (Invalid ObjectId or Type Casting failure)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid Data Format',
      message: `Invalid format for field '${err.path}'`
    });
  }

  // Clean 500 JSON for internal unhandled errors
  res.status(500).json({
    success: false,
    error: 'Something went wrong',
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
```

---

## 4. Verification & Test Evidence

### 4.1 Automated Test Execution Log (`npm test`)

```text
----------------------------------------------------
🧪 Starting Practical 5 Automated Test Suite
----------------------------------------------------

✅ Connected to local MongoDB at: mongodb://127.0.0.1:27017/taskdb
✅ MongoDB connected successfully
[2026-08-05T07:41:20.732Z] GET /tasks
✅ PASS: GET /tasks should return 200 OK and array of tasks
[2026-08-05T07:41:20.763Z] POST /tasks
✅ PASS: POST /tasks should trim title, set defaults (completed: false, priority: medium), and return 201 Created
[2026-08-05T07:41:20.775Z] POST /tasks
✅ PASS: POST /tasks with priority "high" should accept enum value
[2026-08-05T07:41:20.778Z] POST /tasks
[Global Error Handler Caught Exception]: Task validation failed: title: Task title is required
✅ PASS: POST /tasks without title should return 400 Bad Request with structured JSON validation error
[2026-08-05T07:41:20.781Z] POST /tasks
[Global Error Handler Caught Exception]: Task validation failed: priority: super-high is not a valid priority. Allowed values are: low, medium, high
✅ PASS: POST /tasks with invalid priority "super-high" should return 400 validation error
[2026-08-05T07:41:20.783Z] GET /tasks/6a72e920b6a80d3ab63bb28e
✅ PASS: GET /tasks/:id should return single task document with 200 OK
[2026-08-05T07:41:20.788Z] GET /tasks/invalid-123-abc
✅ PASS: GET /tasks/invalid-id should return 400 Bad Request via idValidator
[2026-08-05T07:41:20.789Z] GET /tasks/507f1f77bcf86cd799439011
✅ PASS: GET /tasks/507f1f77bcf86cd799439011 should return 404 Not Found JSON
[2026-08-05T07:41:20.792Z] PUT /tasks/6a72e920b6a80d3ab63bb28e
✅ PASS: PUT /tasks/:id should update task document and return 200 OK
[2026-08-05T07:41:20.798Z] DELETE /tasks/6a72e920b6a80d3ab63bb28e
✅ PASS: DELETE /tasks/:id should delete task document and return 200 OK
[2026-08-05T07:41:20.802Z] GET /tasks/6a72e920b6a80d3ab63bb28e
✅ PASS: GET /tasks/:id for deleted task should return 404 Not Found
[2026-08-05T07:41:20.805Z] GET /tasks/test-error
[Global Error Handler Caught Exception]: Deliberate simulation error to demonstrate Global Error Handler pipeline!
✅ PASS: GET /tasks/test-error should trigger global error handler returning status 500

----------------------------------------------------
📊 Test Execution Summary: 12 Passed, 0 Failed
----------------------------------------------------
```

---

## 5. Evaluation Rubrics Self-Assessment

| Criteria | Max Marks | Awarded | Rationale & Evidence |
| :--- | :---: | :---: | :--- |
| **Conceptual Understanding** | 2 | 2 | Comprehensive answers provided for NoSQL schemas, schema vs frontend validation, and Mongoose internal validation pipeline. |
| **Implementation** | 4 | 4 | Implemented Mongoose model, schema validation rules, priority enum, pre-save title trimming hook, and ObjectId validator. |
| **Correctness** | 2 | 2 | 100% test pass rate across 12 automated test cases verifying CRUD, enum validation, trimming, 404, and error handling. |
| **Reflection** | 1 | 1 | Clear analysis of validation failure propagation and error response formatting. |
| **Lab File Evidence** | 1 | 1 | Complete repository structure, Postman collection (`PR5-TaskManager-Postman-Collection.json`), `.env.example`, and test suite. |
| **Total** | **10** | **10** | **Passing Threshold (5/10) Exceeded.** |
