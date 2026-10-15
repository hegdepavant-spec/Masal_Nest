import React, { useState } from 'react';
import { X, CheckSquare, Calendar, Tag, FileText } from 'lucide-react';

export default function TaskModal({ lead, leads = [], onClose, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    lead_id: lead ? lead.id : leads[0]?.id || '',
    title: '',
    description: '',
    action_type: 'call',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting || !formData.title.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500 }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-accent-subtle)',
              border: '1px solid var(--color-accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}>
              <CheckSquare size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>Add Follow-up Task</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {lead ? `For: ${lead.customer_name}` : 'Assign actionable follow-up'}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 6, color: 'var(--color-text-muted)' }} aria-label="Close modal">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 24px' }}>
            {!lead && leads.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                  Select Lead *
                </label>
                <select
                  className="form-select"
                  value={formData.lead_id}
                  onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                  required
                  disabled={isSubmitting}
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.customer_name} ({l.priority_category || 'unscored'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                Task Title *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Call to confirm Saturday 11am site visit"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                  Action Type
                </label>
                <select
                  className="form-select"
                  value={formData.action_type}
                  onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                  disabled={isSubmitting}
                >
                  <option value="call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="site_visit">Site Visit / Tour</option>
                  <option value="document">Document / Pricing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                  Due Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                Notes / Context
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Specific talking points or preparation notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '12px 24px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
