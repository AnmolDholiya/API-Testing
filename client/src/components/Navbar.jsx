import React from 'react';
import { Layers, RefreshCw, CheckCircle2, AlertCircle, Database, Server } from 'lucide-react';

export default function Navbar({ backendConnected, onRefresh, loading }) {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-icon">
          <Layers size={26} />
        </div>
        <div className="brand-info">
          <h1>Full-Stack Task Manager</h1>
          <p>Practical 6 • React 18 + Node/Express + MongoDB Mongoose</p>
        </div>
      </div>

      <div className="nav-actions">
        <div
          className={`badge ${backendConnected ? 'badge-connected' : 'badge-disconnected'}`}
          title={backendConnected ? 'Connected to http://localhost:5000' : 'Disconnected from backend'}
        >
          <span className="badge-pulse" />
          {backendConnected ? (
            <>
              <Server size={13} />
              <span>Backend Connected (Port 5000)</span>
            </>
          ) : (
            <>
              <AlertCircle size={13} />
              <span>Backend Offline</span>
            </>
          )}
        </div>

        <button
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh task list from MongoDB"
        >
          <RefreshCw size={15} className={loading ? 'spinner' : ''} />
          <span>Sync Data</span>
        </button>
      </div>
    </header>
  );
}
