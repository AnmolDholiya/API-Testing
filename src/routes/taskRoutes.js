const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const validateTaskId = require('../middleware/idValidator');
const authMiddleware = require('../middleware/auth');
const validateTask = require('../middleware/validateTask');
const { generateTaskLinks, generateCollectionLinks } = require('../utils/taskLinks');

/**
 * @route   GET /tasks/test-error
 * @desc    Test route to deliberately trigger global error handling middleware
 * @status  500 Internal Server Error
 */
router.get('/test-error', (req, res, next) => {
  try {
    throw new Error('Deliberate simulation error to demonstrate Global Error Handler pipeline!');
  } catch (err) {
    next(err);
  }
});

// ── Protect all task routes with JWT Authentication Middleware ───────────────
router.use(authMiddleware);

/**
 * @route   GET /tasks
 * @desc    Get all tasks (supports query filters: search, status, completed, priority, page, limit)
 * @status  200 OK, 401 Unauthorized
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = {};

    // Search query parameter (title or description)
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Legacy completed boolean filter
    if (req.query.completed !== undefined) {
      filter.completed = req.query.completed === 'true';
    }

    // Priority filter
    if (req.query.priority !== undefined) {
      filter.priority = req.query.priority;
    }

    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const totalTasks = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalTasks / limit) || 1;

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Attach task-level HATEOAS links to each document
    const tasksWithLinks = tasks.map((task) => {
      const taskObj = task.toObject();
      taskObj._links = generateTaskLinks(task);
      return taskObj;
    });

    const collectionLinks = generateCollectionLinks(req.query, page, limit, totalPages);

    res.status(200).json({
      success: true,
      count: tasksWithLinks.length,
      total: totalTasks,
      page: page,
      totalPages: totalPages,
      data: tasksWithLinks,
      _links: collectionLinks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /tasks/:id
 * @desc    Get single task by ObjectId with HATEOAS links
 * @status  200 OK, 400 Bad Request, 401 Unauthorized, or 404 Not Found
 */
router.get('/:id', validateTaskId, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${req.params.id} not found`
      });
    }

    const taskObj = task.toObject();
    const links = generateTaskLinks(task);

    res.status(200).json({
      success: true,
      data: {
        ...taskObj,
        _links: links
      },
      _links: links
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /tasks
 * @desc    Create a new task with validation middleware & HATEOAS response
 * @status  201 Created, 400 Bad Request, 401 Unauthorized
 */
router.post('/', validateTask, async (req, res, next) => {
  try {
    const { title, description, status, completed, priority, dueDate } = req.body;

    const newTask = new Task({
      title,
      description,
      status,
      completed,
      priority,
      dueDate
    });

    const savedTask = await newTask.save();
    const taskObj = savedTask.toObject();
    const links = generateTaskLinks(savedTask);
    taskObj._links = links;

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: taskObj,
      _links: links
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /tasks/:id
 * @desc    Fully update existing task by ObjectId with validation middleware & regenerated HATEOAS links
 * @status  200 OK, 400 Bad Request, 401 Unauthorized, or 404 Not Found
 */
router.put('/:id', validateTaskId, validateTask, async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    if (updateData.title && typeof updateData.title === 'string') {
      updateData.title = updateData.title.trim();
    }

    if (updateData.status !== undefined && updateData.completed === undefined) {
      updateData.completed = (updateData.status === 'completed');
    } else if (updateData.completed !== undefined && updateData.status === undefined) {
      updateData.status = updateData.completed ? 'completed' : 'pending';
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${req.params.id} not found`
      });
    }

    const taskObj = updatedTask.toObject();
    const links = generateTaskLinks(updatedTask);
    taskObj._links = links;

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: taskObj,
      _links: links
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PATCH /tasks/:id
 * @desc    Partially update task by ObjectId with validation middleware & status-aware HATEOAS links
 * @status  200 OK, 400 Bad Request, 401 Unauthorized, or 404 Not Found
 */
router.patch('/:id', validateTaskId, validateTask, async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    if (updateData.title && typeof updateData.title === 'string') {
      updateData.title = updateData.title.trim();
    }

    if (updateData.status !== undefined && updateData.completed === undefined) {
      updateData.completed = (updateData.status === 'completed');
    } else if (updateData.completed !== undefined && updateData.status === undefined) {
      updateData.status = updateData.completed ? 'completed' : 'pending';
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${req.params.id} not found`
      });
    }

    const taskObj = updatedTask.toObject();
    const links = generateTaskLinks(updatedTask);
    taskObj._links = links;

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: taskObj,
      _links: links
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /tasks/:id
 * @desc    Delete task by ObjectId
 * @status  200 OK, 400 Bad Request, 401 Unauthorized, or 404 Not Found
 */
router.delete('/:id', validateTaskId, async (req, res, next) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${req.params.id} not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: deletedTask
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
