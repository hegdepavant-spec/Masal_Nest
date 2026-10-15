import React, { useState } from 'react';
import { 
  X, PhoneCall, Sparkles, RefreshCw, CheckSquare, Calendar, 
  Tag, FileText, Check, AlertCircle, ArrowRight 
} from 'lucide-react';
import { api } from '../api';

const OUTCOME_OPTIONS = [
  { value: 'connected', label: 'Connected / Discussed Requirements' },
  { value: 'followup_requested', label: 'Follow-up Requested' },
  { value: 'site_visit_scheduled', label: 'Site Visit Scheduled' },
  { value: 'meeting_held', label: 'Meeting Held' },
  { value: 'left_voicemail', label: 'Left Voicemail' },
  { value: 'busy', label: 'Busy / Call Back' },
  { value: 'not_interested', label: 'Not Interested / Lost' },
];

export default function LogInteractionModal({ 
  lead, 
  onClose, 
  onUpdateLead, 
  onAddTask, 
  showToast 
}) {
  const [outcome, setOutcome] = useState('connected');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );
  const [actionType, setActionType] = useState('call');
  const [taskTitle, setTaskTitle] = useState('');

  // AI Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [extractError, setExtractError] = useState(null);

  // Review state (salesperson toggles which extracted fields to accept)
  const [approvedFields, setApprovedFields] = useState({
    location: false,
    budget: false,
    buying_timeline: false,
    property_requirement: false,
    followup_status: false,
  });
  const [fieldValues, setFieldValues] = useState({
    location: '',
    budget: '',
    buying_timeline: '',
    property_requirement: '',
    followup_status: '',
  });
  const [createFollowupTask, setCreateFollowupTask] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleExtractWithAI = async () => {
    if (!notes.trim()) {
      setExtractError('Please enter interaction notes before requesting LeadPilot extraction.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const res = await api.extractInteraction(lead.id, {
        outcome,
        notes: notes.trim(),
      });

      setExtractionResult(res);

      // Pre-fill editable field values with extracted fields (if any)
      const proposed = res.proposed_updates || {};
      const newVals = { ...fieldValues };
      const newApproved = { ...approvedFields };

      if (proposed.location) {
        newVals.location = proposed.location;
        newApproved.location = true;
      }
      if (proposed.budget) {
        newVals.budget = proposed.budget;
        newApproved.budget = true;
      }
      if (proposed.buying_timeline) {
        newVals.buying_timeline = proposed.buying_timeline;
        newApproved.buying_timeline = true;
      }
      if (proposed.property_requirement) {
        newVals.property_requirement = proposed.property_requirement;
        newApproved.property_requirement = true;
      }
      if (proposed.followup_status) {
        newVals.followup_status = proposed.followup_status;
        newApproved.followup_status = true;
      }

      setFieldValues(newVals);
      setApprovedFields(newApproved);

      // Pre-fill suggested task if provided
      if (res.suggested_task) {
        setTaskTitle(res.suggested_task.title || '');
        if (res.suggested_task.action_type) {
          setActionType(res.suggested_task.action_type);
        }
        if (res.suggested_task.due_in_days !== undefined) {
          const target = new Date(Date.now() + res.suggested_task.due_in_days * 86400000);
          setDueDate(target.toISOString().split('T')[0]);
        }
        setCreateFollowupTask(true);
      } else if (!taskTitle) {
        setTaskTitle(`Follow up on call with ${lead.customer_name}`);
      }

      if (showToast) {
        showToast('LeadPilot analyzed notes and proposed updates for review.', 'info');
      }
    } catch (err) {
      setExtractError(err.message || 'Failed to extract updates with LeadPilot.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleToggleField = (field) => {
    setApprovedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleFieldValueChange = (field, val) => {
    setFieldValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleSaveInteraction = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!notes.trim()) {
      setExtractError('Interaction notes are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Build lead updates object from approved fields
      const leadUpdates = {};
      Object.keys(approvedFields).forEach((key) => {
        if (approvedFields[key] && fieldValues[key]) {
          leadUpdates[key] = fieldValues[key];
        }
      });

      // Append interaction history log into customer message / notes
      const timestamp = new Date().toLocaleString();
      const outcomeLabel = OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label || outcome;
      const interactionLogEntry = `\n\n[Interaction — ${outcomeLabel} (${timestamp})]\n${notes.trim()}`;
      leadUpdates.customer_message = lead.customer_message
        ? `${lead.customer_message}${interactionLogEntry}`
        : interactionLogEntry.trim();

      // If status wasn't explicitly reviewed, map outcome to status if appropriate
      if (!leadUpdates.followup_status) {
        if (outcome === 'not_interested') {
          leadUpdates.followup_status = 'closed_lost';
        } else if (outcome === 'connected' && lead.followup_status === 'new') {
          leadUpdates.followup_status = 'contacted';
        }
      }

      // Save approved lead updates
      await onUpdateLead(lead.id, leadUpdates);

      // 2. If follow-up task is configured, create task via existing pipeline
      if (createFollowupTask && (taskTitle.trim() || extractionResult?.suggested_task?.title)) {
        const titleToUse = taskTitle.trim() || extractionResult.suggested_task.title;
        await onAddTask({
          lead_id: lead.id,
          title: titleToUse,
          description: extractionResult?.suggested_task?.description || `Follow-up after ${outcomeLabel}: ${notes.slice(0, 150)}...`,
          action_type: actionType,
          due_date: dueDate || null,
        });
      }

      if (showToast) {
        showToast('Interaction logged and approved changes committed.', 'success');
      }
      onClose();
    } catch (err) {
      setExtractError(err.message || 'Failed to save interaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAnyProposedChanges = extractionResult && Object.keys(extractionResult.proposed_updates || {}).some(
    (k) => extractionResult.proposed_updates[k]
  );

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-accent-subtle)',
              border: '1px solid var(--color-accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}>
              <PhoneCall size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                Log Customer Interaction
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Target Lead: {lead.customer_name} · Review & commit updates
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 6, color: 'var(--color-text-muted)' }} aria-label="Close modal">
            <X size={17} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSaveInteraction} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', padding: '20px 24px' }}>
            {extractError && (
              <div style={{
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error-border)',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error-text)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{extractError}</span>
              </div>
            )}

            {/* Outcome Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 5 }}>
                Interaction Outcome *
              </label>
              <select
                className="form-select"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Interaction Notes */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Call Notes & Discussion Details *
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleExtractWithAI}
                  disabled={isExtracting || !notes.trim()}
                  style={{ fontSize: '0.72rem', padding: '3px 8px', gap: 5 }}
                >
                  {isExtracting ? (
                    <RefreshCw size={12} className="spinner" />
                  ) : (
                    <Sparkles size={12} color="var(--color-accent)" />
                  )}
                  {isExtracting ? 'Extracting...' : 'Extract Updates with LeadPilot'}
                </button>
              </div>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="What did the customer say? Note any changed budget, location preferences, timeline urgency, or objections..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (extractError) setExtractError(null);
                }}
                required
              />
            </div>

            {/* Extraction Review Section */}
            {extractionResult && (
              <div style={{
                backgroundColor: 'var(--color-accent-subtle)',
                border: '1px solid var(--color-accent-border)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="var(--color-accent)" />
                    LeadPilot Proposed Changes (Review Before Committing)
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                    Salesperson Review Required
                  </span>
                </div>

                {extractionResult.summary && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                    "{extractionResult.summary}"
                  </p>
                )}

                {hasAnyProposedChanges ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Location */}
                    {extractionResult.proposed_updates.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem' }}>
                        <input
                          type="checkbox"
                          id="chk-location"
                          checked={approvedFields.location}
                          onChange={() => handleToggleField('location')}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                        <label htmlFor="chk-location" style={{ width: 130, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                          New Location:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={fieldValues.location}
                          onChange={(e) => handleFieldValueChange('location', e.target.value)}
                          disabled={!approvedFields.location}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem' }}
                        />
                      </div>
                    )}

                    {/* Budget */}
                    {extractionResult.proposed_updates.budget && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem' }}>
                        <input
                          type="checkbox"
                          id="chk-budget"
                          checked={approvedFields.budget}
                          onChange={() => handleToggleField('budget')}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                        <label htmlFor="chk-budget" style={{ width: 130, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                          New Budget:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={fieldValues.budget}
                          onChange={(e) => handleFieldValueChange('budget', e.target.value)}
                          disabled={!approvedFields.budget}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem' }}
                        />
                      </div>
                    )}

                    {/* Buying Timeline */}
                    {extractionResult.proposed_updates.buying_timeline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem' }}>
                        <input
                          type="checkbox"
                          id="chk-timeline"
                          checked={approvedFields.buying_timeline}
                          onChange={() => handleToggleField('buying_timeline')}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                        <label htmlFor="chk-timeline" style={{ width: 130, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                          New Timeline:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={fieldValues.buying_timeline}
                          onChange={(e) => handleFieldValueChange('buying_timeline', e.target.value)}
                          disabled={!approvedFields.buying_timeline}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem' }}
                        />
                      </div>
                    )}

                    {/* Requirements */}
                    {extractionResult.proposed_updates.property_requirement && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.78rem' }}>
                        <input
                          type="checkbox"
                          id="chk-req"
                          checked={approvedFields.property_requirement}
                          onChange={() => handleToggleField('property_requirement')}
                          style={{ marginTop: 6, accentColor: 'var(--color-accent)' }}
                        />
                        <label htmlFor="chk-req" style={{ width: 130, color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: 4 }}>
                          Requirements:
                        </label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          value={fieldValues.property_requirement}
                          onChange={(e) => handleFieldValueChange('property_requirement', e.target.value)}
                          disabled={!approvedFields.property_requirement}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem' }}
                        />
                      </div>
                    )}

                    {/* Status */}
                    {extractionResult.proposed_updates.followup_status && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem' }}>
                        <input
                          type="checkbox"
                          id="chk-status"
                          checked={approvedFields.followup_status}
                          onChange={() => handleToggleField('followup_status')}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                        <label htmlFor="chk-status" style={{ width: 130, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                          Update Status:
                        </label>
                        <select
                          className="form-select"
                          value={fieldValues.followup_status}
                          onChange={(e) => handleFieldValueChange('followup_status', e.target.value)}
                          disabled={!approvedFields.followup_status}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem', height: 28 }}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed_won">Closed Won</option>
                          <option value="closed_lost">Closed Lost</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                    No customer profile modifications detected from these notes.
                  </p>
                )}
              </div>
            )}

            {/* Next Follow-up Task Section */}
            <div style={{
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="chk-create-task"
                  checked={createFollowupTask}
                  onChange={(e) => setCreateFollowupTask(e.target.checked)}
                  style={{ accentColor: 'var(--color-accent)', width: 15, height: 15 }}
                />
                <label htmlFor="chk-create-task" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  Schedule Next Follow-up Task in Pipeline
                </label>
              </div>

              {createFollowupTask && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: 3 }}>
                      Task Title
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`e.g. Call to discuss pricing / Schedule visit with ${lead.customer_name}`}
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: 3 }}>
                        Action Type
                      </label>
                      <select
                        className="form-select"
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        style={{ height: 32 }}
                      >
                        <option value="call">Phone Call</option>
                        <option value="site_visit">Site Visit / Tour</option>
                        <option value="email">Email</option>
                        <option value="document">Send Document / Pricing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: 3 }}>
                        Due Date
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        style={{ height: 32 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ justifyContent: 'space-between', padding: '12px 24px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || !notes.trim()}
              style={{ minWidth: 150 }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={13} className="spinner" />
                  Saving & Committing...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Approve & Save Interaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
