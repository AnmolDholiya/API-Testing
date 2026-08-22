import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import TaskForm from './components/TaskForm';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import ConfirmDialog from './components/ConfirmDialog';
import ToastContainer from './components/ToastContainer';
import HateoasModal from './components/HateoasModal';
import { 
  getTasks, 
  createTask, 
  updateTask, 
  patchTask, 
  deleteTask, 
  checkBackendHealth,
  BASE_URL
} from './services/api';
import { 
  Search, 
  Filter, 
  Inbox, 
  AlertCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ServerCrash
} from 'lucide-react';

export default function App() {
  // Main Data States
  const [tasks, setTasks] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Loading & Connection States
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal States
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [inspectingTask, setInspectingTask] = useState(null);

  // Toast Notification System
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message, title = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Fetch Tasks from MongoDB Backend ──────────────────────────────────────
  const fetchTasksList = useCallback(async (currentPage = page, search = searchQuery, status = statusFilter, priority = priorityFilter) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await getTasks({
        page: currentPage,
        limit: 10,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined
      });

      if (response && response.success) {
        setTasks(response.data || []);
        setTotalCount(response.total || response.count || 0);
        setPage(response.page || 1);
        setTotalPages(response.totalPages || 1);
        setBackendConnected(true);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
      setBackendConnected(false);
      setErrorMessage(err.message);
      addToast('error', err.message, 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, priorityFilter]);

  // Initial mount fetch & health check
  useEffect(() => {
    fetchTasksList();
  }, [fetchTasksList]);

  // Health ping interval
  useEffect(() => {
    const checkStatus = async () => {
      const health = await checkBackendHealth();
      setBackendConnected(health.ok);
    };
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Handle Task Creation (POST /tasks) with Optimistic UI Update ──────────
  const handleCreateTask = async (taskPayload) => {
    setCreateLoading(true);
    // Create optimistic temporary task
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      _id: tempId,
      ...taskPayload,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // Optimistically add to top of state
    setTasks((prev) => [optimisticTask, ...prev]);

    try {
      const res = await createTask(taskPayload);
      if (res && res.success) {
        // Replace temp task with confirmed task from MongoDB
        setTasks((prev) =>
          prev.map((t) => (t._id === tempId ? res.data : t))
        );
        addToast('success', `"${res.data.title}" saved to MongoDB`, 'Task Created');
        // Refresh full pagination metadata
        fetchTasksList(page);
      }
    } catch (err) {
      // Rollback optimistic task on error
      setTasks((prev) => prev.filter((t) => t._id !== tempId));
      addToast('error', err.message, 'Create Task Failed');
      throw err;
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Handle Status Toggle / Progression (PATCH /tasks/:id) ─────────────────
  const handleToggleStatus = async (task, targetStatus = null) => {
    const taskId = task._id || task.id;
    const currentStatus = task.status || (task.completed ? 'completed' : 'pending');

    let nextStatus = targetStatus;
    if (!nextStatus) {
      nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    }

    const previousTasks = [...tasks];

    // Optimistically update local UI state immediately
    setTasks((prev) =>
      prev.map((t) =>
        (t._id || t.id) === taskId
          ? { ...t, status: nextStatus, completed: nextStatus === 'completed' }
          : t
      )
    );

    try {
      const res = await patchTask(taskId, {
        status: nextStatus,
        completed: nextStatus === 'completed'
      });

      if (res && res.success) {
        setTasks((prev) =>
          prev.map((t) => ((t._id || t.id) === taskId ? res.data : t))
        );
        addToast('success', `Status changed to ${nextStatus}`, 'Updated');
      }
    } catch (err) {
      // Rollback state upon failure
      setTasks(previousTasks);
      addToast('error', `Failed to update status: ${err.message}`, 'Update Error');
    }
  };

  // ── Handle Task Update (PUT /tasks/:id) ───────────────────────────────────
  const handleUpdateTask = async (id, updatedPayload) => {
    setModalLoading(true);
    try {
      const res = await updateTask(id, updatedPayload);
      if (res && res.success) {
        setTasks((prev) =>
          prev.map((t) => ((t._id || t.id) === id ? res.data : t))
        );
        addToast('success', 'Task updated successfully', 'Success');
        setEditingTask(null);
      }
    } catch (err) {
      addToast('error', err.message, 'Update Failed');
      throw err;
    } finally {
      setModalLoading(false);
    }
  };

  // ── Handle Task Deletion (DELETE /tasks/:id) with Dialog Confirmation ──────
  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    const taskId = deletingTask._id || deletingTask.id;
    setDeleteLoading(true);

    try {
      const res = await deleteTask(taskId);
      if (res && res.success) {
        setTasks((prev) => prev.filter((t) => (t._id || t.id) !== taskId));
        addToast('success', `Task "${deletingTask.title}" removed`, 'Deleted');
        setDeletingTask(null);
        // Re-sync count
        fetchTasksList(page);
      }
    } catch (err) {
      addToast('error', err.message, 'Delete Failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Navbar & Live Connection Indicator */}
      <Navbar
        backendConnected={backendConnected}
        onRefresh={() => fetchTasksList(page)}
        loading={loading}
      />

      {/* Backend Offline Warning Banner */}
      {!backendConnected && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          boxShadow: 'var(--shadow-card)'
        }}>
          <ServerCrash size={28} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#991b1b', marginBottom: '0.3rem' }}>
              Backend Connection Offline (Cannot Reach {BASE_URL})
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
              Please ensure your Express server is running on <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>http://localhost:5000</code> and MongoDB is running.
            </p>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
              onClick={() => fetchTasksList(page)}
            >
              <RefreshCw size={13} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      )}

      {/* Real-Time Metrics Overview */}
      <StatsBar tasks={tasks} />

      {/* Main Two-Column Layout */}
      <div className="main-grid">
        {/* Left Column: Task Creation Form */}
        <div>
          <TaskForm onSubmit={handleCreateTask} loading={createLoading} />
        </div>

        {/* Right Column: Filter Bar & Task List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Inbox size={22} style={{ color: '#4f46e5' }} />
              <span>MongoDB Tasks</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                ({totalCount} Total)
              </span>
            </h2>

            {/* Status Filter Pills */}
            <div className="filter-pills">
              {['', 'pending', 'in-progress', 'completed'].map((statusKey) => (
                <button
                  key={statusKey}
                  className={`filter-pill ${statusFilter === statusKey ? 'active' : ''}`}
                  onClick={() => {
                    setStatusFilter(statusKey);
                    fetchTasksList(1, searchQuery, statusKey, priorityFilter);
                  }}
                >
                  {statusKey === '' ? 'All' : statusKey === 'in-progress' ? 'In Progress' : statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Secondary Filter Bar */}
          <div className="filter-container">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search tasks by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchTasksList(1, searchQuery, statusFilter, priorityFilter);
                  }
                }}
              />
            </div>

            <select
              className="form-select"
              style={{ width: '130px', padding: '0.6rem 0.8rem' }}
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                fetchTasksList(1, searchQuery, statusFilter, e.target.value);
              }}
            >
              <option value="">All Priorities</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>

            <button
              className="btn btn-secondary"
              onClick={() => fetchTasksList(1, searchQuery, statusFilter, priorityFilter)}
            >
              Search
            </button>
          </div>

          {/* Task Items List */}
          <div className="task-items-container">
            {loading && tasks.length === 0 ? (
              // Loading Skeleton
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="skeleton"
                  style={{ height: '72px', width: '100%', marginBottom: '0.5rem' }}
                />
              ))
            ) : tasks.length === 0 ? (
              // Empty State
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                  No tasks found in MongoDB
                </h4>
                <p style={{ fontSize: '0.85rem' }}>
                  {searchQuery || statusFilter || priorityFilter
                    ? 'No tasks match the active search and filter criteria.'
                    : 'Create your first task using the form on the left!'}
                </p>
              </div>
            ) : (
              // Task Cards
              tasks.map((task) => (
                <TaskCard
                  key={task._id || task.id}
                  task={task}
                  isOptimistic={task.isOptimistic}
                  onToggleStatus={handleToggleStatus}
                  onEdit={(t) => setEditingTask(t)}
                  onDelete={(t) => setDeletingTask(t)}
                  onViewHateoas={(t) => setInspectingTask(t)}
                />
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-wrapper">
              <button
                className="btn btn-secondary"
                disabled={page <= 1 || loading}
                onClick={() => {
                  const prevPage = page - 1;
                  setPage(prevPage);
                  fetchTasksList(prevPage);
                }}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
              </span>

              <button
                className="btn btn-secondary"
                disabled={page >= totalPages || loading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchTasksList(nextPage);
                }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Task Modal (PUT) */}
      <TaskModal
        task={editingTask}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
        loading={modalLoading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        taskTitle={deletingTask?.title}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTask(null)}
        loading={deleteLoading}
      />

      {/* HATEOAS & JSON Inspector Modal */}
      <HateoasModal
        task={inspectingTask}
        isOpen={Boolean(inspectingTask)}
        onClose={() => setInspectingTask(null)}
      />

      {/* Toast Feedback Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
