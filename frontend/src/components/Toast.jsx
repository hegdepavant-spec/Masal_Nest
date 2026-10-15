import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let toastClass = 'toast-success';
        let iconColor = 'var(--color-success)';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          toastClass = 'toast-error';
          iconColor = 'var(--color-error)';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          toastClass = 'toast-warning';
          iconColor = 'var(--color-warning)';
        } else if (toast.type === 'info') {
          Icon = Info;
          toastClass = 'toast-info';
          iconColor = 'var(--color-accent)';
        }

        return (
          <div key={toast.id} className={`toast ${toastClass}`}>
            <Icon size={16} color={iconColor} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, lineHeight: 1.4, fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
