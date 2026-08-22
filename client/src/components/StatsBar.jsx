import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ListTodo, Flame } from 'lucide-react';

export default function StatsBar({ tasks = [], activeFilter = '', onSelectFilter }) {
  const total = tasks.length;
  const pending = tasks.filter(t => (t.status === 'pending' || (!t.status && !t.completed))).length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const completed = tasks.filter(t => (t.status === 'completed' || t.completed)).length;
  const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'completed' && !t.completed).length;

  return (
    <div className="stats-grid">
      <div
        className={`stat-card ${activeFilter === '' ? 'active-filter' : ''}`}
        onClick={() => onSelectFilter && onSelectFilter('')}
        title="View All Tasks"
      >
        <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
          <ListTodo size={22} />
        </div>
        <div>
          <div className="stat-number">{total}</div>
          <div className="stat-label">All Tasks</div>
        </div>
      </div>

      <div
        className={`stat-card ${activeFilter === 'pending' ? 'active-filter' : ''}`}
        onClick={() => onSelectFilter && onSelectFilter('pending')}
        title="Filter by Pending Tasks"
      >
        <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
          <Clock size={22} />
        </div>
        <div>
          <div className="stat-number">{pending}</div>
          <div className="stat-label">To Do (Pending)</div>
        </div>
      </div>

      <div
        className={`stat-card ${activeFilter === 'in-progress' ? 'active-filter' : ''}`}
        onClick={() => onSelectFilter && onSelectFilter('in-progress')}
        title="Filter by In Progress Tasks"
      >
        <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
          <Clock size={22} />
        </div>
        <div>
          <div className="stat-number">{inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
      </div>

      <div
        className={`stat-card ${activeFilter === 'completed' ? 'active-filter' : ''}`}
        onClick={() => onSelectFilter && onSelectFilter('completed')}
        title="Filter by Completed Tasks"
      >
        <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
          <CheckCircle2 size={22} />
        </div>
        <div>
          <div className="stat-number">{completed}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div
        className={`stat-card ${activeFilter === 'high' ? 'active-filter' : ''}`}
        onClick={() => onSelectFilter && onSelectFilter(activeFilter === 'high' ? '' : 'high', 'priority')}
        title="Filter by High Priority Tasks"
      >
        <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
          <Flame size={22} />
        </div>
        <div>
          <div className="stat-number">{highPriority}</div>
          <div className="stat-label">Urgent (High)</div>
        </div>
      </div>
    </div>
  );
}
