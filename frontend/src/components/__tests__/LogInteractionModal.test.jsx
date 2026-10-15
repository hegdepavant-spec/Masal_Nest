import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import LogInteractionModal from '../LogInteractionModal';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    extractInteraction: vi.fn(),
  },
}));

describe('LogInteractionModal Component', () => {
  const mockLead = {
    id: 'lead-123',
    customer_name: 'Ananya Sharma',
    location: 'Whitefield',
    budget: '₹1.5 Cr',
    buying_timeline: '3 months',
    customer_message: 'Interested in 3 BHK',
    followup_status: 'new',
  };

  const defaultProps = {
    lead: mockLead,
    onClose: vi.fn(),
    onUpdateLead: vi.fn().mockResolvedValue({}),
    onAddTask: vi.fn().mockResolvedValue({}),
    showToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal header, outcome select, notes textarea, and action buttons', () => {
    render(<LogInteractionModal {...defaultProps} />);

    expect(screen.getByText('Log Customer Interaction')).toBeInTheDocument();
    expect(screen.getByText(/Target Lead: Ananya Sharma/)).toBeInTheDocument();
    expect(screen.getByText('Interaction Outcome *')).toBeInTheDocument();
    expect(screen.getByText(/Call Notes & Discussion Details \*/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Extract Updates with LeadPilot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve & Save Interaction/i })).toBeInTheDocument();
  });

  it('validates that notes cannot be empty when extracting or submitting', async () => {
    render(<LogInteractionModal {...defaultProps} />);

    // Click extract without notes
    const extractBtn = screen.getByRole('button', { name: /Extract Updates with LeadPilot/i });
    expect(extractBtn).toBeDisabled();
  });

  it('allows salesperson to extract proposed changes via LeadPilot, review, and toggle them', async () => {
    api.extractInteraction.mockResolvedValueOnce({
      proposed_updates: {
        budget: '₹1.8 Cr',
        location: 'Sarjapur Road',
        buying_timeline: 'Immediate',
        property_requirement: '3 BHK flat',
        followup_status: 'in_progress',
      },
      suggested_task: {
        title: 'Send Sarjapur floor plans',
        action_type: 'document',
        due_in_days: 2,
        description: 'Provide floor plans of high-floor units',
      },
      summary: 'Customer increased budget and requested Sarjapur options.',
    });

    render(<LogInteractionModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/What did the customer say\?/i);
    fireEvent.change(textarea, {
      target: { value: 'Spoke to Ananya. Budget is now 1.8 Cr. Shifted preference to Sarjapur Road.' },
    });

    const extractBtn = screen.getByRole('button', { name: /Extract Updates with LeadPilot/i });
    expect(extractBtn).not.toBeDisabled();
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(api.extractInteraction).toHaveBeenCalledWith('lead-123', {
        outcome: 'connected',
        notes: 'Spoke to Ananya. Budget is now 1.8 Cr. Shifted preference to Sarjapur Road.',
      });
    });

    // Review section appears
    expect(await screen.findByText(/LeadPilot Proposed Changes \(Review Before Committing\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer increased budget and requested Sarjapur options/)).toBeInTheDocument();

    // Checkboxes are rendered for review
    const locationCheckbox = screen.getByLabelText(/New Location:/i);
    expect(locationCheckbox).toBeChecked();

    const budgetCheckbox = screen.getByLabelText(/New Budget:/i);
    expect(budgetCheckbox).toBeChecked();

    // Salesperson unchecks budget
    fireEvent.click(budgetCheckbox);
    expect(budgetCheckbox).not.toBeChecked();

    // Submit approved changes
    const submitBtn = screen.getByRole('button', { name: /Approve & Save Interaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(defaultProps.onUpdateLead).toHaveBeenCalledTimes(1);
      const [calledLeadId, calledUpdates] = defaultProps.onUpdateLead.mock.calls[0];
      expect(calledLeadId).toBe('lead-123');
      // location was approved
      expect(calledUpdates.location).toBe('Sarjapur Road');
      // budget was unselected
      expect(calledUpdates.budget).toBeUndefined();
      // customer_message includes appended interaction log
      expect(calledUpdates.customer_message).toContain('[Interaction —');
    });

    // Follow-up task was scheduled
    expect(defaultProps.onAddTask).toHaveBeenCalledWith(
      expect.objectContaining({
        lead_id: 'lead-123',
        title: 'Send Sarjapur floor plans',
        action_type: 'document',
      })
    );

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
