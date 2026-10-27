const EventEmitter = require('events');

class TaskEvents extends EventEmitter {
  constructor() {
    super();
    this.eventLogs = [];
  }

  recordLog(entry) {
    this.eventLogs.unshift({
      ...entry,
      loggedAt: new Date().toISOString()
    });
    // Keep last 100 events
    if (this.eventLogs.length > 100) {
      this.eventLogs.pop();
    }
  }

  /**
   * Retrieve in-memory event audit log
   */
  getLogs() {
    return this.eventLogs;
  }

  /**
   * Reset in-memory event audit log
   */
  clearLogs() {
    this.eventLogs = [];
  }
}

module.exports = new TaskEvents();
