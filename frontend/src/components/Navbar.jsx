import React from 'react';
import { Sparkles, Plus, CheckSquare, Layers, Flame } from 'lucide-react';

export default function Navbar({ onOpenCreateLead, onOpenTasks, activeTab, setActiveTab }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(7, 9, 14, 0.8)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1360,
        margin: '0 auto',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px var(--brand-glow)',
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                Masal<span style={{ color: 'var(--brand-primary)' }}>.ai</span>
              </span>
              <span style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-full)',
                padding: '2px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                Sales Copilot
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              AI-Powered Real-Estate Lead Prioritization
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(19, 27, 46, 0.6)',
          padding: 4,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          gap: 4,
        }}>
          <button
            className={`btn btn-sm ${activeTab === 'leads' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('leads')}
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <Layers size={15} />
            Leads Pipeline
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'tasks' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('tasks')}
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <CheckSquare size={15} />
            Follow-up Tasks
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            id="add-lead-btn"
            className="btn btn-primary"
            onClick={onOpenCreateLead}
          >
            <Plus size={16} />
            Capture New Lead
          </button>
        </div>
      </div>
    </header>
  );
}
