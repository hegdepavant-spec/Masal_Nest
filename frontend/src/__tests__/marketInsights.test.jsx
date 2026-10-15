/**
 * Market Insights Frontend Tests
 *
 * Tests: form validation, loading/success/error states, results display,
 * disclaimer visibility, null estimates handling, duplicate submission prevention.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MarketInsights from '../components/MarketInsights';
import { api } from '../api';

// Mock the api module
vi.mock('../api', () => ({
  api: {
    getMarketInsights: vi.fn(),
  },
}));

const MOCK_RESULT = {
  locality: 'Whitefield',
  city: 'Bengaluru',
  property_type: 'apartment',
  configuration: '3BHK',
  market_overview: 'Whitefield is a well-established IT corridor with strong demand.',
  estimated_min_price: 7500000,
  estimated_max_price: 11000000,
  currency: 'INR',
  estimated_price_per_sqft_min: 6200,
  estimated_price_per_sqft_max: 9000,
  assumptions: ['Mid-segment gated community', 'Ready-to-move or near-completion'],
  price_factors: ['Floor and views', 'Builder reputation', 'Proximity to IT parks'],
  budget_assessment: 'A ₹1.2 crore budget is at the lower end of the estimated range.',
  questions_to_verify: ['Is customer open to resale?', 'What is preferred possession timeline?'],
  confidence_note: 'Rough indicative estimate based on general training knowledge.',
  data_status: 'AI_INDICATIVE',
};

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText(/whitefield/i), {
    target: { value: 'Whitefield' },
  });
  fireEvent.change(screen.getByPlaceholderText(/bengaluru/i), {
    target: { value: 'Bengaluru' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// FORM RENDERING
// ──────────────────────────────────────────────

describe('MarketInsights — Form Rendering', () => {
  it('renders the page title and description', () => {
    render(<MarketInsights />);
    expect(screen.getByText('Market Insights')).toBeInTheDocument();
    expect(screen.getByText(/indicative property price estimate/i)).toBeInTheDocument();
  });

  it('renders required locality and city fields', () => {
    render(<MarketInsights />);
    expect(screen.getByLabelText(/locality/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  });

  it('renders property type selector with correct options', () => {
    render(<MarketInsights />);
    const select = screen.getByLabelText(/property type/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByText(/apartment \/ flat/i)).toBeInTheDocument();
    expect(screen.getByText(/villa/i)).toBeInTheDocument();
    expect(screen.getByText(/independent house/i)).toBeInTheDocument();
  });

  it('renders configuration selector with BHK options', () => {
    render(<MarketInsights />);
    expect(screen.getByText('1 BHK')).toBeInTheDocument();
    expect(screen.getByText('2 BHK')).toBeInTheDocument();
    expect(screen.getByText('3 BHK')).toBeInTheDocument();
    expect(screen.getByText('4+ BHK')).toBeInTheDocument();
  });

  it('renders optional budget and area fields', () => {
    render(<MarketInsights />);
    expect(screen.getByPlaceholderText(/₹1\.2 crore/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/1200/i)).toBeInTheDocument();
  });

  it('renders the Analyze Market submit button', () => {
    render(<MarketInsights />);
    const btn = screen.getByRole('button', { name: /analyze market/i });
    expect(btn).toBeInTheDocument();
  });

  it('shows the empty state placeholder before any search', () => {
    render(<MarketInsights />);
    expect(screen.getByText(/enter a locality to get started/i)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// VALIDATION
// ──────────────────────────────────────────────

describe('MarketInsights — Validation', () => {
  it('shows validation error if locality is missing', async () => {
    render(<MarketInsights />);
    fireEvent.change(screen.getByPlaceholderText(/bengaluru/i), {
      target: { value: 'Bengaluru' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    await waitFor(() => {
      expect(screen.getByText(/locality is required/i)).toBeInTheDocument();
    });
    expect(api.getMarketInsights).not.toHaveBeenCalled();
  });

  it('shows validation error if city is missing', async () => {
    render(<MarketInsights />);
    fireEvent.change(screen.getByPlaceholderText(/whitefield/i), {
      target: { value: 'Whitefield' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    await waitFor(() => {
      expect(screen.getByText(/city is required/i)).toBeInTheDocument();
    });
    expect(api.getMarketInsights).not.toHaveBeenCalled();
  });

  it('clears validation errors when the user starts typing', async () => {
    render(<MarketInsights />);
    fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    await waitFor(() => {
      expect(screen.getByText(/locality is required/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(/whitefield/i), {
      target: { value: 'Whitefield' },
    });
    await waitFor(() => {
      expect(screen.queryByText(/locality is required/i)).not.toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────────
// SUBMISSION & LOADING STATE
// ──────────────────────────────────────────────

describe('MarketInsights — Loading State', () => {
  it('shows loading indicator while request is pending', async () => {
    let resolve;
    const pending = new Promise(r => { resolve = r; });
    api.getMarketInsights.mockReturnValue(pending);

    render(<MarketInsights />);
    fillRequiredFields();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });

    expect(screen.getByText(/analyzing…/i)).toBeInTheDocument();
    // Resolve to clean up
    resolve(MOCK_RESULT);
  });

  it('disables the submit button while loading', async () => {
    let resolve;
    const pending = new Promise(r => { resolve = r; });
    api.getMarketInsights.mockReturnValue(pending);

    render(<MarketInsights />);
    fillRequiredFields();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });

    const btn = screen.getByRole('button', { name: /analyzing…/i });
    expect(btn).toBeDisabled();
    resolve(MOCK_RESULT);
  });
});

// ──────────────────────────────────────────────
// SUCCESS STATE
// ──────────────────────────────────────────────

describe('MarketInsights — Success Results', () => {
  beforeEach(() => {
    api.getMarketInsights.mockResolvedValue(MOCK_RESULT);
  });

  it('displays locality and city in result header', async () => {
    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/Whitefield, Bengaluru/i)).toBeInTheDocument();
    });
  });

  it('displays the market overview text', async () => {
    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/Whitefield is a well-established IT corridor/i)).toBeInTheDocument();
    });
  });

  it('always shows the disclaimer with results', async () => {
    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/AI-generated indicative estimate/i)).toBeInTheDocument();
      expect(screen.getByText(/not based on verified live property-market data/i)).toBeInTheDocument();
    });
  });

  it('shows the budget assessment when budget is supplied', async () => {
    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/lower end of the estimated range/i)).toBeInTheDocument();
    });
  });

  it('renders questions to verify', async () => {
    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/is customer open to resale/i)).toBeInTheDocument();
    });
  });

  it('renders price factors list', async () => {
    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/builder reputation/i)).toBeInTheDocument();
    });
  });

  it('shows the confidence note', async () => {
    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/rough indicative estimate based on general training knowledge/i)).toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────────
// NULL ESTIMATES
// ──────────────────────────────────────────────

describe('MarketInsights — Null Estimates', () => {
  it('gracefully displays when price estimates are null', async () => {
    const nullResult = {
      ...MOCK_RESULT,
      estimated_min_price: null,
      estimated_max_price: null,
      estimated_price_per_sqft_min: null,
      estimated_price_per_sqft_max: null,
      budget_assessment: null,
    };
    api.getMarketInsights.mockResolvedValue(nullResult);

    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/insufficient basis for a numerical estimate/i)).toBeInTheDocument();
    });
  });

  it('does not show budget assessment section when null', async () => {
    const nullResult = { ...MOCK_RESULT, budget_assessment: null };
    api.getMarketInsights.mockResolvedValue(nullResult);

    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.queryByText(/budget assessment/i)).not.toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────────
// ERROR STATE
// ──────────────────────────────────────────────

describe('MarketInsights — Error State', () => {
  it('shows an error message when the API call fails', async () => {
    api.getMarketInsights.mockRejectedValue(new Error('Market insights AI service error'));

    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/market insights unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/market insights ai service error/i)).toBeInTheDocument();
    });
  });

  it('does not show results when there is an error', async () => {
    api.getMarketInsights.mockRejectedValue(new Error('Network error'));

    render(<MarketInsights />);
    fillRequiredFields();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /analyze market/i }));
    });
    await waitFor(() => {
      expect(screen.queryByText(/Whitefield, Bengaluru/i)).not.toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────────
// DUPLICATE SUBMISSION PREVENTION
// ──────────────────────────────────────────────

describe('MarketInsights — Duplicate Submission Prevention', () => {
  it('does not call API twice if button clicked rapidly', async () => {
    let resolveFirst;
    const firstCall = new Promise(r => { resolveFirst = r; });
    api.getMarketInsights.mockReturnValue(firstCall);

    render(<MarketInsights />);
    fillRequiredFields();

    const btn = screen.getByRole('button', { name: /analyze market/i });

    await act(async () => {
      fireEvent.click(btn);
    });

    // Button should now be disabled — clicking again won't trigger a second call
    fireEvent.click(btn); // second click on disabled button

    resolveFirst(MOCK_RESULT);

    await waitFor(() => {
      expect(api.getMarketInsights).toHaveBeenCalledTimes(1);
    });
  });
});
