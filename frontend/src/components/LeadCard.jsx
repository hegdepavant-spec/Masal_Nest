import React, { useState } from 'react';
import { 
  Flame, Zap, Snowflake, MapPin, IndianRupee, Clock, 
  MessageSquare, Sparkles, RefreshCw, ChevronRight, AlertCircle, HelpCircle
} from 'lucide-react';

export default function LeadCard({ lead, onSelect, onOpenChat, onAnalyze, analyzingId }) {
  const [showExplainer, setShowExplainer] = useState(false);
  const isAnalyzing = analyzingId === lead.id;

  // Determine badge styling & semantic colors
  const category = (lead.priority_category || 'unscored').toLowerCase();
  let badgeClass = 'badge-unscored';
  let CategoryIcon = Snowflake;
  let scoreColor = 'var(--color-cold)';

  if (category === 'hot') {
    badgeClass = 'badge-hot';
    CategoryIcon = Flame;
    scoreColor = 'var(--color-hot)';
  } else if (category === 'warm') {
    badgeClass = 'badge-warm';
    CategoryIcon = Zap;
    scoreColor = 'var(--color-warm)';
  } else if (category === 'cold') {
    badgeClass = 'badge-cold';
    CategoryIcon = Snowflake;
    scoreColor = 'var(--color-cold)';
  }

  const statusClass = `status-${lead.followup_status || 'new'}`;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        position: 'relative',
        boxShadow: 'var(--shadow-xs)',
        transition: 'all var(--transition-fast)',
      }}
    >
      <div>
        {/* Top Row: Name, Status & Score */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <h3 
                onClick={() => onSelect(lead)}
                style={{ 
                  fontSize: '0.98rem', 
                  fontWeight: 600,
                  color: 'var(--color-text-primary)', 
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={lead.customer_name}
              >
                {lead.customer_name}
              </h3>
              <span className={`badge-status ${statusClass}`}>
                {lead.followup_status?.replace('_', ' ')}
              </span>
            </div>

            {lead.location && (
              <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                <MapPin size={13} color="var(--color-text-muted)" />
                {lead.location}
              </p>
            )}
          </div>

          {/* Score & Priority Display */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {lead.analysis_stale && (
                <span
                  title="Lead details were updated since last analysis. Score may be outdated."
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'var(--color-stale-text)',
                    backgroundColor: 'var(--color-stale-bg)',
                    border: '1px solid var(--color-stale-border)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Stale
                </span>
              )}
              <div className={`badge ${badgeClass}`}>
                <CategoryIcon size={12} />
                <span className="tabular-nums">
                  {lead.priority_score !== null ? `${lead.priority_score} pts` : 'Unscored'}
                </span>
              </div>
            </div>
            {lead.priority_category && (
              <span style={{ fontSize: '0.68rem', color: scoreColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {lead.priority_category} Lead
              </span>
            )}
            {lead.priority_score !== null && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExplainer(!showExplainer);
                }}
                title="View deterministic score factor breakdown"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 0',
                  fontSize: '0.7rem',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 500,
                }}
              >
                <HelpCircle size={11} />
                {showExplainer ? 'Hide breakdown' : 'Why this score?'}
              </button>
            )}
          </div>
        </div>

        {/* Stale Warning Banner if analysis is stale */}
        {lead.analysis_stale && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderLeft: '2px solid var(--color-stale)',
            paddingLeft: 8,
            fontSize: '0.72rem',
            color: 'var(--color-stale-text)',
            marginBottom: 10,
          }}>
            <AlertCircle size={12} color="var(--color-stale)" style={{ flexShrink: 0 }} />
            <span>Lead details updated · Re-analysis recommended</span>
          </div>
        )}

        {/* Requirements Snippet */}
        {lead.property_requirement && (
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            marginBottom: 12,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {lead.property_requirement}
          </p>
        )}

        {/* Metadata Badges: Budget & Timeline */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {lead.budget && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px 8px',
              color: 'var(--color-text-primary)',
            }}>
              <IndianRupee size={12} color="var(--color-text-secondary)" />
              <span className="tabular-nums">{lead.budget}</span>
            </span>
          )}

          {(lead.normalized_timeline || lead.buying_timeline) && (
            <span
              title={lead.normalized_timeline && lead.buying_timeline && lead.normalized_timeline !== lead.buying_timeline ? `Stated: ${lead.buying_timeline}` : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                color: 'var(--color-text-primary)',
              }}
            >
              <Clock size={12} color="var(--color-text-secondary)" />
              {lead.normalized_timeline || lead.buying_timeline}
            </span>
          )}
        </div>

        {/* Compact 'Why this score?' Panel */}
        {showExplainer && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Header: Score + Classification + Version */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CategoryIcon size={13} color={scoreColor} />
                <span className="tabular-nums">{lead.priority_score}</span>/100 · {lead.priority_category?.toUpperCase()}
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-surface)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-border)',
              }}>
                v{lead.latest_analysis?.scoring_version || '3.0.0'} (Qualification Model)
              </span>
            </div>

            {/* Separate Signals: Urgency & Qualification Mode */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-xs)',
              padding: '4px 8px',
              fontSize: '0.7rem',
              color: 'var(--color-text-secondary)',
              marginBottom: 8,
            }}>
              <span><strong style={{ color: 'var(--color-text-primary)' }}>Urgency:</strong> {lead.normalized_timeline || lead.buying_timeline || 'Undecided'}</span>
              <span><strong style={{ color: 'var(--color-text-primary)' }}>Mode:</strong> Intake Qualification</span>
            </div>

            {/* Stale Warning Banner inside explainer */}
            {lead.analysis_stale && (
              <div style={{
                backgroundColor: 'var(--color-stale-bg)',
                border: '1px solid var(--color-stale-border)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 8px',
                color: 'var(--color-stale-text)',
                fontSize: '0.7rem',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <AlertCircle size={12} color="var(--color-stale)" style={{ flexShrink: 0 }} />
                <span>Score is STALE (Outdated): Details changed since scoring. Re-analyze to refresh.</span>
              </div>
            )}

            {/* Factors breakdown */}
            {lead.latest_analysis?.score_breakdown?.factors?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                {lead.latest_analysis.score_breakdown.factors.map((f, i) => {
                  const isPenalty = f.awarded_points < 0;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                          {f.factor}
                        </span>
                        <span className="tabular-nums" style={{
                          fontWeight: 600,
                          color: isPenalty ? 'var(--color-error)' : f.awarded_points > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        }}>
                          {isPenalty ? `${f.awarded_points} pts` : `${f.awarded_points} / ${f.max_points}`}
                        </span>
                      </div>
                      {f.evidence && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', lineHeight: 1.25 }}>
                          {f.evidence}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginBottom: 6 }}>
                Full breakdown available in lead details.
              </p>
            )}

            {/* Score Explanation */}
            {lead.latest_analysis?.score_explanation && (
              <div style={{
                marginTop: 6,
                padding: '6px 8px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.7rem',
                lineHeight: 1.35,
              }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Summary: </strong>
                {lead.latest_analysis.score_explanation.replace(/^Score \d+\/100 \([^)]+\)\.\s*/, '')}
              </div>
            )}

            {/* Missing Info for Qualification */}
            {lead.latest_analysis?.missing_info?.length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-warning-text)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Missing qualification information:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {lead.latest_analysis.missing_info.map((m, idx) => (
                    <span key={idx} style={{
                      backgroundColor: 'var(--color-warning-bg)',
                      border: '1px solid var(--color-warning-border)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '1px 6px',
                      fontSize: '0.65rem',
                      color: 'var(--color-warning-text)',
                    }}>
                      • {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTop: '1px solid var(--color-border)',
        gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Analyze / Re-analyze button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze(lead.id);
            }}
            disabled={isAnalyzing}
            title="Run AI Lead Intelligence Analysis"
          >
            {isAnalyzing ? (
              <RefreshCw size={13} className="spinner" />
            ) : (
              <Sparkles size={13} color="var(--color-accent)" />
            )}
            {lead.priority_score === null ? 'Analyze' : lead.analysis_stale ? 'Re-analyze' : 'Analyzed'}
          </button>

          {/* Chat LeadPilot button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat(lead);
            }}
            title="Open LeadPilot Chat"
          >
            <MessageSquare size={13} />
            LeadPilot
          </button>
        </div>

        {/* View Details CTA */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onSelect(lead)}
          style={{ padding: '4px 6px', color: 'var(--color-accent)', fontWeight: 600 }}
        >
          Details
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
