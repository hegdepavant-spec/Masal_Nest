import React from 'react';
import { Building2, Layers, CheckSquare, TrendingUp, Plus } from 'lucide-react';

export default function Navbar({ onOpenCreateLead, activeTab, setActiveTab }) {
  const tabs = [
    { id: 'leads',    label: 'Leads',    icon: Layers },
    { id: 'tasks',    label: 'Tasks',    icon: CheckSquare },
    { id: 'insights', label: 'Market Insights', icon: TrendingUp },
  ];

  return (
    <header style={{
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
          }}>
            <Building2 size={17} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>MasalNest</span>
              <span style={{
                backgroundColor: 'var(--color-accent-subtle)',
                color: 'var(--color-accent-text)',
                border: '1px solid var(--color-accent-border)',
                borderRadius: 'var(--radius-full)',
                padding: '1px 6px',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                LeadPilot
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1, marginTop: 2 }}>
              AI-Powered Real Estate Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flex: 1,
          justifyContent: 'center',
        }}>
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--color-border)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'var(--color-surface-hover)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={15} color={isActive ? 'var(--color-accent)' : 'var(--color-text-muted)'} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            id="add-lead-btn"
            className="btn btn-primary btn-sm"
            onClick={onOpenCreateLead}
          >
            <Plus size={14} />
            New Lead
          </button>
        </div>
      </div>
    </header>
  );
}
