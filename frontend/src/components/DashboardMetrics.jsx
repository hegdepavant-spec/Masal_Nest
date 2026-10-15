import React from 'react';
import { Flame, Zap, Snowflake, CheckCircle2, AlertTriangle, Users, Clock, Calendar } from 'lucide-react';

export default function DashboardMetrics({ metrics, onFilterPriority, selectedPriority, tasksOnly = false }) {
  if (!metrics) return null;

  const items = [
    {
      id: 'all',
      title: 'Total Leads',
      value: metrics.total_leads,
      icon: Users,
      color: 'var(--color-accent)',
      bg: 'var(--color-accent-subtle)',
      border: 'var(--color-accent-border)',
      description: 'Active pipeline leads',
    },
    {
      id: 'hot',
      title: 'Hot Leads',
      value: metrics.hot_leads,
      icon: Flame,
      color: 'var(--color-hot)',
      bg: 'var(--color-hot-bg)',
      border: 'var(--color-hot-border)',
      description: 'Score ≥ 70 · Urgent intent',
    },
    {
      id: 'warm',
      title: 'Warm Leads',
      value: metrics.warm_leads,
      icon: Zap,
      color: 'var(--color-warm)',
      bg: 'var(--color-warm-bg)',
      border: 'var(--color-warm-border)',
      description: 'Score 40-69 · Nurturing needed',
    },
    {
      id: 'cold',
      title: 'Cold / Unscored',
      value: metrics.cold_leads + metrics.unscored_leads,
      icon: Snowflake,
      color: 'var(--color-cold)',
      bg: 'var(--color-cold-bg)',
      border: 'var(--color-cold-border)',
      description: 'Score < 40 · Needs discovery',
    },
    {
      id: 'tasks-pending',
      title: 'Pending Tasks',
      value: metrics.pending_tasks,
      icon: Clock,
      color: 'var(--color-accent)',
      bg: 'var(--color-accent-subtle)',
      border: 'var(--color-accent-border)',
      description: 'Calls, visits, follow-ups',
      nonFilterable: true,
    },
    {
      id: 'tasks-due-today',
      title: 'Due Today',
      value: metrics.due_today_tasks ?? 0,
      icon: Calendar,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
      border: 'var(--color-warning-border)',
      description: 'Scheduled for today',
      nonFilterable: true,
    },
    {
      id: 'tasks-overdue',
      title: 'Overdue Tasks',
      value: metrics.overdue_tasks,
      icon: AlertTriangle,
      color: metrics.overdue_tasks > 0 ? 'var(--color-error)' : 'var(--color-success)',
      bg: metrics.overdue_tasks > 0 ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
      border: metrics.overdue_tasks > 0 ? 'var(--color-error-border)' : 'var(--color-success-border)',
      description: metrics.overdue_tasks > 0 ? 'Requires immediate action' : 'All tasks on schedule',
      nonFilterable: true,
    },
    {
      id: 'tasks-completed',
      title: 'Completed',
      value: metrics.completed_tasks ?? 0,
      icon: CheckCircle2,
      color: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
      border: 'var(--color-success-border)',
      description: 'Accomplished tasks',
      nonFilterable: true,
    },
  ];

  const displayedItems = tasksOnly
    ? items.filter((item) => item.id.startsWith('tasks-'))
    : items;

  return (
    <div className="metrics-grid">
      {displayedItems.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedPriority === item.id;
        const isClickable = !item.nonFilterable;

        return (
          <div
            key={item.id}
            onClick={() => isClickable && onFilterPriority(isSelected ? 'all' : item.id)}
            style={{
              padding: '10px 12px',
              cursor: isClickable ? 'pointer' : 'default',
              borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
              backgroundColor: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 'var(--radius-sm)',
              boxShadow: isSelected ? '0 0 0 1px var(--color-accent)' : 'var(--shadow-xs)',
              transition: 'all var(--transition-fast)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {item.title}
              </span>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: 'var(--radius-xs)',
                backgroundColor: item.bg,
                border: `1px solid ${item.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: item.color,
                flexShrink: 0,
              }}>
                <Icon size={12} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}>
                {item.value}
              </span>
              {isSelected && (
                <span style={{
                  fontSize: '0.6rem',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  Active
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', lineHeight: 1.3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
