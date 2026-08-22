import React from 'react';
import { Layers, RefreshCw, AlertCircle, Server, PlusCircle, LogIn, LogOut, User, ShieldCheck } from 'lucide-react';

export default function Navbar({
  backendConnected,
  onRefresh,
  onOpenNewTask,
  onOpenAuth,
  currentUser,
  onLogout,
  loading
}) {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-icon">
          <Layers size={26} />
        </div>
        <div className="brand-info">
          <h1>Full-Stack Task Manager</h1>
          <p>Practical 7 • JWT Authentication & Express Middleware Pipeline</p>
        </div>
      </div>

      <div className="nav-actions">
        {/* Backend Connection Status Badge */}
        <div
          className={`badge ${backendConnected ? 'badge-connected' : 'badge-disconnected'}`}
          title={backendConnected ? 'Connected to http://localhost:5000' : 'Disconnected from backend'}
        >
          <span className="badge-pulse" />
          {backendConnected ? (
            <>
              <Server size={13} />
              <span>Backend Connected</span>
            </>
          ) : (
            <>
              <AlertCircle size={13} />
              <span>Backend Offline</span>
            </>
          )}
        </div>

        {/* Sync Button */}
        <button
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh task list from MongoDB"
        >
          <RefreshCw size={15} className={loading ? 'spinner' : ''} />
          <span>Sync</span>
        </button>

        {/* User Account / Auth Actions */}
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              background: '#f1f5f9',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'var(--text-main)'
            }}>
              <ShieldCheck size={14} color="#059669" />
              <span>{currentUser.name || currentUser.email.split('@')[0]}</span>
            </div>

            <button
              className="btn btn-secondary"
              onClick={onLogout}
              title="Sign Out"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            className="btn btn-secondary"
            onClick={onOpenAuth}
            title="Sign in or register for an account"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}

        {/* New Task Button */}
        <button
          className="btn btn-primary"
          onClick={onOpenNewTask}
          title="Create a new task in MongoDB"
        >
          <PlusCircle size={16} />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
}
