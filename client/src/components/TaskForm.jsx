import React, { useState } from 'react';
import { PlusCircle, Calendar, AlertCircle } from 'lucide-react';

export default function TaskForm({ onSubmit, loading }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }
    setFormError('');

    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status: 'pending',
      dueDate: dueDate ? new Date(dueDate).toISOString() : null
    };

    try {
      await onSubmit(payload);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
    } catch (err) {
      setFormError(err.message || 'Failed to create task.');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <PlusCircle size={19} style={{ color: '#3b82f6' }} />
          <span>New Task</span>
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        {formError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '0.75rem 0.95rem',
            borderRadius: '8px',
            fontSize: '0.84rem',
            fontWeight: '500',
            marginBottom: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="taskTitle">
            Task Title <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="taskTitle"
            type="text"
            className="form-input"
            placeholder="e.g. Implement React + Node + MongoDB flow"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="taskDesc">Description</label>
          <textarea
            id="taskDesc"
            rows="3"
            className="form-textarea"
            placeholder="Additional context, acceptance criteria, or notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="taskPriority">Priority</label>
            <select
              id="taskPriority"
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={loading}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="taskDueDate">Due Date</label>
            <input
              id="taskDueDate"
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner" />
              <span>Saving to MongoDB...</span>
            </>
          ) : (
            <>
              <PlusCircle size={16} />
              <span>Create Task (POST /tasks)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
