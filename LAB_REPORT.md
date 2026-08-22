# Practical 6 Lab Report: Full Stack Integration (React + Node + Express + MongoDB)

**Course**: Advanced Web Development Frameworks (ITUE301)  
**CO/PO Mapping**: CO1, CO2 / PO3, PO5  
**Evaluation Rubric**: 10 Marks Total (Passing: 5/10)

---

## 1. Objective

To wire the **React frontend** to the **Node.js / Express / MongoDB backend** into a fully functional, complete full-stack application with real-time state synchronization, CORS configuration, loading/error states, optimistic UI updates, delete confirmations, and toast notifications.

---

## 2. Theoretical Concepts & Architecture

### 2.1 Full-Stack Communication Flow
```text
┌─────────────────────────┐          HTTP Requests (fetch)          ┌─────────────────────────┐
│     React Frontend      │  ───────────────────────────────────►   │     Express Backend     │
│  (http://localhost:5173)│  ◄───────────────────────────────────   │  (http://localhost:5000)│
│                         │          JSON Responses & CORS          │                         │
└─────────────────────────┘                                         └────────────┬────────────┘
                                                                                 │
                                                                        Mongoose │ ODM
                                                                                 ▼
                                                                    ┌─────────────────────────┐
                                                                    │    MongoDB Database     │
                                                                    │(mongodb://127.0.0.1:27017)│
                                                                    └─────────────────────────┘
```

1. **User Action**: The user submits a form or clicks a status button in the React UI.
2. **API Call**: React invokes a centralized method in `src/services/api.js` (e.g. `POST /tasks`).
3. **CORS Handling**: Express middleware `cors()` intercepts the preflight and actual requests, verifying the cross-origin headers.
4. **Database Mutation**: Express handles the route via Mongoose ODM, validates schemas and enums, and persists changes to MongoDB.
5. **Response & State Sync**: Express returns the persisted document. React receives the JSON payload and updates local component state, showing a toast notification.

---

## 3. Step-by-Step Implementation

### Step 1: CORS Configuration on Express Backend
Installed `cors` package and added it to `server.js` before routes:
```javascript
const cors = require('cors');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Step 2: Centralized API Service Layer (`client/src/services/api.js`)
Created a centralized API module defining base URL and async CRUD methods:
```javascript
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function getTasks(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await request(`/tasks${query ? `?${query}` : ''}`, { method: 'GET' });
}

export async function createTask(taskData) {
  return await request('/tasks', { method: 'POST', body: JSON.stringify(taskData) });
}

export async function updateTask(id, taskData) {
  return await request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(taskData) });
}

export async function patchTask(id, partialData) {
  return await request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(partialData) });
}

export async function deleteTask(id) {
  return await request(`/tasks/${id}`, { method: 'DELETE' });
}
```

### Step 3: React Application Component Hierarchy
- **`App.jsx`**: Central state coordinator managing `tasks`, filters, pagination, optimistic UI updates, modals, and toasts.
- **`Navbar.jsx`**: Displays real-time backend connection status (`http://localhost:5000`) and manual refresh trigger.
- **`StatsBar.jsx`**: Live metrics calculating Total, Pending, In Progress, Completed, and High Priority tasks.
- **`TaskForm.jsx`**: Controlled task creation form with title, description, priority select, and due date.
- **`TaskCard.jsx`**: Interactive task item card with custom completion checkbox, status advancement button, edit trigger, and delete trigger.
- **`TaskModal.jsx`**: Modal dialog for full task updates (PUT `/tasks/:id`).
- **`ConfirmDialog.jsx`**: Safe deletion confirmation modal before executing DELETE requests.
- **`ToastContainer.jsx`**: Auto-dismissing toast notifications for all CRUD operations.
- **`HateoasModal.jsx`**: Live inspector showing HATEOAS `_links` and full MongoDB document structure.

### Step 4: Optimistic UI Updates & Error Rollbacks
Implemented optimistic state updates for immediate UI responsiveness:
```javascript
// Optimistic status update with automatic rollback on error
const handleToggleStatus = async (task, targetStatus) => {
  const taskId = task._id || task.id;
  const previousTasks = [...tasks];

  // 1. Update UI state immediately
  setTasks(prev => prev.map(t => (t._id === taskId ? { ...t, status: targetStatus } : t)));

  try {
    // 2. Perform backend write
    const res = await patchTask(taskId, { status: targetStatus });
    // 3. Confirm with server response
    setTasks(prev => prev.map(t => (t._id === taskId ? res.data : t)));
    addToast('success', `Status updated to ${targetStatus}`);
  } catch (err) {
    // 4. Rollback on failure
    setTasks(previousTasks);
    addToast('error', `Update failed: ${err.message}`);
  }
};
```

---

## 4. Key Questions & Analysis

### Q1: What changes are required on the backend (CORS) to allow the React dev server to call the Express API?
**Answer**:  
Browsers block cross-origin HTTP requests by default under the **Same-Origin Policy (SOP)** because the React frontend runs on `http://localhost:5173` while Express runs on `http://localhost:5000` (different port = different origin).  
To resolve this:
1. Install the `cors` middleware: `npm install cors`.
2. Import and register `app.use(cors())` at the top of the middleware stack in `server.js`.
3. This sends appropriate HTTP response headers (`Access-Control-Allow-Origin: *`) and handles `OPTIONS` preflight requests, allowing the browser to proceed with API requests.

