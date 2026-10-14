import React, { useState } from 'react';
import { X, Plus, Sparkles, MapPin, IndianRupee, Clock, FileText, User } from 'lucide-react';

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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }
    setError('');
    onSubmit(formData, autoAnalyze);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 620 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Plus size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Capture New Lead</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Enter inbound customer information to prioritize & analyze.
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                color: '#fda4af',
                fontSize: '0.82rem',
              }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Customer Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="customer_name"
                  className="input"
                  placeholder="e.g. Rohan Mehta"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Preferred Location
                </label>
                <input
                  type="text"
                  name="location"
                  className="input"
                  placeholder="e.g. Koramangala, Bangalore"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Budget Bracket
                </label>
                <input
                  type="text"
                  name="budget"
                  className="input"
                  placeholder="e.g. ₹1.5 - 2 Cr"
                  value={formData.budget}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Buying Timeline / Urgency
              </label>
              <input
                type="text"
                name="buying_timeline"
                className="input"
                placeholder="e.g. Immediate (within 30 days) / 3 months / exploring"
                value={formData.buying_timeline}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Property Requirements
              </label>
              <textarea
                name="property_requirement"
                className="textarea"
                rows={2}
                placeholder="e.g. 3 BHK east-facing high-rise apartment with 2 car parks and clubhouse amenities"
                value={formData.property_requirement}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Customer Inquiry / Raw Message
              </label>
              <textarea
                name="customer_message"
                className="textarea"
                rows={3}
                placeholder="Paste original WhatsApp text, web form message, or email inquiry here..."
                value={formData.customer_message}
                onChange={handleChange}
              />
            </div>

            {/* Auto-analyze Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
            onClick={() => setAutoAnalyze(!autoAnalyze)}
            >
              <input
                type="checkbox"
                checked={autoAnalyze}
                onChange={() => {}}
                style={{ width: 16, height: 16, accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="var(--brand-primary)" />
                  Auto-run AI Lead Intelligence on Save
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Immediately scores priority, extracts objections, and generates initial response draft.
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving & Analyzing...' : 'Save & Prioritize Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
