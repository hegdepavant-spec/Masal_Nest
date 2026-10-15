import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeadDetailModal from '../LeadDetailModal';

describe('LeadDetailModal Component', () => {
  const mockLead = {
    id: '23b73812-869c-4b72-9984-564dc3cd54f4',
    customer_name: 'Pavan T hegde',
    location: 'Bangalore',
    property_requirement: '3 BHK flat',
    budget: '50 lakhs',
    buying_timeline: 'within 20 days',
    customer_message: 'Need 3 BHK flat ready to move.',
    followup_status: 'new',
    priority_score: 63,
    priority_category: 'warm',
    analysis_stale: false,
    created_at: new Date().toISOString(),
    tasks: [],
    latest_analysis: {
      id: 'analysis-1',
      lead_id: '23b73812-869c-4b72-9984-564dc3cd54f4',
      summary: 'Pavan is looking for a 3 BHK flat within 20 days.',
      customer_intent: 'buying',
      key_requirements: ['3 BHK flat', '50 lakhs budget'],
      inferred_requirements: [],
      objections: [],
      missing_info: [],
      recommended_action: 'Schedule site visit',
      suggested_response: 'Hi Pavan, we have matching 3 BHK options.',
      urgency_signals: ['within 20 days'],
      readiness_signals: ['Budget allocated'],
      score_explanation: 'Score 63/100 (Warm). Long or unclear timeline (within 20 days); Intent: buying (25/25); Clear requirements and budget specified; Concrete next steps detected (15/15).',
      score_breakdown: {
        total_score: 63,
        category: 'warm',
        factors: [
          {
            factor: 'Buying Timeline Urgency',
            weight: 30.0,
            max_points: 30.0,
            awarded_points: 3.0,
            evidence: 'Timeline: within 20 days, 1 urgency signal detected',
          },
          {
            factor: 'Purchase Intent Clarity',
            weight: 25.0,
            max_points: 25.0,
            awarded_points: 25.0,
            evidence: "Declared intent: 'buying' (25/25 pts)",
          },
          {
            factor: 'Requirement Clarity',
            weight: 20.0,
            max_points: 20.0,
            awarded_points: 20.0,
            evidence: '2 requirement(s) extracted; Budget: specified; Property: specified',
          },
          {
            factor: 'Concrete Next Steps',
            weight: 15.0,
            max_points: 15.0,
            awarded_points: 15.0,
            evidence: 'Actionable next steps identified (15/15 pts)',
          },
          {
            factor: 'Objections & Blockers',
            weight: 0.0,
            max_points: 0.0,
            awarded_points: 0.0,
            evidence: 'No objections or concerns noted',
          },
        ],
      },
    },
  };

  const defaultProps = {
    lead: mockLead,
    onClose: vi.fn(),
    onAnalyze: vi.fn(),
    isAnalyzing: false,
    onOpenCallBrief: vi.fn(),
    onOpenChat: vi.fn(),
    onUpdateLead: vi.fn(),
    onAddTask: vi.fn(),
    onToggleTask: vi.fn(),
    showToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lead priority score and category banner', () => {
    render(<LeadDetailModal {...defaultProps} />);

    // Priority score circle and banner
    expect(screen.getByText('63')).toBeInTheDocument();
    expect(screen.getByText(/WARM PRIORITY/i)).toBeInTheDocument();
    expect(screen.getByText(/Hot: ≥ 70 pts · Warm: 40-69 pts · Cold: < 40 pts/i)).toBeInTheDocument();
  });

  it('renders the deterministic factor breakdown with all factor names, points, and evidence', () => {
    render(<LeadDetailModal {...defaultProps} />);

    expect(screen.getByText('Deterministic Factor Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Total: 63/100 pts')).toBeInTheDocument();

    // All 5 factors
    expect(screen.getByText('Buying Timeline Urgency')).toBeInTheDocument();
    expect(screen.getByText('3 / 30 pts')).toBeInTheDocument();
    expect(screen.getByText(/Timeline: within 20 days/i)).toBeInTheDocument();

    expect(screen.getByText('Purchase Intent Clarity')).toBeInTheDocument();
    expect(screen.getByText('25 / 25 pts')).toBeInTheDocument();

    expect(screen.getByText('Requirement Clarity')).toBeInTheDocument();
    expect(screen.getByText('20 / 20 pts')).toBeInTheDocument();

    expect(screen.getByText('Concrete Next Steps')).toBeInTheDocument();
    expect(screen.getByText('15 / 15 pts')).toBeInTheDocument();

    expect(screen.getByText('Objections & Blockers')).toBeInTheDocument();
  });

  it('renders score explanation and disclaimer that scoring is rule-based', () => {
    render(<LeadDetailModal {...defaultProps} />);

    expect(screen.getByText(/Scoring Explanation:/i)).toBeInTheDocument();
    expect(screen.getByText(/Long or unclear timeline \(within 20 days\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Scores indicate engagement urgency, not calibrated purchase probabilities/i)).toBeInTheDocument();
  });
});
