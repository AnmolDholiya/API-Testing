# Practical 6: Full Stack Integration (React + Node.js + Express + MongoDB)

**Course**: Advanced Web Development Frameworks (ITUE301)  
**CO/PO Mapping**: CO1, CO2 / PO3, PO5  

---

## 🎯 Objective

Wire the **React frontend** to the **Node/Express/MongoDB backend** into a fully functional, production-ready full-stack application. Supports end-to-end CRUD operations, real-time MongoDB persistence, CORS middleware integration, centralized API services, optimistic UI updates, confirmation dialogs, and toast notifications.

---

## 🏗️ Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────┐
│              React Frontend (Vite)                      │
│             http://localhost:5173                       │
│  - TaskForm (POST /tasks)                               │
│  - TaskList & TaskCard (GET, PUT, PATCH, DELETE)        │
│  - StatsBar & Metrics                                   │
│  - Centralized API Service (src/services/api.js)        │
│  - Optimistic UI Updates & Toast Feedback               │
└──────────────────────────┬──────────────────────────────┘
                           │
             HTTP / CORS   │  JSON Requests
      (GET, POST, PUT,     │  & Responses
       PATCH, DELETE)      │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Express.js Backend                         │
│             http://localhost:5000                       │
│  - CORS Middleware (app.use(cors()))                    │
│  - Custom Request Logger Middleware                     │
│  - Content-Type JSON Validator                          │
│  - Centralized Error Handler Pipeline                   │
│  - Level 3 HATEOAS Hypermedia Link Generator            │
└──────────────────────────┬──────────────────────────────┘
                           │
                 Mongoose  │  Queries & Mutations
                           ▼
┌─────────────────────────────────────────────────────────┐
│               MongoDB Database                          │
│             mongodb://127.0.0.1:27017/taskdb            │
│  - Tasks Collection (Schema, Enums, Timestamps)         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features Implemented

1. **Backend CORS Configuration**:
   - `cors` middleware installed and configured to allow cross-origin requests from the React dev server (`http://localhost:5173`).
2. **Centralized API Client (`src/services/api.js`)**:
   - Clean async/await wrappers with standard error handling for `getTasks`, `createTask`, `updateTask`, `patchTask`, and `deleteTask`.
3. **Full End-to-End CRUD Operations**:
   - **Create**: Task creation form with title, description, priority, due date.
   - **Read**: Fetching tasks directly from MongoDB on component mount and search/filter.
   - **Update (PUT)**: Modal dialog for editing title, description, status, priority, due date.
   - **Status Toggle (PATCH)**: Quick status progression (Pending ➔ In Progress ➔ Completed).
   - **Delete (DELETE)**: Task deletion with modal confirmation dialog.
4. **Optimistic UI Updates**:
   - Instant visual update upon creating tasks and toggling task statuses with automatic rollback if the backend write fails.
5. **Toast Notification System**:
   - Non-blocking toast notifications providing feedback for every API write/read interaction.
6. **Persistence Verified**:
   - Full persistence in MongoDB confirmed across page reloads.

---

## 💻 Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Modern Vanilla CSS (Glassmorphism design system).
- **Backend**: Node.js, Express.js, CORS, Dotenv.
- **Database**: MongoDB, Mongoose ODM.
- **Testing**: Node.js HTTP Test Suite, MongoMemoryServer.

---

## 📦 Project Structure

```text
PR4/
├── client/                     # React Frontend Application (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConfirmDialog.jsx     # Delete confirmation modal
│   │   │   ├── HateoasModal.jsx      # Hypermedia JSON inspector
│   │   │   ├── Navbar.jsx            # Top navbar & backend status
│   │   │   ├── StatsBar.jsx          # Live metrics cards
│   │   │   ├── TaskCard.jsx          # Interactive task item card
│   │   │   ├── TaskForm.jsx          # New task creation form
│   │   │   ├── TaskModal.jsx         # Edit task modal (PUT)
│   │   │   └── ToastContainer.jsx    # Toast notification system
│   │   ├── services/
│   │   │   └── api.js                # Centralized API service layer
│   │   ├── App.jsx                   # Root application state coordinator
│   │   ├── index.css                 # Modern CSS design system
│   │   └── main.jsx                  # React entrypoint
│   ├── index.html
│   ├── package.json
│   └── vite.config.js          # Vite config on port 5173
│
├── src/                        # Express Backend Application
│   ├── middleware/             # Logger, Content-Type, NotFound, ErrorHandler
│   ├── models/Task.js          # Mongoose Schema & validation hooks
│   ├── routes/taskRoutes.js    # Express CRUD & HATEOAS route handlers
│   └── utils/taskLinks.js      # Level 3 HATEOAS link generator
│
├── server.js                   # Express server entry point (port 5000)
├── test-api.js                 # 26-Point Automated test suite
├── package.json                # Root package with monorepo scripts
└── README.md
```

---

## 🛠️ How to Run Locally

### 1. Install Dependencies
Install dependencies for both backend and frontend:
```bash
# Install root backend dependencies
npm install

# Install frontend client dependencies
cd client
npm install
cd ..
```

### 2. Run Both Backend & Frontend Simultaneously
You can start both servers together using the monorepo script:
```bash
npm run dev
```
- **React Frontend**: `http://localhost:5173`
- **Express Backend**: `http://localhost:5000`

### Alternatively, Run in Separate Terminals:

**Terminal 1 (Backend):**
```bash
npm run server
# Express backend starts on http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
npm run client
# React frontend starts on http://localhost:5173
```

---

## 🧪 Automated Testing
Run the backend test suite to verify all API endpoints and validations:
```bash
npm test
```

---

## ❓ Key Concept Analysis (Viva & Evaluation)

### 1. What changes are required on the backend (CORS) to allow the React dev server to call the Express API?
- Browsers enforce the **Same-Origin Policy (SOP)** which restricts web applications running on one origin (e.g. `http://localhost:5173`) from making fetch requests to a different origin (e.g. `http://localhost:5000`).
- By installing `cors` and adding `app.use(cors())` before route definitions, the Express backend automatically includes the `Access-Control-Allow-Origin: *` (or specified origin) header and responds to HTTP `OPTIONS` preflight requests, allowing the React frontend to communicate with the API.

### 2. Why should the UI re-fetch or update local state after a successful POST/PUT/DELETE rather than assuming success silently?
- The backend server generates server-side data such as MongoDB ObjectIDs (`_id`), automatic timestamps (`createdAt`, `updatedAt`), default values, trimmed strings, and validated enums.
- Updating local state based on the server's response guarantees that the frontend and database stay perfectly synchronized and prevents showing phantom or mismatched data.

### 3. What is the risk of not handling errors on write operations (POST/PUT/DELETE) the same way as read operations (GET)?
- If write errors are ignored, the UI may show a task as created, edited, or deleted when the database rejected the request (e.g., schema validation failure, network disconnect, or duplicate key).
- When the user refreshes the page, their changes will vanish, resulting in severe data loss confusion. Proper write error handling alerts the user immediately and rolls back any optimistic UI changes.

---

## 📄 License
MIT
