import React, { useState } from 'react';
import { 
  X, Sparkles, PhoneCall, MessageSquare, CheckSquare, Copy, Check,
  AlertCircle, Clock, MapPin, IndianRupee, RefreshCw, Edit3, Save,
  CheckCircle2, ArrowRight, ShieldAlert, ListChecks, HelpCircle, FileText
} from 'lucide-react';

export default function LeadDetailModal({ 
  lead, 
  onClose, 
  onAnalyze, 
  isAnalyzing, 
  onOpenCallBrief, 
  onOpenLogInteraction,
  onOpenChat, 
  onUpdateLead, 
  onAddTask,
  onToggleTask,
  showToast 
}) {
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: lead.customer_name || '',
    location: lead.location || '',
    property_requirement: lead.property_requirement || '',
    budget: lead.budget || '',
    buying_timeline: lead.buying_timeline || '',
    customer_message: lead.customer_message || '',
    followup_status: lead.followup_status || 'new',
  });

  if (!lead) return null;

  const analysis = lead.latest_analysis;
  const category = (lead.priority_category || 'unscored').toLowerCase();

  const handleCopyDraft = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    if (showToast) showToast('Suggested response copied to clipboard!', 'success');
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handleSaveEdit = async () => {
    try {
      await onUpdateLead(lead.id, formData);
      setIsEditing(false);
      if (showToast) showToast('Lead updated successfully!', 'success');
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setFormData(prev => ({ ...prev, followup_status: newStatus }));
    try {
      await onUpdateLead(lead.id, { followup_status: newStatus });
      if (showToast) showToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 880, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--color-text-primary)', fontWeight: 700 }}>
                  {lead.customer_name}
                </h2>
                <select
                  value={formData.followup_status}
                  onChange={handleStatusChange}
                  className="form-select"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    width: 'auto',
                    borderRadius: 'var(--radius-sm)',
                    height: 28,
                  }}
                >
                  <option value="new">Status: New</option>
                  <option value="contacted">Status: Contacted</option>
                  <option value="in_progress">Status: In Progress</option>
                  <option value="closed_won">Status: Closed Won</option>
                  <option value="closed_lost">Status: Closed Lost</option>
                </select>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Created {new Date(lead.created_at).toLocaleDateString()} · ID: {lead.id.substring(0, 8)}...
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 size={13} />
              {isEditing ? 'Cancel Edit' : 'Edit Lead'}
            </button>
            <button 
              className="btn btn-ghost btn-xs" 
              onClick={onClose}
              style={{ padding: 6, color: 'var(--color-text-muted)' }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px' }}>
          {/* Edit Form or Information Grid */}
          {isEditing ? (
            <div style={{
              backgroundColor: 'var(--color-surface-subtle)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4, display: 'block' }}>Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4, display: 'block' }}>Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4, display: 'block' }}>Budget</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4, display: 'block' }}>Buying Timeline</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.buying_timeline}
                  onChange={(e) => setFormData({ ...formData, buying_timeline: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4, display: 'block' }}>Property Requirement</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formData.property_requirement}
                  onChange={(e) => setFormData({ ...formData, property_requirement: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4, display: 'block' }}>Customer Message</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formData.customer_message}
                  onChange={(e) => setFormData({ ...formData, customer_message: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                  <Save size={13} />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              backgroundColor: 'var(--color-surface-subtle)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Location</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', fontWeight: 600, marginTop: 2 }}>
                  {lead.location || 'Not specified'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Budget</span>
                <p className="tabular-nums" style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', fontWeight: 600, marginTop: 2 }}>
                  {lead.budget || 'Not specified'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Buying Timeline</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', fontWeight: 600, marginTop: 2 }}>
                  {lead.normalized_timeline || lead.buying_timeline || 'Not specified'}
                </p>
                {lead.normalized_timeline && lead.buying_timeline && lead.normalized_timeline !== lead.buying_timeline && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Customer stated: "{lead.buying_timeline}"
                  </p>
                )}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Requirement</span>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {lead.property_requirement || 'No detailed requirement provided'}
                </p>
              </div>
              {lead.customer_message && (
                <div style={{ gridColumn: '1 / -1', marginTop: 2 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Customer Message</span>
                  <p style={{ 
                    fontSize: '0.78rem', 
                    color: 'var(--color-text-secondary)', 
                    lineHeight: 1.45,
                    marginTop: 3,
                    borderLeft: '2px solid var(--color-border-strong)',
                    paddingLeft: 8,
                  }}>
                    "{lead.customer_message}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stale Warning Banner if updated */}
          {lead.analysis_stale && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-stale-bg)',
              border: '1px solid var(--color-stale-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color="var(--color-stale)" />
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-stale-text)', fontWeight: 600 }}>
                    Lead details have been modified since last analysis
                  </p>
                  <p style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                    Re-run analysis to recalculate priority score and refresh intelligence.
                  </p>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onAnalyze(lead.id)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <RefreshCw size={13} className="spinner" /> : <RefreshCw size={13} />}
                Re-analyze Now
              </button>
            </div>
          )}

          {/* Priority Score & Explainability Section */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: category === 'hot' ? 'var(--color-hot-bg)' : category === 'warm' ? 'var(--color-warm-bg)' : 'var(--color-cold-bg)',
                  border: `1px solid ${category === 'hot' ? 'var(--color-hot-border)' : category === 'warm' ? 'var(--color-warm-border)' : 'var(--color-cold-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: category === 'hot' ? 'var(--color-hot-text)' : category === 'warm' ? 'var(--color-warm-text)' : 'var(--color-cold-text)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {lead.priority_score ?? '—'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {lead.priority_score !== null ? `${lead.priority_category?.toUpperCase()} PRIORITY` : 'UNSCORED LEAD'}
                    </span>
                    {lead.analysis_stale && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: 'var(--color-stale-text)',
                        backgroundColor: 'var(--color-stale-bg)',
                        border: '1px solid var(--color-stale-border)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        Stale
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      (Qualification Scoring v{analysis?.scoring_version || '3.0.0'})
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Hot: ≥ 70 pts · Warm: 40-69 pts · Cold: &lt; 40 pts
                    {analysis?.created_at && (
                      <span style={{ marginLeft: 10, color: 'var(--color-text-muted)' }}>
                        · Analyzed {new Date(analysis.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onAnalyze(lead.id)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={13} className="spinner" />
                    Analyzing with ADK...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} color="var(--color-accent)" />
                    {analysis ? 'Re-run Analysis' : 'Run AI Analysis'}
                  </>
                )}
              </button>
            </div>

            {/* Separate Signals: Urgency & Qualification Activity */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              padding: '8px 12px',
              backgroundColor: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.74rem',
              marginBottom: 12,
            }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Decision Urgency:</strong> {lead.normalized_timeline || lead.buying_timeline || 'Undecided'}
              </span>
              <span style={{ color: 'var(--color-border-strong)' }}>•</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Evaluation:</strong> Intake Qualification (Objective Buying Potential)
              </span>
              {lead.tasks && lead.tasks.length > 0 && (
                <>
                  <span style={{ color: 'var(--color-border-strong)' }}>•</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    <strong style={{ color: 'var(--color-text-primary)' }}>CRM Tasks:</strong> {lead.tasks.length} active
                  </span>
                </>
              )}
            </div>

            {/* Score Explanation */}
            {analysis?.score_explanation && (
              <div style={{
                backgroundColor: 'var(--color-surface-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                borderLeft: `3px solid ${category === 'hot' ? 'var(--color-hot)' : category === 'warm' ? 'var(--color-warm)' : 'var(--color-cold)'}`,
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                marginBottom: 14,
              }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Scoring Explanation: </strong>
                {analysis.score_explanation}
              </div>
            )}

            {/* Structured Factor Breakdown */}
            {analysis?.score_breakdown?.factors?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    Deterministic Factor Breakdown
                  </span>
                  <span className="tabular-nums" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Total: {analysis.score_breakdown.total_score}/100 pts
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  backgroundColor: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                }}>
                  {analysis.score_breakdown.factors.map((item, idx) => {
                    const isPenalty = item.awarded_points < 0;
                    const maxPts = item.max_points;
                    const awarded = item.awarded_points;
                    const pct = maxPts > 0 ? Math.max(0, Math.min(100, (awarded / maxPts) * 100)) : 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.factor}
                          </span>
                          <span className="tabular-nums" style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isPenalty ? 'var(--color-error)' : awarded > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                          }}>
                            {isPenalty ? `${awarded} pts` : `${awarded} / ${maxPts} pts`}
                          </span>
                        </div>
                        {maxPts > 0 && (
                          <div style={{
                            width: '100%',
                            height: 4,
                            backgroundColor: 'var(--color-surface-subtle)',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: pct >= 70 ? 'var(--color-hot)' : pct >= 40 ? 'var(--color-warm)' : 'var(--color-accent)',
                              borderRadius: 2,
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          {item.evidence}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Missing Information for Qualification */}
                {analysis?.missing_info?.length > 0 && (
                  <div style={{
                    marginTop: 12,
                    backgroundColor: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                  }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: 'var(--color-warning-text)',
                      marginBottom: 6,
                    }}>
                      <HelpCircle size={14} /> Missing Information for Qualification
                    </span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                      Capturing this information during the next salesperson interaction will help refine lead priority and qualification:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {analysis.missing_info.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-warning-border)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            color: 'var(--color-warning-text)',
                          }}
                        >
                          • {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                  * Priority scoring is rule-based and deterministic. Scores indicate engagement urgency, not calibrated purchase probabilities.
                </p>
              </div>
            )}
          </div>

          {/* AI Structured Intelligence */}
          {analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Executive Summary & Intent */}
              <div style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Executive Lead Summary
                  </span>
                  {analysis.customer_intent && (
                    <span style={{
                      backgroundColor: 'var(--color-accent-subtle)',
                      color: 'var(--color-accent-text)',
                      border: '1px solid var(--color-accent-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}>
                      Intent: {analysis.customer_intent}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                  {analysis.summary}
                </p>
              </div>

              {/* Requirements & Inferences */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Key Requirements */}
                <div style={{
                  backgroundColor: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                    <CheckCircle2 size={14} color="var(--color-success)" /> Explicit Stated Requirements
                  </span>
                  {analysis.key_requirements?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {analysis.key_requirements.map((req, idx) => (
                        <li key={idx} style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--color-success)' }}>•</span> {req}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>None explicitly stated</p>
                  )}
                </div>

                {/* Inferred Requirements */}
                <div style={{
                  backgroundColor: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                    <Sparkles size={14} color="var(--color-accent)" /> Inferred Intelligence
                  </span>
                  {analysis.inferred_requirements?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {analysis.inferred_requirements.map((inf, idx) => (
                        <li key={idx} style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--color-accent)' }}>•</span> {inf}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>No additional inferences</p>
                  )}
                </div>
              </div>

              {/* Hard Delivery Constraints */}
              {((analysis.hard_constraints && analysis.hard_constraints.length > 0) || (analysis.score_breakdown?.timeline_info?.hard_constraints && analysis.score_breakdown.timeline_info.hard_constraints.length > 0)) && (
                <div style={{
                  backgroundColor: 'var(--color-warning-bg)',
                  border: '1px solid var(--color-warning-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-warning-text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    <ShieldAlert size={14} color="var(--color-warning)" /> Hard Delivery & Possession Constraints
                  </span>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(analysis.hard_constraints || analysis.score_breakdown?.timeline_info?.hard_constraints).map((hc, idx) => (
                      <li key={idx} style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>•</span> {hc}
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 6, fontStyle: 'italic' }}>
                    * Non-negotiable constraint: candidate properties exceeding this handover timeline violate customer requirements.
                  </p>
                </div>
              )}

              {/* Objections & Missing Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{
                  backgroundColor: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                    <ShieldAlert size={14} color="var(--color-error)" /> Objections / Potential Blockers
                  </span>
                  {analysis.objections?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {analysis.objections.map((obj, idx) => (
                        <li key={idx} style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--color-error)' }}>!</span> {obj}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>No blockers identified</p>
                  )}
                </div>

                <div style={{
                  backgroundColor: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                    <HelpCircle size={14} color="var(--color-warning)" /> Missing Qualification Info
                  </span>
                  {analysis.missing_info?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {analysis.missing_info.map((info, idx) => (
                        <li key={idx} style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--color-warning)' }}>?</span> {info}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>All essential criteria provided</p>
                  )}
                </div>
              </div>

              {/* Recommended Action */}
              {analysis.recommended_action && (
                <div style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  border: '1px solid var(--color-accent-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ArrowRight size={14} color="#fff" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-accent-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Recommended Next Action
                    </span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', fontWeight: 600, marginTop: 2 }}>
                      {analysis.recommended_action}
                    </p>
                  </div>
                </div>
              )}

              {/* Suggested Personalized Response Draft */}
              {analysis.suggested_response && (
                <div style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Suggested Response Draft
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopyDraft(analysis.suggested_response)}
                    >
                      {copiedDraft ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                      {copiedDraft ? 'Copied!' : 'Copy Draft'}
                    </button>
                  </div>
                  <p style={{ 
                    fontSize: '0.82rem', 
                    color: 'var(--color-text-primary)', 
                    lineHeight: 1.5,
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {analysis.suggested_response}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Empty state for unscored lead */
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              backgroundColor: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border-strong)',
            }}>
              <Sparkles size={32} color="var(--color-accent)" style={{ marginBottom: 10 }} />
              <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: 4 }}>
                AI Lead Intelligence Ready
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', maxWidth: 440, margin: '0 auto 14px' }}>
                Run analysis using Google ADK & Groq to calculate deterministic priority score, extract structured requirements, identify objections, and generate response drafts.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onAnalyze(lead.id)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <RefreshCw size={13} className="spinner" /> : <Sparkles size={13} />}
                Analyze Lead Now
              </button>
            </div>
          )}

          {/* Follow-up Tasks Section */}
          <div style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckSquare size={15} color="var(--color-accent)" />
                Follow-up Tasks ({lead.tasks?.length || 0})
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onAddTask(lead)}
              >
                + Add Task
              </button>
            </div>

            {lead.tasks?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lead.tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-surface-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => onToggleTask(task)}
                        style={{ cursor: 'pointer', width: 15, height: 15, accentColor: 'var(--color-accent)' }}
                      />
                      <div>
                        <p style={{
                          fontSize: '0.8rem',
                          color: task.status === 'completed' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          fontWeight: 500,
                        }}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-muted)',
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)'
                      }}>
                        {task.action_type}
                      </span>
                      {task.due_date && (
                        <span className="tabular-nums" style={{
                          fontSize: '0.72rem',
                          color: new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'var(--color-error)' : 'var(--color-text-muted)'
                        }}>
                          Due {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                No active follow-up tasks for this lead.
              </p>
            )}
          </div>
        </div>

        {/* Footer with LeadPilot, Call Brief & Log Interaction Actions */}
        <div className="modal-footer" style={{ padding: '12px 24px', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenCallBrief(lead)}
            >
              <PhoneCall size={13} color="var(--color-success)" />
              Prepare for Call
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenLogInteraction && onOpenLogInteraction(lead)}
            >
              <FileText size={13} color="var(--color-accent)" />
              Log Interaction
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onOpenChat(lead)}
            >
              <MessageSquare size={13} />
              LeadPilot Chat
            </button>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
