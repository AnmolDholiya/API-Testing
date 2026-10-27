const taskEvents = require('./events');

// ── Listener 1: Task Created Event Handler ──────────────────────────────────────
taskEvents.on('task-created', (task) => {
  try {
    const startedAt = new Date().toISOString();
    const taskId = (task && (task._id || task.id)) ? String(task._id || task.id) : 'unknown';
    const title = (task && task.title) ? task.title : 'Untitled Task';
    const createdAt = (task && task.createdAt) ? new Date(task.createdAt).toISOString() : startedAt;
    const assignedUser = (task && task.assignedUser) ? task.assignedUser : ((task && task.user && task.user.email) || 'Unassigned');

    console.log(`[Notification] Handler started at: ${startedAt}`);
    console.log(`[Notification] Task ID: ${taskId}`);
    console.log(`[Notification] Task: ${title}`);
    console.log(`[Notification] Task Created At: ${createdAt}`);
    console.log(`[Notification] Assigned User: ${assignedUser}`);

    // Configurable artificial delay of approximately 2 seconds (default 2000ms)
    const delay = (task && task.delayMs !== undefined) ? task.delayMs : 2000;

    setTimeout(() => {
      try {
        // Support simulated error handling inside the asynchronous handler
        if (task && task.__simulateError) {
          throw new Error(`Simulated listener failure during email dispatch for task: "${title}"`);
        }

        const completedAt = new Date().toISOString();
        console.log(`[Notification] Notification completed at: ${completedAt}`);

        taskEvents.recordLog({
          event: 'task-created',
          taskId: (task && (task._id || task.id)) || null,
          title,
          assignedUser,
          createdAt,
          startedAt,
          completedAt,
          delayMs: delay,
          status: 'completed'
        });
      } catch (asyncErr) {
        // Forward asynchronous errors to the dedicated 'error' event listener
        taskEvents.emit('error', asyncErr);
      }
    }, delay);
  } catch (syncErr) {
    // Forward synchronous errors to the dedicated 'error' event listener
    taskEvents.emit('error', syncErr);
  }
});

// ── Listener 2: Task Deleted Event Handler (Supplementary Problem 1) ───────────
taskEvents.on('task-deleted', (task) => {
  try {
    const startedAt = new Date().toISOString();
    const taskId = (task && (task.id || task._id)) ? String(task.id || task._id) : 'unknown';
    const title = (task && task.title) ? task.title : 'Untitled Task';
    const deletedBy = (task && task.deletedBy) ? task.deletedBy : 'admin';

    console.log(`[Task Deleted] Task ID: ${taskId}`);
    console.log(`[Task Deleted] Task Title: ${title}`);
    console.log(`[Task Deleted] Deleted By: ${deletedBy}`);
    console.log(`[Task Deleted] Timestamp: ${startedAt}`);

    const delay = (task && task.delayMs !== undefined) ? task.delayMs : 500;

    setTimeout(() => {
      try {
        if (task && task.__simulateError) {
          throw new Error(`Simulated listener failure during deletion cleanup for task ID: "${taskId}"`);
        }

        const completedAt = new Date().toISOString();
        console.log(`[Task Deleted] Notification completed at: ${completedAt}`);

        taskEvents.recordLog({
          event: 'task-deleted',
          taskId,
          title,
          deletedBy,
          startedAt,
          completedAt,
          delayMs: delay,
          status: 'completed'
        });
      } catch (asyncErr) {
        taskEvents.emit('error', asyncErr);
      }
    }, delay);
  } catch (syncErr) {
    taskEvents.emit('error', syncErr);
  }
});

// ── Listener 3: Error Event Handler (Supplementary Problem 2) ───────────────────
// In Node.js EventEmitter, if an 'error' event is emitted without a listener,
// Node.js will throw an uncaught exception and crash the application.
taskEvents.on('error', (err) => {
  const timestamp = new Date().toISOString();
  console.error(`[Error Event] ⚠️ Handled background event error at ${timestamp}: ${err.message}`);

  taskEvents.recordLog({
    event: 'error',
    errorMessage: err.message,
    timestamp,
    status: 'caught_and_handled'
  });
});

console.log('✅ Practical 10 Event Listeners registered successfully (task-created, task-deleted, error)');

module.exports = taskEvents;
