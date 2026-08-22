const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Middleware
const loggerMiddleware     = require('./src/middleware/logger');
const contentTypeMiddleware = require('./src/middleware/contentType');
const notFoundHandler      = require('./src/middleware/notFound');
const errorHandler         = require('./src/middleware/errorHandler');

// Routes
const taskRoutes = require('./src/routes/taskRoutes');

const app = express();

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(loggerMiddleware);
app.use(contentTypeMiddleware);

// Serve static files (Interactive Dashboard)
app.use(express.static('public'));

// ── Connect to MongoDB ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/tasks', taskRoutes);

// ── 404 & Global Error Handler (must be LAST) ────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start server (Only when executed directly, not when required in tests) ──
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;