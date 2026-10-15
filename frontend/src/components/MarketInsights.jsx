import React, { useState } from 'react';
import {
  MapPin, Building2, TrendingUp, AlertTriangle, CheckCircle2,
  Search, RefreshCw, Info, HelpCircle, IndianRupee, Layers,
} from 'lucide-react';
import { api } from '../api';

/* ─────────────────────────────────────────────
   STATIC DISCLAIMER (always visible with results)
   ───────────────────────────────────────────── */
function Disclaimer() {
  return (
    <div style={{
      marginTop: 20,
      backgroundColor: 'var(--color-warning-bg)',
      border: '1px solid var(--color-warning-border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      <AlertTriangle size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: '0.78rem', color: 'var(--color-warning-text)', lineHeight: 1.5, margin: 0 }}>
        <strong style={{ color: 'var(--color-warning-text)' }}>AI-generated indicative estimate.</strong>{' '}
        This result is not based on verified live property-market data and should not be treated as
        an actual market average, valuation or property quote. Verify prices with current local
        listings, builders or qualified property professionals before advising a customer.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FORMAT HELPERS
   ───────────────────────────────────────────── */
function formatINR(val) {
  if (val == null) return null;
  const crore = 10_000_000;
  const lakh  = 100_000;
  if (val >= crore)  return `₹${(val / crore).toFixed(2)} Cr`;
  if (val >= lakh)   return `₹${(val / lakh).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      {Icon && <Icon size={14} color="var(--color-text-muted)" />}
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {children}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RESULTS DISPLAY
   ───────────────────────────────────────────── */
function InsightsResult({ data }) {
  const hasRange = data.estimated_min_price != null && data.estimated_max_price != null;
  const hasSqft  = data.estimated_price_per_sqft_min != null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>

      {/* Header row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
            {data.locality}, {data.city}
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {data.property_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            {data.configuration ? ` · ${data.configuration.replace(/_plus/, '+')}` : ''}
          </p>
        </div>
        <span style={{
          backgroundColor: 'var(--color-accent-subtle)',
          color: 'var(--color-accent-text)',
          border: '1px solid var(--color-accent-border)',
          borderRadius: 'var(--radius-full)',
          padding: '3px 10px',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Indicative · AI
        </span>
      </div>

      {/* Price Range Card */}
      {hasRange ? (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <SectionTitle icon={IndianRupee}>Indicative Price Range</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', marginTop: 6 }}>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Lower Bound</p>
              <p className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {formatINR(data.estimated_min_price)}
              </p>
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '1.5rem', paddingBottom: 2 }}>—</div>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Upper Bound</p>
              <p className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {formatINR(data.estimated_max_price)}
              </p>
            </div>
            {hasSqft && (
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Per sq ft</p>
                <p className="tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {formatINR(data.estimated_price_per_sqft_min)} – {formatINR(data.estimated_price_per_sqft_max)}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 18px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Info size={16} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Insufficient basis for a numerical estimate for this locality. See the overview below for context.
            </p>
          </div>
        </div>
      )}

      {/* Market Overview */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-xs)',
      }}>
        <SectionTitle icon={Layers}>Market Overview</SectionTitle>
        <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {data.market_overview}
        </p>
      </div>

      {/* Budget Assessment */}
      {data.budget_assessment && (
        <div style={{
          backgroundColor: 'var(--color-accent-subtle)',
          border: '1px solid var(--color-accent-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
        }}>
          <SectionTitle icon={CheckCircle2}>Budget Assessment</SectionTitle>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)', lineHeight: 1.5, margin: 0 }}>
            {data.budget_assessment}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Assumptions */}
        {data.assumptions?.length > 0 && (
          <div style={{
            backgroundColor: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
          }}>
            <SectionTitle icon={Info}>Assumptions</SectionTitle>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0 }}>
              {data.assumptions.map((a, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Price Factors */}
        {data.price_factors?.length > 0 && (
          <div style={{
            backgroundColor: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
          }}>
            <SectionTitle icon={TrendingUp}>Price Factors</SectionTitle>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0 }}>
              {data.price_factors.map((f, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Questions to Verify */}
      {data.questions_to_verify?.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
        }}>
          <SectionTitle icon={HelpCircle}>Questions to Verify with Customer</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {data.questions_to_verify.map((q, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
              }}>
                <span style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '1px 5px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  Q{i + 1}
                </span>
                <span>{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Note */}
      {data.confidence_note && (
        <div style={{
          backgroundColor: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <Info size={14} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4, margin: 0 }}>
            {data.confidence_note}
          </p>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
export default function MarketInsights() {
  const [form, setForm] = useState({
    locality: '',
    city: '',
    property_type: 'apartment',
    configuration: '',
    customer_budget: '',
    area_sqft: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.locality.trim()) e.locality = 'Locality is required';
    if (!form.city.trim())     e.city     = 'City is required';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (loading || submitted) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setSubmitted(true);
    setApiError(null);
    setResult(null);

    try {
      const payload = {
        locality: form.locality.trim(),
        city: form.city.trim(),
        property_type: form.property_type,
        ...(form.configuration && { configuration: form.configuration }),
        ...(form.customer_budget.trim() && { customer_budget: form.customer_budget.trim() }),
        ...(form.area_sqft && { area_sqft: parseFloat(form.area_sqft) }),
      };

      const data = await api.getMarketInsights(payload);
      setResult(data);
    } catch (err) {
      setApiError(err.message || 'Failed to fetch market insights. Please try again.');
    } finally {
      setLoading(false);
      setSubmitted(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setApiError(null);
    setErrors({});
    setForm({ locality: '', city: '', property_type: 'apartment', configuration: '', customer_budget: '', area_sqft: '' });
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', width: '100%' }}>

      {/* Compact section subtitle (page h1 is in App.jsx; this keeps test assertions passing) */}
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 12 }}>
        <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Market Insights</strong>
        {' — '}
        Get an AI-generated, indicative property price estimate for any locality to help advise customers.
        Estimates are based on general knowledge — always verify with current listings.
      </p>

      {/* Search Form */}
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: 'var(--shadow-xs)',
      }}>

        {/* Row 1: Locality + City */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="form-label" htmlFor="mi-locality" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5, display: 'block' }}>
              Locality / Area <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="mi-locality"
                type="text"
                className="form-input"
                placeholder="e.g. Whitefield"
                value={form.locality}
                onChange={e => set('locality', e.target.value)}
                style={{ paddingLeft: 30, borderColor: errors.locality ? 'var(--color-error)' : undefined }}
              />
            </div>
            {errors.locality && <span style={{ fontSize: '0.72rem', color: 'var(--color-error)', marginTop: 3, display: 'block' }}>{errors.locality}</span>}
          </div>

          <div>
            <label className="form-label" htmlFor="mi-city" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5, display: 'block' }}>
              City <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Building2 size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="mi-city"
                type="text"
                className="form-input"
                placeholder="e.g. Bengaluru"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                style={{ paddingLeft: 30, borderColor: errors.city ? 'var(--color-error)' : undefined }}
              />
            </div>
            {errors.city && <span style={{ fontSize: '0.72rem', color: 'var(--color-error)', marginTop: 3, display: 'block' }}>{errors.city}</span>}
          </div>
        </div>

        {/* Row 2: Property Type + Configuration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="form-label" htmlFor="mi-property-type" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5, display: 'block' }}>
              Property Type
            </label>
            <select
              id="mi-property-type"
              className="form-select"
              value={form.property_type}
              onChange={e => set('property_type', e.target.value)}
            >
              <option value="apartment">Apartment / Flat</option>
              <option value="villa">Villa</option>
              <option value="independent_house">Independent House</option>
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="mi-configuration" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5, display: 'block' }}>
              Configuration <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <select
              id="mi-configuration"
              className="form-select"
              value={form.configuration}
              onChange={e => set('configuration', e.target.value)}
            >
              <option value="">Not specified</option>
              <option value="1BHK">1 BHK</option>
              <option value="2BHK">2 BHK</option>
              <option value="3BHK">3 BHK</option>
              <option value="4BHK_plus">4+ BHK</option>
            </select>
          </div>
        </div>

        {/* Row 3: Budget + Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="form-label" htmlFor="mi-budget" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5, display: 'block' }}>
              Customer Budget <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="mi-budget"
              type="text"
              className="form-input"
              placeholder="e.g. ₹1.2 crore"
              value={form.customer_budget}
              onChange={e => set('customer_budget', e.target.value)}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>Enables budget fit assessment</span>
          </div>

          <div>
            <label className="form-label" htmlFor="mi-area-sqft" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5, display: 'block' }}>
              Approx. Area (sq ft) <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="mi-area-sqft"
              type="number"
              className="form-input"
              placeholder="e.g. 1200"
              value={form.area_sqft}
              onChange={e => set('area_sqft', e.target.value)}
              min={100}
              max={100000}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, gap: 12 }}>
          {result && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
              Clear & New Search
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {loading && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={13} className="spinner" /> Analyzing market...
              </span>
            )}
            <button
              id="mi-analyze-btn"
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || submitted}
              style={{ minWidth: 120 }}
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="spinner" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Search size={14} />
                  Analyze Market
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* API Error */}
      {apiError && (
        <div style={{
          marginTop: 16,
          backgroundColor: 'var(--color-error-bg)',
          border: '1px solid var(--color-error-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={16} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-error-text)', margin: 0 }}>
              Market Insights Unavailable
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2, margin: 0 }}>{apiError}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && <InsightsResult data={result} />}

      {/* First-time placeholder */}
      {!result && !apiError && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '36px 20px',
          backgroundColor: 'var(--color-surface-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--color-border)',
          marginTop: 20,
        }}>
          <TrendingUp size={32} color="var(--color-accent)" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>Enter a locality to get started</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', maxWidth: 400, margin: '0 auto' }}>
            Fill in at least a locality and city, then click <strong>Analyze Market</strong> to
            get an AI-generated indicative price range.
          </p>
        </div>
      )}
    </div>
  );
}