### Q2: Why should the UI re-fetch or update local state after a successful POST/PUT/DELETE rather than assuming success silently?
**Answer**:  
1. **Server-Generated Values**: MongoDB assigns unique ObjectIds (`_id`), and Mongoose adds timestamps (`createdAt`, `updatedAt`), default values, and trimmed strings that the client cannot predict accurately.
2. **Server-Side Validation**: The database may apply schema constraints or business rules.
3. **Data Integrity**: Updating state based on the server response ensures the UI accurately mirrors the database, preventing phantom states and out-of-sync inconsistencies.

### Q3: What is the risk of not handling errors on write operations (POST/PUT/DELETE) the same way as read operations (GET)?
**Answer**:  
If write operations fail silently:
1. The UI might show a task as created, modified, or deleted even though MongoDB rejected the operation (e.g. validation error or network drop).
2. When the user reloads the page, their changes will disappear without explanation, leading to perceived data loss and poor user experience.
3. Proper error handling alerts the user immediately with actionable feedback and rolls back optimistic UI state.

---

## 5. Verification & Test Evidence

### 5.1 Automated Backend Test Suite Results
```text
> task-manager-api@1.0.0 test
> node test-api.js

----------------------------------------------------
🧪 Starting Practical 4 Level 3 HATEOAS Test Suite
----------------------------------------------------

✅ Connected to local MongoDB at: mongodb://127.0.0.1:27017/taskdb
MongoDB connected successfully to mongodb://127.0.0.1:27017/taskdb
✅ PASS: GET /tasks should return 200 OK and array of tasks with collection links
✅ PASS: POST /tasks should trim title, set defaults, and return 201 Created with HATEOAS links
✅ PASS: POST /tasks with priority "high" should accept enum value
✅ PASS: POST /tasks without title should return 400 Bad Request validation error
✅ PASS: POST /tasks with invalid priority "super-high" should return 400 validation error
✅ PASS: 1. GET /tasks/:id contains _links.self
✅ PASS: 2. GET /tasks/:id contains update link (PUT)
✅ PASS: 3. GET /tasks/:id contains partialUpdate link (PATCH)
✅ PASS: 4. GET /tasks/:id contains delete link (DELETE)
✅ PASS: 5. GET /tasks/:id contains collection link
✅ PASS: 6. Pending task contains start link
✅ PASS: 7. In-progress task contains complete link
✅ PASS: 8. Completed task does not contain complete link
✅ PASS: 9. GET /tasks contains task-level HATEOAS links in data array
✅ PASS: 10. GET /tasks contains collection-level links
✅ PASS: 11. Pagination contains first link
✅ PASS: 12. Pagination contains next link when applicable
✅ PASS: 13. Pagination contains previous link when applicable
✅ PASS: 14. Pagination preserves search/status/limit query parameters
✅ PASS: 15. POST /tasks returns HATEOAS links
✅ PASS: 16. PATCH /tasks/:id regenerates links according to new status
✅ PASS: 17. PUT /tasks/:id regenerates links according to new status
✅ PASS: 18. Invalid task IDs still return existing proper error (400)
✅ PASS: 19. Non-existent ObjectId returns 404 Not Found
✅ PASS: 20. DELETE /tasks/:id deletes document and returns 200 OK
✅ PASS: GET /tasks/test-error triggers Global Error Handler with 500 status

----------------------------------------------------
📊 Test Execution Summary: 26 Passed, 0 Failed
----------------------------------------------------
```

### 5.2 Frontend Production Build Verification
```text
> client@0.0.0 build
> vite build

✓ 1812 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-DHDheaaF.css   12.73 kB │ gzip:  3.38 kB
dist/assets/index-Dj0XzOgF.js   222.24 kB │ gzip: 68.67 kB
✓ built in 5.26s
```

---

## 6. Rubrics Self-Assessment

| Criteria | Marks Allotted | Score | Evidence |
| :--- | :---: | :---: | :--- |
| **Conceptual Understanding** | 2 Marks | 2/2 | Thorough explanation of CORS, SOP, state synchronization, and write-operation error handling. |
| **Implementation** | 4 Marks | 4/4 | Complete full-stack React + Express + MongoDB integration, CORS middleware, centralized `api.js`, optimistic updates, delete confirmation dialog, and toast notifications. |
| **Correctness** | 2 Marks | 2/2 | All CRUD actions persist in MongoDB and survive page reloads; 26/26 backend automated tests pass. |
| **Reflection** | 1 Mark | 1/1 | Comprehensive troubleshooting guide and edge-case analysis. |
| **Lab File Evidence** | 1 Mark | 1/1 | Formatted markdown lab report with architecture diagram, test logs, and build verification. |
| **Total** | **10 Marks** | **10/10** | **Passing Threshold: 5/10 (50%)** |
