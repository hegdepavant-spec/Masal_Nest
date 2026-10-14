import React, { useState } from 'react';
import { 
  X, Sparkles, PhoneCall, MessageSquare, CheckSquare, Copy, Check,
  AlertCircle, Clock, MapPin, IndianRupee, RefreshCw, Edit3, Save,
  CheckCircle2, ArrowRight, ShieldAlert, ListChecks, HelpCircle
} from 'lucide-react';

export default function LeadDetailModal({ 
  lead, 
  onClose, 
  onAnalyze, 
  isAnalyzing, 
  onOpenCallBrief, 
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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 860, maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: '1.35rem', color: '#fff' }}>
                  {lead.customer_name}
                </h2>
                <select
                  value={formData.followup_status}
                  onChange={handleStatusChange}
                  className="select"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    width: 'auto',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <option value="new">Status: New</option>
                  <option value="contacted">Status: Contacted</option>
                  <option value="in_progress">Status: In Progress</option>
                  <option value="closed_won">Status: Closed Won</option>
                  <option value="closed_lost">Status: Closed Lost</option>
                </select>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Created {new Date(lead.created_at).toLocaleDateString()} · ID: {lead.id.substring(0, 8)}...
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 size={14} />
              {isEditing ? 'Cancel Edit' : 'Edit Lead'}
            </button>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={onClose}
              style={{ padding: 6 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Edit Form or Information Grid */}
          {isEditing ? (
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-active)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location</label>
                <input
                  type="text"
                  className="input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Budget</label>
                <input
                  type="text"
                  className="input"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buying Timeline</label>
                <input
                  type="text"
                  className="input"
                  value={formData.buying_timeline}
                  onChange={(e) => setFormData({ ...formData, buying_timeline: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Property Requirement</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={formData.property_requirement}
                  onChange={(e) => setFormData({ ...formData, property_requirement: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Message</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={formData.customer_message}
                  onChange={(e) => setFormData({ ...formData, customer_message: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              background: 'rgba(255, 255, 255, 0.02)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location</span>
                <p style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600, marginTop: 2 }}>
                  {lead.location || 'Not specified'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Budget</span>
                <p style={{ fontSize: '0.88rem', color: '#10b981', fontWeight: 600, marginTop: 2 }}>
                  {lead.budget || 'Not specified'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Buying Timeline</span>
                <p style={{ fontSize: '0.88rem', color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>
                  {lead.buying_timeline || 'Not specified'}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Requirement</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {lead.property_requirement || 'No detailed requirement provided'}
                </p>
              </div>
              {lead.customer_message && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer Message</span>
                  <p style={{ 
                    fontSize: '0.82rem', 
                    color: 'var(--text-muted)', 
                    fontStyle: 'italic', 
                    marginTop: 2,
                    background: 'rgba(0,0,0,0.2)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)'
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
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color="#f59e0b" />
                <div>
                  <p style={{ fontSize: '0.82rem', color: '#fde68a', fontWeight: 600 }}>
                    Lead details have been modified since last analysis
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Re-run analysis to recalculate priority score and refresh intelligence.
                  </p>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onAnalyze(lead.id)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Re-analyze Now
              </button>
            </div>
          )}

          {/* Priority Score & Explainability Section */}
          <div style={{
            background: 'rgba(19, 27, 46, 0.9)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: category === 'hot' ? 'var(--color-hot-bg)' : category === 'warm' ? 'var(--color-warm-bg)' : 'var(--color-cold-bg)',
                  border: `2px solid ${category === 'hot' ? 'var(--color-hot)' : category === 'warm' ? 'var(--color-warm)' : 'var(--color-cold)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#fff',
                  boxShadow: `0 0 16px ${category === 'hot' ? 'var(--color-hot-glow)' : category === 'warm' ? 'var(--color-warm-glow)' : 'var(--color-cold-glow)'}`,
                }}>
                  {lead.priority_score ?? '—'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                      {lead.priority_score !== null ? `${lead.priority_category?.toUpperCase()} PRIORITY` : 'UNSCORED LEAD'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      (Deterministic 0-100 Framework)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Hot: ≥ 70 pts · Warm: 40-69 pts · Cold: &lt; 40 pts
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
                    <RefreshCw size={14} className="animate-spin" />
                    Analyzing with ADK...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} color="var(--brand-primary)" />
                    {analysis ? 'Re-run Analysis' : 'Run AI Analysis'}
                  </>
                )}
              </button>
            </div>

            {/* Score Explanation */}
            {analysis?.score_explanation && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                borderLeft: `3px solid ${category === 'hot' ? 'var(--color-hot)' : category === 'warm' ? 'var(--color-warm)' : 'var(--color-cold)'}`,
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                <strong style={{ color: '#fff' }}>Scoring Explanation: </strong>
                {analysis.score_explanation}
              </div>
            )}
          </div>

          {/* AI Structured Intelligence */}
          {analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Executive Summary & Intent */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Executive Lead Summary
                  </span>
                  {analysis.customer_intent && (
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
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
                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {analysis.summary}
                </p>
              </div>

              {/* Requirements & Inferences */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Key Requirements */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 700, color: '#6ee7b7', marginBottom: 8 }}>
                    <CheckCircle2 size={14} /> Explicit Stated Requirements
                  </span>
                  {analysis.key_requirements?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {analysis.key_requirements.map((req, idx) => (
                        <li key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#10b981' }}>•</span> {req}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None explicitly stated</p>
                  )}
                </div>

                {/* Inferred Requirements */}
                <div style={{
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 700, color: '#d8b4fe', marginBottom: 8 }}>
                    <Sparkles size={14} /> Inferred Intelligence
                  </span>
                  {analysis.inferred_requirements?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {analysis.inferred_requirements.map((inf, idx) => (
                        <li key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#a855f7' }}>•</span> {inf}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No additional inferences</p>
                  )}
                </div>
              </div>

              {/* Objections & Missing Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Objections */}
                <div style={{
                  background: 'rgba(244, 63, 94, 0.05)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 700, color: '#fda4af', marginBottom: 8 }}>
                    <ShieldAlert size={14} /> Objections / Potential Blockers
                  </span>
                  {analysis.objections?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {analysis.objections.map((obj, idx) => (
                        <li key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#f43f5e' }}>!</span> {obj}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No blockers identified</p>
                  )}
                </div>

                {/* Missing Info Checklist */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 700, color: '#fde68a', marginBottom: 8 }}>
                    <HelpCircle size={14} /> Missing Qualification Info
                  </span>
                  {analysis.missing_info?.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {analysis.missing_info.map((info, idx) => (
                        <li key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#f59e0b' }}>?</span> {info}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All essential criteria provided</p>
                  )}
                </div>
              </div>

              {/* Recommended Action */}
              {analysis.recommended_action && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--brand-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ArrowRight size={16} color="#fff" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' }}>
                      Recommended Next Action
                    </span>
                    <p style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600, marginTop: 2 }}>
                      {analysis.recommended_action}
                    </p>
                  </div>
                </div>
              )}

              {/* Suggested Personalized Response Draft */}
              {analysis.suggested_response && (
                <div style={{
                  background: 'rgba(13, 18, 31, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Suggested Response Draft
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopyDraft(analysis.suggested_response)}
                    >
                      {copiedDraft ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      {copiedDraft ? 'Copied!' : 'Copy Draft'}
                    </button>
                  </div>
                  <p style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-primary)', 
                    lineHeight: 1.5,
                    background: 'rgba(0,0,0,0.3)',
                    padding: 12,
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
              padding: '40px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-subtle)',
            }}>
              <Sparkles size={36} color="var(--brand-primary)" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: 6 }}>
                AI Lead Intelligence Ready
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 16px' }}>
                Run analysis using Google ADK & Groq to calculate deterministic priority score, extract structured requirements, identify objections, and generate response drafts.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => onAnalyze(lead.id)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Analyze Lead Now
              </button>
            </div>
          )}

          {/* Follow-up Tasks Section */}
          <div style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckSquare size={16} color="var(--brand-primary)" />
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lead.tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => onToggleTask(task)}
                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--brand-primary)' }}
                      />
                      <div>
                        <p style={{
                          fontSize: '0.84rem',
                          color: task.status === 'completed' ? 'var(--text-muted)' : '#fff',
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          fontWeight: 500,
                        }}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        {task.action_type}
                      </span>
                      {task.due_date && (
                        <span style={{
                          fontSize: '0.72rem',
                          color: new Date(task.due_date) < new Date() && task.status !== 'completed' ? '#f43f5e' : 'var(--text-secondary)'
                        }}>
                          Due {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                No active follow-up tasks for this lead.
              </p>
            )}
          </div>
        </div>

        {/* Footer with Copilot & Call Brief Actions */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={() => onOpenCallBrief(lead)}
            >
              <PhoneCall size={15} color="#10b981" />
              Prepare Call Brief
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onOpenChat(lead)}
            >
              <MessageSquare size={15} />
              Open Copilot Chat
            </button>
          </div>

          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
