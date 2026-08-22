# Practical 4: RESTful API with Node.js and Express (Level 3 HATEOAS)

**Course**: Advanced Web Development Frameworks (ITUE301)  
**CO/PO Mapping**: CO2 / PO3, PO5  

---

## 🎯 Objective

Design and implement a Richardson Maturity Model Level 3 RESTful API using Node.js, Express, and MongoDB (Mongoose). Features a complete middleware pipeline, custom logging, route parameter validation, centralized error handling, and **HATEOAS (Hypermedia As The Engine Of Application State)**.

---

## 🏆 REST Maturity Level

This API complies with **Richardson Maturity Model Level 3**:

- **Level 0**: Single URI using HTTP POST as a transport mechanism (e.g. SOAP or RPC).
- **Level 1 (Resources)**: Multiple URIs separating concepts into individual resources (e.g. `/tasks`).
- **Level 2 (HTTP Verbs & Status Codes)**: Correct usage of standard HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) and HTTP status codes (`200`, `201`, `400`, `404`, `500`).
- **Level 3 (HATEOAS - Implemented)**: Responses return hypermedia control controls (`_links`) informing the client what actions and resources are available dynamically.

---

## 🔗 HATEOAS `_links` Specifications

### 1. Single Task Resource Hypermedia
Every task representation returns contextual hypermedia controls based on its current lifecycle status.

#### Example Response (`GET /tasks/:id` for a `pending` task):
```json
{
  "success": true,
  "data": {
    "_id": "64d2e8f1a1b2c3d4e5f67890",
    "title": "Build Level 3 HATEOAS Engine",
    "description": "Implement hypermedia link utility",
    "status": "pending",
    "priority": "high",
    "completed": false,
    "createdAt": "2026-08-12T12:00:00.000Z",
    "updatedAt": "2026-08-12T12:00:00.000Z"
  },
  "_links": {
    "self": { "href": "/tasks/64d2e8f1a1b2c3d4e5f67890", "method": "GET" },
    "update": { "href": "/tasks/64d2e8f1a1b2c3d4e5f67890", "method": "PUT" },
    "partialUpdate": { "href": "/tasks/64d2e8f1a1b2c3d4e5f67890", "method": "PATCH" },
    "start": { "href": "/tasks/64d2e8f1a1b2c3d4e5f67890", "method": "PATCH" },
    "delete": { "href": "/tasks/64d2e8f1a1b2c3d4e5f67890", "method": "DELETE" },
    "collection": { "href": "/tasks", "method": "GET" }
  }
}
```

### 2. Status-Aware Hypermedia Actions

The available actions dynamically reflect the task's state:

- **`pending`**: Exposes `start` action (`PATCH` to set status to `in-progress`).
- **`in-progress`**: Exposes `complete` action (`PATCH` to set status to `completed`).
- **`completed`**: Does **NOT** expose `start` or `complete` actions.

---

### 3. Collection & Pagination Hypermedia

`GET /tasks` provides collection navigation links and preserves query parameters (`search`, `status`, `completed`, `priority`, `limit`):

```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 2,
  "totalPages": 5,
  "data": [ /* Array of tasks with item-level _links */ ],
  "_links": {
    "self": { "href": "/tasks?search=api&status=pending&page=2&limit=10", "method": "GET" },
    "first": { "href": "/tasks?search=api&status=pending&page=1&limit=10", "method": "GET" },
    "previous": { "href": "/tasks?search=api&status=pending&page=1&limit=10", "method": "GET" },
    "next": { "href": "/tasks?search=api&status=pending&page=3&limit=10", "method": "GET" },
    "last": { "href": "/tasks?search=api&status=pending&page=5&limit=10", "method": "GET" },
    "create": { "href": "/tasks", "method": "POST" }
  }
}
```

---

## 📡 API Reference & Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | Retrieve paginated tasks + collection links | `200 OK` |
| `GET` | `/tasks/:id` | Retrieve single task document + HATEOAS `_links` | `200 OK` / `404 Not Found` |
| `POST` | `/tasks` | Create task + return created task & links | `201 Created` / `400 Bad Request` |
| `PUT` | `/tasks/:id` | Fully update task & regenerate links | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `PATCH` | `/tasks/:id` | Partially update task / status transition | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `DELETE` | `/tasks/:id` | Remove task by ID | `200 OK` / `404 Not Found` |
| `GET` | `/tasks/test-error` | Trigger Global Error Handler | `500 Internal Server Error` |

---

## 🚀 Getting Started & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Server
```bash
npm start
```

Access the Interactive HATEOAS Dashboard in your browser: `http://localhost:3000` (or `PORT` environment variable).

### 3. Run Automated Tests
Execute the 26-point automated test suite:
```bash
npm test
```
