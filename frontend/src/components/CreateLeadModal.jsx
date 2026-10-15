import React, { useState } from 'react';
import { X, Plus, Sparkles, AlertCircle } from 'lucide-react';

export default function CreateLeadModal({ onClose, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    location: '',
    property_requirement: '',
    budget: '',
    buying_timeline: '',
    customer_message: '',
  });
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = formData.customer_name.trim();
    if (!trimmedName) {
      setError('Customer name is required.');
      return;
    }
    if (trimmedName.length > 255) {
      setError('Customer name must be 255 characters or less.');
      return;
    }
    if (formData.location && formData.location.trim().length > 255) {
      setError('Location must be 255 characters or less.');
      return;
    }
    if (formData.budget && formData.budget.trim().length > 100) {
      setError('Budget must be 100 characters or less.');
      return;
    }
    if (formData.buying_timeline && formData.buying_timeline.trim().length > 100) {
      setError('Buying timeline must be 100 characters or less.');
      return;
    }
    if (formData.property_requirement && formData.property_requirement.trim().length > 2000) {
      setError('Property requirements must be 2000 characters or less.');
      return;
    }
    if (formData.customer_message && formData.customer_message.trim().length > 5000) {
      setError('Customer message must be 5000 characters or less.');
      return;
    }

    setError('');

    const payload = {
      customer_name: trimmedName,
      location: formData.location.trim() || null,
      property_requirement: formData.property_requirement.trim() || null,
      budget: formData.budget.trim() || null,
      buying_timeline: formData.buying_timeline.trim() || null,
      customer_message: formData.customer_message.trim() || null,
    };

    try {
      await onSubmit(payload, autoAnalyze);
    } catch (err) {
      setError(err.message || 'Failed to save lead. Please try again.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div 
        className="modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
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
              flexShrink: 0,
              color: 'var(--color-accent)',
            }}>
              <Plus size={18} />
            </div>
            <div>
              <h3 id="modal-title" style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>Capture New Lead</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Enter inbound customer inquiry to qualify, prioritize and analyze.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-ghost btn-xs" 
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Close modal"
            style={{ padding: 6, color: 'var(--color-text-muted)' }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Form Container */}
        <form 
          className="modal-form" 
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          {/* Scrollable Form Body */}
          <div 
            className="modal-body" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 12,
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              padding: '20px 24px',
            }}
          >
            {error && (
              <div 
                role="alert"
                style={{
                  backgroundColor: 'var(--color-error-bg)',
                  border: '1px solid var(--color-error-border)',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-error-text)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="customer_name" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                Customer Full Name *
              </label>
              <input
                id="customer_name"
                type="text"
                name="customer_name"
                className="form-input"
                placeholder="e.g. Rohan Mehta"
                value={formData.customer_name}
                onChange={handleChange}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="location" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                  Preferred Location
                </label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  className="form-input"
                  placeholder="e.g. Koramangala, Bangalore"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="budget" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                  Budget Bracket
                </label>
                <input
                  id="budget"
                  type="text"
                  name="budget"
                  className="form-input"
                  placeholder="e.g. ₹1.5 - 2 Cr"
                  value={formData.budget}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="buying_timeline" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                Buying Timeline / Urgency
              </label>
              <input
                id="buying_timeline"
                type="text"
                name="buying_timeline"
                className="form-input"
                placeholder="e.g. Immediate (within 30 days) / 3 months / exploring"
                value={formData.buying_timeline}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="property_requirement" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                Property Requirements
              </label>
              <textarea
                id="property_requirement"
                name="property_requirement"
                className="form-textarea"
                rows={2}
                placeholder="e.g. 3 BHK east-facing high-rise apartment with 2 car parks and clubhouse amenities"
                value={formData.property_requirement}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="customer_message" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                Customer Inquiry / Raw Message
              </label>
              <textarea
                id="customer_message"
                name="customer_message"
                className="form-textarea"
                rows={3}
                placeholder="Paste original WhatsApp text, web form message, or email inquiry here..."
                value={formData.customer_message}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            {/* Auto-analyze Toggle */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingTop: 4,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
              onClick={() => {
                if (!isSubmitting) setAutoAnalyze(!autoAnalyze);
              }}
            >
              <input
                id="auto-analyze-checkbox"
                type="checkbox"
                checked={autoAnalyze}
                onChange={() => {}}
                disabled={isSubmitting}
                style={{ width: 14, height: 14, accentColor: 'var(--color-accent)', cursor: isSubmitting ? 'not-allowed' : 'pointer', flexShrink: 0 }}
              />
              <label htmlFor="auto-analyze-checkbox" style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={12} color="var(--color-accent)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Auto-run AI Lead Intelligence on Save
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  — scores priority, extracts objections on save
                </span>
              </label>
            </div>
          </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="modal-footer" style={{ flexShrink: 0 }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onClose} 
              disabled={isSubmitting}
              id="cancel-lead-btn"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary btn-sm" 
              disabled={isSubmitting || !formData.customer_name.trim()}
              id="save-lead-btn"
              data-testid="save-lead-btn"
              style={{ minWidth: 110, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                  <span>{autoAnalyze ? 'Saving & Analyzing...' : 'Saving Lead...'}</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Save Lead</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
