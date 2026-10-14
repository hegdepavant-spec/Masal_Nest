import React, { useState, useEffect } from 'react';
import { X, PhoneCall, Copy, Check, RefreshCw, Sparkles, FileText } from 'lucide-react';
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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PhoneCall size={18} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>
                Call Preparation Brief
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Target Lead: {lead.customer_name} · {lead.location || 'Location unspecified'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!loading && brief && (
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Brief'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <RefreshCw size={36} color="var(--brand-primary)" className="animate-spin" style={{ marginBottom: 16 }} />
              <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: 6 }}>
                Synthesizing Call Brief...
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Google ADK agent is formulating greeting, talking points, questions, and objection handling from lead records.
              </p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <p style={{ color: '#f43f5e', fontSize: '0.88rem', marginBottom: 12 }}>{error}</p>
              <button className="btn btn-secondary btn-sm" onClick={fetchBrief}>
                <RefreshCw size={14} /> Retry Generation
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(13, 18, 31, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 20,
              fontSize: '0.88rem',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-sans)',
            }}>
              {brief}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
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
