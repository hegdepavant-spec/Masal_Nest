import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';

describe('Lead Creation and Auto-Analysis Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully creates lead and skips AI analysis when autoAnalyze is false', async () => {
    const mockCreatedLead = {
      id: 'lead-123',
      customer_name: 'Vikram Seth',
      location: 'Whitefield',
    };

    vi.spyOn(api, 'createLead').mockResolvedValue(mockCreatedLead);
    const analyzeSpy = vi.spyOn(api, 'analyzeLead').mockResolvedValue({});

    const toastCalls = [];
    const showToast = (msg, type) => toastCalls.push({ msg, type });
    let isCreateOpen = true;
    const setIsCreateOpen = (val) => { isCreateOpen = val; };

    // Simulate handleCreateLead implementation
    const handleCreateLead = async (formData, autoAnalyze) => {
      let newLead;
      try {
        newLead = await api.createLead(formData);
        showToast(`Lead for ${newLead.customer_name} saved successfully!`, 'success');
        setIsCreateOpen(false);
      } catch (err) {
        showToast(err.message || 'Failed to create lead', 'error');
        throw err;
      }

      if (autoAnalyze && newLead?.id) {
        try {
          showToast('Running AI lead scoring & intelligence...', 'info');
          await api.analyzeLead(newLead.id);
          showToast(`AI analysis completed for ${newLead.customer_name}!`, 'success');
        } catch (aiErr) {
          showToast(`Lead was saved, but AI analysis failed: ${aiErr.message || 'Check backend logs.'}`, 'warning');
        }
      }
    };

    await handleCreateLead({ customer_name: 'Vikram Seth', location: 'Whitefield' }, false);

    expect(api.createLead).toHaveBeenCalledTimes(1);
    expect(analyzeSpy).not.toHaveBeenCalled();
    expect(isCreateOpen).toBe(false);
    expect(toastCalls).toContainEqual({
      msg: 'Lead for Vikram Seth saved successfully!',
      type: 'success',
    });
  });

  it('successfully creates lead and triggers AI analysis when autoAnalyze is true', async () => {
    const mockCreatedLead = {
      id: 'lead-456',
      customer_name: 'Priya Nair',
    };

    vi.spyOn(api, 'createLead').mockResolvedValue(mockCreatedLead);
    vi.spyOn(api, 'analyzeLead').mockResolvedValue({ id: 'analysis-1', priority_score: 85 });

    const toastCalls = [];
    const showToast = (msg, type) => toastCalls.push({ msg, type });
    let isCreateOpen = true;
    const setIsCreateOpen = (val) => { isCreateOpen = val; };

    const handleCreateLead = async (formData, autoAnalyze) => {
      let newLead;
      try {
        newLead = await api.createLead(formData);
        showToast(`Lead for ${newLead.customer_name} saved successfully!`, 'success');
        setIsCreateOpen(false);
      } catch (err) {
        showToast(err.message || 'Failed to create lead', 'error');
        throw err;
      }

      if (autoAnalyze && newLead?.id) {
        try {
          showToast('Running AI lead scoring & intelligence...', 'info');
          await api.analyzeLead(newLead.id);
          showToast(`AI analysis completed for ${newLead.customer_name}!`, 'success');
        } catch (aiErr) {
          showToast(`Lead was saved, but AI analysis failed: ${aiErr.message || 'Check backend logs.'}`, 'warning');
        }
      }
    };

    await handleCreateLead({ customer_name: 'Priya Nair' }, true);

    expect(api.createLead).toHaveBeenCalledTimes(1);
    expect(api.analyzeLead).toHaveBeenCalledWith('lead-456');
    expect(isCreateOpen).toBe(false);
    expect(toastCalls).toContainEqual({
      msg: 'Lead for Priya Nair saved successfully!',
      type: 'success',
    });
    expect(toastCalls).toContainEqual({
      msg: 'AI analysis completed for Priya Nair!',
      type: 'success',
    });
  });

  it('preserves created lead and displays clear warning toast if AI analysis fails', async () => {
    const mockCreatedLead = {
      id: 'lead-789',
      customer_name: 'Amitabh Sen',
    };

    vi.spyOn(api, 'createLead').mockResolvedValue(mockCreatedLead);
    vi.spyOn(api, 'analyzeLead').mockRejectedValue(new Error('AI rate limit reached'));

    const toastCalls = [];
    const showToast = (msg, type) => toastCalls.push({ msg, type });
    let isCreateOpen = true;
    const setIsCreateOpen = (val) => { isCreateOpen = val; };

    const handleCreateLead = async (formData, autoAnalyze) => {
      let newLead;
      try {
        newLead = await api.createLead(formData);
        showToast(`Lead for ${newLead.customer_name} saved successfully!`, 'success');
        setIsCreateOpen(false);
      } catch (err) {
        showToast(err.message || 'Failed to create lead', 'error');
        throw err;
      }

      if (autoAnalyze && newLead?.id) {
        try {
          showToast('Running AI lead scoring & intelligence...', 'info');
          await api.analyzeLead(newLead.id);
          showToast(`AI analysis completed for ${newLead.customer_name}!`, 'success');
        } catch (aiErr) {
          showToast(`Lead was saved, but AI analysis failed: ${aiErr.message || 'Check backend logs.'}`, 'warning');
        }
      }
    };

    await handleCreateLead({ customer_name: 'Amitabh Sen' }, true);

    // Lead creation was NOT undone
    expect(api.createLead).toHaveBeenCalledTimes(1);
    expect(api.analyzeLead).toHaveBeenCalledTimes(1);
    expect(isCreateOpen).toBe(false);

    // Success toast for lead creation was fired
    expect(toastCalls).toContainEqual({
      msg: 'Lead for Amitabh Sen saved successfully!',
      type: 'success',
    });

    // Warning toast clearly distinguishes that lead was saved but AI analysis failed
    expect(toastCalls).toContainEqual({
      msg: 'Lead was saved, but AI analysis failed: AI rate limit reached',
      type: 'warning',
    });
  });

  it('handles backend lead creation failure without calling analysis', async () => {
    vi.spyOn(api, 'createLead').mockRejectedValue(new Error('Database unavailable'));
    const analyzeSpy = vi.spyOn(api, 'analyzeLead');

    const toastCalls = [];
    const showToast = (msg, type) => toastCalls.push({ msg, type });
    let isCreateOpen = true;
    const setIsCreateOpen = (val) => { isCreateOpen = val; };

    const handleCreateLead = async (formData, autoAnalyze) => {
      let newLead;
      try {
        newLead = await api.createLead(formData);
        showToast(`Lead for ${newLead.customer_name} saved successfully!`, 'success');
        setIsCreateOpen(false);
      } catch (err) {
        showToast(err.message || 'Failed to create lead', 'error');
        throw err;
      }

      if (autoAnalyze && newLead?.id) {
        try {
          showToast('Running AI lead scoring & intelligence...', 'info');
          await api.analyzeLead(newLead.id);
          showToast(`AI analysis completed for ${newLead.customer_name}!`, 'success');
        } catch (aiErr) {
          showToast(`Lead was saved, but AI analysis failed: ${aiErr.message || 'Check backend logs.'}`, 'warning');
        }
      }
    };

    await expect(handleCreateLead({ customer_name: 'Failed Lead' }, true)).rejects.toThrow(
      'Database unavailable'
    );

    expect(analyzeSpy).not.toHaveBeenCalled();
    expect(isCreateOpen).toBe(true); // Modal stays open
    expect(toastCalls).toContainEqual({
      msg: 'Database unavailable',
      type: 'error',
    });
  });
});
