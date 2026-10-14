import React from 'react';
import { Flame, Zap, Snowflake, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

export default function DashboardMetrics({ metrics, onFilterPriority, selectedPriority }) {
  if (!metrics) return null;

  const items = [
    {
      id: 'all',
      title: 'Total Leads',
      value: metrics.total_leads,
      icon: Users,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.1)',
      border: 'rgba(99, 102, 241, 0.25)',
      description: 'Active pipeline leads',
    },
    {
      id: 'hot',
      title: 'Hot Leads',
      value: metrics.hot_leads,
      icon: Flame,
      color: '#f43f5e',
      bg: 'var(--color-hot-bg)',
      border: 'var(--color-hot-border)',
      glow: 'var(--color-hot-glow)',
      description: 'Score ≥ 70 · Urgent intent',
    },
    {
      id: 'warm',
      title: 'Warm Leads',
      value: metrics.warm_leads,
      icon: Zap,
      color: '#f59e0b',
      bg: 'var(--color-warm-bg)',
      border: 'var(--color-warm-border)',
      glow: 'var(--color-warm-glow)',
      description: 'Score 40-69 · Nurturing needed',
    },
    {
      id: 'cold',
      title: 'Cold / Unscored',
      value: metrics.cold_leads + metrics.unscored_leads,
      icon: Snowflake,
      color: '#06b6d4',
      bg: 'var(--color-cold-bg)',
      border: 'var(--color-cold-border)',
      glow: 'var(--color-cold-glow)',
      description: 'Score < 40 · Needs discovery',
    },
    {
      id: 'tasks-pending',
      title: 'Pending Tasks',
      value: metrics.pending_tasks,
      icon: CheckCircle2,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.1)',
      border: 'rgba(56, 189, 248, 0.25)',
      description: 'Calls, visits, follow-ups',
      nonFilterable: true,
    },
    {
      id: 'tasks-overdue',
      title: 'Overdue Tasks',
      value: metrics.overdue_tasks,
      icon: AlertTriangle,
      color: metrics.overdue_tasks > 0 ? '#ef4444' : '#10b981',
      bg: metrics.overdue_tasks > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.1)',
      border: metrics.overdue_tasks > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.25)',
      description: metrics.overdue_tasks > 0 ? 'Requires immediate action' : 'All tasks on schedule',
      nonFilterable: true,
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      gap: 14,
      marginBottom: 24,
    }}>
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedPriority === item.id;
        const isClickable = !item.nonFilterable;

        return (
          <div
            key={item.id}
            onClick={() => isClickable && onFilterPriority(isSelected ? 'all' : item.id)}
            className="card"
            style={{
              padding: '16px 18px',
              cursor: isClickable ? 'pointer' : 'default',
              borderColor: isSelected ? item.color : 'var(--border-subtle)',
              boxShadow: isSelected ? `0 0 20px ${item.glow || 'rgba(99, 102, 241, 0.3)'}` : undefined,
              position: 'relative',
              overflow: 'hidden',
              transform: isSelected ? 'scale(1.02)' : undefined,
            }}
          >
            {/* Ambient Background Accent */}
            <div style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: item.bg,
              filter: 'blur(24px)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {item.title}
              </span>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: item.bg,
                border: `1px solid ${item.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: item.color,
              }}>
                <Icon size={17} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
                {item.value}
              </span>
              {isSelected && (
                <span style={{ fontSize: '0.7rem', color: item.color, fontWeight: 700 }}>
                  Active Filter
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
