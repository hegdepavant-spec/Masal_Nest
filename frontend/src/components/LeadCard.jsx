import React from 'react';
import { 
  Flame, Zap, Snowflake, MapPin, IndianRupee, Clock, 
  MessageSquare, Sparkles, RefreshCw, ChevronRight, AlertCircle 
} from 'lucide-react';

export default function LeadCard({ lead, onSelect, onOpenChat, onAnalyze, analyzingId }) {
  const isAnalyzing = analyzingId === lead.id;

  // Determine badge styling
  const category = (lead.priority_category || 'unscored').toLowerCase();
  let badgeClass = 'badge-unscored';
  let CategoryIcon = Snowflake;
  let scoreColor = 'var(--text-muted)';
  let borderColor = 'var(--border-subtle)';

  if (category === 'hot') {
    badgeClass = 'badge-hot';
    CategoryIcon = Flame;
    scoreColor = 'var(--color-hot)';
    borderColor = 'rgba(244, 63, 94, 0.25)';
  } else if (category === 'warm') {
    badgeClass = 'badge-warm';
    CategoryIcon = Zap;
    scoreColor = 'var(--color-warm)';
    borderColor = 'rgba(245, 158, 11, 0.25)';
  } else if (category === 'cold') {
    badgeClass = 'badge-cold';
    CategoryIcon = Snowflake;
    scoreColor = 'var(--color-cold)';
    borderColor = 'rgba(6, 182, 212, 0.25)';
  }

  const statusClass = `status-${lead.followup_status || 'new'}`;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderColor: borderColor,
        position: 'relative',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div>
        {/* Top Row: Name, Status & Score */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 
                onClick={() => onSelect(lead)}
                style={{ 
                  fontSize: '1.05rem', 
                  color: '#ffffff', 
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
              <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <MapPin size={13} color="var(--brand-primary)" />
                {lead.location}
              </p>
            )}
          </div>

          {/* Score Badge */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div className={`badge ${badgeClass}`}>
              <CategoryIcon size={12} />
              {lead.priority_score !== null ? `${lead.priority_score} pts` : 'Unscored'}
            </div>
            {lead.priority_category && (
              <span style={{ fontSize: '0.7rem', color: scoreColor, fontWeight: 700, textTransform: 'uppercase' }}>
                {lead.priority_category} Lead
              </span>
            )}
          </div>
        </div>

        {/* Stale Warning Banner if analysis is stale */}
        {lead.analysis_stale && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: '0.72rem',
            color: '#fde68a',
            marginBottom: 10,
          }}>
            <AlertCircle size={13} color="#f59e0b" />
            <span>Lead details updated · Re-analysis recommended</span>
          </div>
        )}

        {/* Requirements Snippet */}
        {lead.property_requirement && (
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
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

        {/* Metadata Pills: Budget & Timeline */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {lead.budget && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.74rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px 7px',
              color: 'var(--text-primary)',
            }}>
              <IndianRupee size={12} color="#10b981" />
              {lead.budget}
            </span>
          )}

          {lead.buying_timeline && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.74rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px 7px',
              color: 'var(--text-primary)',
            }}>
              <Clock size={12} color="#f59e0b" />
              {lead.buying_timeline}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTop: '1px solid var(--border-subtle)',
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
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} color="var(--brand-primary)" />
            )}
            {lead.priority_score === null ? 'Analyze' : lead.analysis_stale ? 'Re-analyze' : 'Analyzed'}
          </button>

          {/* Chat copilot button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat(lead);
            }}
            title="Open Sales Copilot Chat"
          >
            <MessageSquare size={14} />
            Copilot
          </button>
        </div>

        {/* View Details CTA */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onSelect(lead)}
          style={{ padding: '4px 6px', color: 'var(--brand-primary)' }}
        >
          Details
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
