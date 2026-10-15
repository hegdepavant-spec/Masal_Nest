import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateLeadModal from '../CreateLeadModal';

describe('CreateLeadModal Component', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal header, all schema fields, auto-analyze checkbox, and visible Save Lead button', () => {
    render(<CreateLeadModal {...defaultProps} />);

    // Header
    expect(screen.getByText('Capture New Lead')).toBeInTheDocument();

    // Fields matching LeadCreate schema
    expect(screen.getByLabelText(/Customer Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Budget Bracket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Buying Timeline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Property Requirements/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Customer Inquiry/i)).toBeInTheDocument();

    // Auto-analyze toggle (checked by default)
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();

    // Action buttons visible in modal footer
    const saveButton = screen.getByRole('button', { name: /Save Lead/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeVisible();
  });

  it('displays validation error and does not call onSubmit when customer_name is empty', async () => {
    const onSubmit = vi.fn();
    render(<CreateLeadModal {...defaultProps} onSubmit={onSubmit} />);

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent('Customer name is required.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('displays validation error when customer_name exceeds 255 characters', async () => {
    const onSubmit = vi.fn();
    render(<CreateLeadModal {...defaultProps} onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText(/Customer Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'A'.repeat(256) } });

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent('Customer name must be 255 characters or less.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with cleaned payload matching backend schema and autoAnalyze=true', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<CreateLeadModal {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Customer Full Name/i), {
      target: { value: '  Ananya Sharma  ' },
    });
    fireEvent.change(screen.getByLabelText(/Preferred Location/i), {
      target: { value: '  Indiranagar, Bangalore  ' },
    });
    fireEvent.change(screen.getByLabelText(/Budget Bracket/i), {
      target: { value: '  ₹2 - 2.5 Cr  ' },
    });
    fireEvent.change(screen.getByLabelText(/Buying Timeline/i), {
      target: { value: '  1 month  ' },
    });
    fireEvent.change(screen.getByLabelText(/Property Requirements/i), {
      target: { value: '  3 BHK luxury apartment  ' },
    });
    fireEvent.change(screen.getByLabelText(/Customer Inquiry/i), {
      target: { value: '  Looking for immediate site visit  ' },
    });

    const saveButton = screen.getByRole('button', { name: /Save Lead/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customer_name: 'Ananya Sharma',
          location: 'Indiranagar, Bangalore',
          budget: '₹2 - 2.5 Cr',
          buying_timeline: '1 month',
          property_requirement: '3 BHK luxury apartment',
          customer_message: 'Looking for immediate site visit',
        },
        true
      );
    });
  });

  it('allows toggling autoAnalyze off and submits autoAnalyze=false', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<CreateLeadModal {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Customer Full Name/i), {
      target: { value: 'Karan Patel' },
    });

    // Toggle off auto-analyze
    const toggleContainer = screen.getByText(/Auto-run AI Lead Intelligence on Save/i).closest('div');
    fireEvent.click(toggleContainer);

    const saveButton = screen.getByRole('button', { name: /Save Lead/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ customer_name: 'Karan Patel' }),
        false
      );
    });
  });

  it('shows loading state, disables buttons, and prevents duplicate submissions when isSubmitting is true', () => {
    const onSubmit = vi.fn();
    render(<CreateLeadModal {...defaultProps} onSubmit={onSubmit} isSubmitting={true} />);

    // Save button shows loading text
    expect(screen.getByText(/Saving & Analyzing.../i)).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Saving & Analyzing.../i });
    expect(saveButton).toBeDisabled();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeDisabled();

    const nameInput = screen.getByLabelText(/Customer Full Name/i);
    expect(nameInput).toBeDisabled();

    // Trying to submit while isSubmitting is ignored
    fireEvent.click(saveButton);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('displays error message inside the modal when onSubmit rejects with API failure', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Backend validation failed: duplicate contact'));
    render(<CreateLeadModal {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Customer Full Name/i), {
      target: { value: 'Sunita Menon' },
    });

    const saveButton = screen.getByRole('button', { name: /Save Lead/i });
    fireEvent.click(saveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Backend validation failed: duplicate contact'
    );
  });
});
