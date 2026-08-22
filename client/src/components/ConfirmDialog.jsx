import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = 'Delete Task',
  message = 'Are you sure you want to delete this task? This action will permanently remove it from MongoDB.',
  taskTitle = '',
  onConfirm,
  onCancel,
  loading = false
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={22} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.4rem' }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
              {message}
            </p>
            {taskTitle && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-sans)',
                fontWeight: '500',
                color: 'var(--text-main)',
                marginBottom: '1rem'
              }}>
                "{taskTitle}"
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete Task</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
