import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ListTodo, Flame } from 'lucide-react';

export default function StatsBar({ tasks = [] }) {
  const total = tasks.length;
  const pending = tasks.filter(t => (t.status === 'pending' || (!t.status && !t.completed))).length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const completed = tasks.filter(t => (t.status === 'completed' || t.completed)).length;
  const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'completed' && !t.completed).length;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
          <ListTodo size={22} />
        </div>
        <div>
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total Loaded</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
          <Clock size={22} />
        </div>
        <div>
          <div className="stat-number">{pending}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
          <Clock size={22} />
        </div>
        <div>
          <div className="stat-number">{inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
          <CheckCircle2 size={22} />
        </div>
        <div>
          <div className="stat-number">{completed}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
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
