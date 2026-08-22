import React from 'react';
import { X, Code2, ExternalLink } from 'lucide-react';

export default function HateoasModal({ task, isOpen, onClose }) {
  if (!isOpen || !task) return null;

  const links = task._links || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Code2 size={20} color="#38bdf8" />
            <h3 className="modal-title">HATEOAS Hypermedia Inspector</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Real-time hypermedia controls provided by Express REST API for task <code>#{task._id?.slice(-6)}</code>:
        </p>

        <div style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Available Transition Links (_links):</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {Object.entries(links).map(([rel, linkObj]) => (
              <div
                key={rel}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '0.6rem 0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    background: linkObj.method === 'GET' ? 'rgba(16, 185, 129, 0.2)' :
                               linkObj.method === 'POST' ? 'rgba(59, 130, 246, 0.2)' :
                               linkObj.method === 'DELETE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: linkObj.method === 'GET' ? '#34d399' :
                           linkObj.method === 'POST' ? '#60a5fa' :
                           linkObj.method === 'DELETE' ? '#f87171' : '#fbbf24',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>
                    {linkObj.method}
                  </span>
                  <span style={{ color: '#e2e8f0', fontWeight: '600' }}>rel: "{rel}"</span>
                </div>
                <span style={{ color: '#94a3b8' }}>{linkObj.href}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Full MongoDB Document JSON:</label>
          <pre className="code-block">{JSON.stringify(task, null, 2)}</pre>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
