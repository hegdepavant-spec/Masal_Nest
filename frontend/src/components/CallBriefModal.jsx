import React, { useState, useEffect } from 'react';
import { X, PhoneCall, Copy, Check, RefreshCw } from 'lucide-react';
import { api } from '../api';

export default function CallBriefModal({ lead, onClose, showToast }) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const fetchBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.generateCallBrief(lead.id);
      setBrief(res.call_brief);
    } catch (err) {
      setError(err.message || 'Failed to generate call brief.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lead) {
      fetchBrief();
    }
  }, [lead?.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(brief);
    setCopied(true);
    if (showToast) showToast('Call brief copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!lead) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
            }}>
              <PhoneCall size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                Call Preparation Brief
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Target Lead: {lead.customer_name} · {lead.location || 'Location unspecified'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!loading && brief && (
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy Brief'}
              </button>
            )}
            <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 6, color: 'var(--color-text-muted)' }} aria-label="Close modal">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <RefreshCw size={28} color="var(--color-accent)" className="spinner" style={{ marginBottom: 12, width: 28, height: 28 }} />
              <h4 style={{ fontSize: '0.98rem', color: 'var(--color-text-primary)', marginBottom: 4, fontWeight: 600 }}>
                Synthesizing Call Brief...
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', maxWidth: 420, margin: '0 auto' }}>
                Formulating opening, qualification questions, objection handling, and next steps from grounded lead intelligence.
              </p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '24px 20px' }}>
              <p style={{ color: 'var(--color-error)', fontSize: '0.84rem', marginBottom: 10 }}>{error}</p>
              <button className="btn btn-secondary btn-sm" onClick={fetchBrief}>
                <RefreshCw size={13} /> Retry Generation
              </button>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              fontSize: '0.82rem',
              color: 'var(--color-text-primary)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-sans)',
            }}>
              {brief}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '12px 24px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchBrief} disabled={loading}>
            <RefreshCw size={13} />
            Regenerate
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
