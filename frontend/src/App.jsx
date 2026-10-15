import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, ArrowUpDown, Plus, Sparkles, CheckSquare, 
  RefreshCw, AlertCircle, Calendar, Clock,
  ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, Layers,
  LayoutGrid, List, MessageSquare, Bot, Eye, MapPin, Zap
} from 'lucide-react';
import { api } from './api';
import Navbar from './components/Navbar';
import DashboardMetrics from './components/DashboardMetrics';
import LeadCard from './components/LeadCard';
import LeadDetailModal from './components/LeadDetailModal';
import CallBriefModal from './components/CallBriefModal';
import ChatDrawer from './components/ChatDrawer';
import CreateLeadModal from './components/CreateLeadModal';
import TaskModal from './components/TaskModal';
import LogInteractionModal from './components/LogInteractionModal';
import Toast from './components/Toast';
import MarketInsights from './components/MarketInsights';

export default function App() {
  // Navigation & View
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'tasks' | 'insights'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Data
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('priority_score');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals & Drawers
  const [detailLead, setDetailLead] = useState(null);
  const [chatLead, setChatLead] = useState(null);
  const [callBriefLead, setCallBriefLead] = useState(null);
  const [logInteractionLead, setLogInteractionLead] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskModalLead, setTaskModalLead] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCompletedTasksOpen, setIsCompletedTasksOpen] = useState(false);

  // Action states
  const [analyzingId, setAnalyzingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load metrics & leads
  const fetchDashboardData = useCallback(async () => {
    try {
      const [metricsData, leadsData] = await Promise.all([
        api.getDashboardMetrics(),
        api.getLeads({
          search: searchQuery,
          priority: selectedPriority,
          status: selectedStatus,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
      ]);
      setMetrics(metricsData);
      setLeads(leadsData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedPriority, selectedStatus, sortBy, sortOrder]);

  // Load all tasks (for tasks tab)
  const fetchTasksData = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasksData();
    }
  }, [activeTab, fetchTasksData]);

  // Refresh single lead in detail view
  const refreshDetailLead = async (leadId) => {
    try {
      const updated = await api.getLead(leadId);
      setDetailLead(updated);
    } catch (err) {
      console.error('Failed to refresh lead detail:', err);
    }
  };

  // Run AI Lead Analysis
  const handleAnalyzeLead = async (leadId) => {
    setAnalyzingId(leadId);
    try {
      await api.analyzeLead(leadId);
      showToast('Lead analysis completed successfully!', 'success');
      await fetchDashboardData();
      if (detailLead && detailLead.id === leadId) {
        await refreshDetailLead(leadId);
      }
    } catch (err) {
      showToast(err.message || 'Analysis failed. Check backend logs and GROQ_API_KEY.', 'error');
    } finally {
      setAnalyzingId(null);
    }
  };

  // Create Lead
  const handleCreateLead = async (formData, autoAnalyze) => {
    setIsSubmitting(true);
    let newLead;
    try {
      newLead = await api.createLead(formData);
      showToast(`Lead for ${newLead.customer_name} saved successfully!`, 'success');
      setIsCreateOpen(false);
      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to create lead', 'error');
      setIsSubmitting(false);
      throw err;
    }

    if (autoAnalyze && newLead?.id) {
      setAnalyzingId(newLead.id);
      try {
        showToast('Running AI lead scoring & intelligence...', 'info');
        await api.analyzeLead(newLead.id);
        showToast(`AI analysis completed for ${newLead.customer_name}!`, 'success');
        await fetchDashboardData();
        if (detailLead && detailLead.id === newLead.id) {
          await refreshDetailLead(newLead.id);
        }
      } catch (aiErr) {
        console.error('Auto-analysis failed after lead creation:', aiErr);
        showToast(`Lead was saved, but AI analysis failed: ${aiErr.message || 'Check backend logs.'}`, 'warning');
      } finally {
        setAnalyzingId(null);
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  // Update Lead
  const handleUpdateLead = async (leadId, updateData) => {
    const updated = await api.updateLead(leadId, updateData);
    await fetchDashboardData();
    if (detailLead && detailLead.id === leadId) {
      await refreshDetailLead(leadId);
    }
    return updated;
  };

  // Create Task
  const handleCreateTask = async (taskData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await api.createTask(taskData);
      showToast(`Follow-up task '${created.title}' created!`, 'success');
      setIsTaskModalOpen(false);
      setTaskModalLead(null);
      await fetchDashboardData();
      await fetchTasksData();
      if (detailLead) {
        await refreshDetailLead(detailLead.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateTask(task.id, { status: newStatus });
      showToast(newStatus === 'completed' ? 'Task completed!' : 'Task reopened as pending', 'success');
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      await fetchDashboardData();
      await fetchTasksData();
      if (detailLead) {
        await refreshDetailLead(detailLead.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update task status on server', 'error');
    }
  };

  // Reschedule Task
  const handleRescheduleTask = async (task, daysToAdd = 1) => {
    try {
      const now = new Date();
      const currentDue = task.due_date ? new Date(task.due_date) : now;
      const base = currentDue < now ? now : currentDue;
      const targetDate = new Date(base.getTime() + daysToAdd * 86400000);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const newDueStr = `${year}-${month}-${day}`;

      const updated = await api.updateTask(task.id, { due_date: newDueStr, status: 'pending' });
      showToast(`Task rescheduled to ${newDueStr}`, 'success');
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      await fetchDashboardData();
      await fetchTasksData();
      if (detailLead) {
        await refreshDetailLead(detailLead.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to reschedule task', 'error');
    }
  };

  // Open task modal for specific lead
  const handleOpenAddTask = (lead) => {
    setTaskModalLead(lead);
    setIsTaskModalOpen(true);
  };

  // Open detail modal with full payload
  const handleOpenDetail = async (lead) => {
    setDetailLead(lead);
    await refreshDetailLead(lead.id);
  };

  // Format currency for table
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '—';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')} L`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-page)', color: 'var(--color-text-primary)' }}>
      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navbar */}
      <Navbar
        onOpenCreateLead={() => setIsCreateOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: 1360, width: '100%', margin: '0 auto', padding: '24px 20px', flex: 1 }}>
        {/* Backend Error Banner */}
        {error && (
          <div style={{
            background: 'var(--color-danger-subtle)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={18} color="var(--color-danger)" />
              <div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)', fontWeight: 600 }}>
                  Backend Connection Notice
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  {error}
                </p>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>
              <RefreshCw size={13} /> Retry Connection
            </button>
          </div>
        )}

        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
        }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {activeTab === 'leads' && 'Leads Pipeline'}
              {activeTab === 'tasks' && 'Follow-up Tasks'}
              {activeTab === 'insights' && 'Market Insights'}
            </h1>
            {activeTab === 'insights' && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                AI-assisted indicative property price estimates · Not verified appraisal data
              </p>
            )}
          </div>
          {activeTab !== 'insights' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { fetchDashboardData(); fetchTasksData(); }}
              title="Refresh data"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>

        {/* Dashboard Metrics (Leads + Tasks views only) */}
        {activeTab !== 'insights' && (
          <DashboardMetrics
            metrics={metrics}
            selectedPriority={selectedPriority}
            onFilterPriority={(p) => setSelectedPriority(p)}
            tasksOnly={activeTab === 'tasks'}
          />
        )}

        {/* TAB 1: LEADS PIPELINE */}
        {activeTab === 'leads' && (
          <div>
            {/* Filter & Search Bar */}
            <div className="toolbar-flex">
              {/* Search Box */}
              <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Search by name, location, requirement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 32, height: 32, fontSize: 'var(--text-sm)' }}
                />
              </div>

              {/* Filter & View Controls */}
              <div className="toolbar-controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                {/* Priority Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Priority:</span>
                  <select
                    className="select"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    style={{ width: 'auto', padding: '5px 10px', height: 32, fontSize: 'var(--text-xs)' }}
                  >
                    <option value="all">All Priorities</option>
                    <option value="hot">Hot (≥ 70)</option>
                    <option value="warm">Warm (40-69)</option>
                    <option value="cold">Cold (&lt; 40)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Status:</span>
                  <select
                    className="select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ width: 'auto', padding: '5px 10px', height: 32, fontSize: 'var(--text-xs)' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Sort:</span>
                  <select
                    className="select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: 'auto', padding: '5px 10px', height: 32, fontSize: 'var(--text-xs)' }}
                  >
                    <option value="priority_score">Priority Score</option>
                    <option value="created_at">Date Created</option>
                    <option value="customer_name">Customer Name</option>
                  </select>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    style={{ padding: '6px 8px', height: 32, fontSize: 'var(--text-xs)' }}
                  >
                    <ArrowUpDown size={13} />
                    {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                  </button>
                </div>

                {/* View Mode Toggle: Cards vs Table */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--color-surface-subtle)',
                  padding: 2,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}>
                  <button
                    type="button"
                    id="view-mode-cards"
                    data-testid="view-mode-cards"
                    onClick={() => setViewMode('cards')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: viewMode === 'cards' ? 600 : 500,
                      background: viewMode === 'cards' ? 'var(--color-surface)' : 'transparent',
                      color: viewMode === 'cards' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      border: viewMode === 'cards' ? '1px solid var(--color-border)' : '1px solid transparent',
                      borderRadius: 'var(--radius-xs)',
                      boxShadow: viewMode === 'cards' ? 'var(--shadow-xs)' : 'none',
                      cursor: 'pointer',
                    }}
                    title="Card Grid View"
                  >
                    <LayoutGrid size={13} />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    id="view-mode-table"
                    data-testid="view-mode-table"
                    onClick={() => setViewMode('table')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: viewMode === 'table' ? 600 : 500,
                      background: viewMode === 'table' ? 'var(--color-surface)' : 'transparent',
                      color: viewMode === 'table' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      border: viewMode === 'table' ? '1px solid var(--color-border)' : '1px solid transparent',
                      borderRadius: 'var(--radius-xs)',
                      boxShadow: viewMode === 'table' ? 'var(--shadow-xs)' : 'none',
                      cursor: 'pointer',
                    }}
                    title="Dense Data Table View"
                  >
                    <List size={13} />
                    <span>Table</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Leads Presentation */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <RefreshCw size={28} color="var(--color-brand)" className="animate-spin" />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 12 }}>
                  Loading prioritized leads pipeline...
                </p>
              </div>
            ) : leads.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '50px 20px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)',
              }}>
                <Sparkles size={36} color="var(--color-brand)" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                  No Matching Leads Found
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', maxWidth: 420, margin: '0 auto 16px' }}>
                  {searchQuery || selectedPriority !== 'all' || selectedStatus !== 'all'
                    ? 'Try clearing your search query or adjusting your filters to see more leads.'
                    : 'Get started by capturing your first inbound customer lead.'}
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus size={14} /> Capture Inbound Lead
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              /* CARD VIEW */
              <div className="card-grid">
                {leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onSelect={handleOpenDetail}
                    onOpenChat={(l) => setChatLead(l)}
                    onAnalyze={handleAnalyzeLead}
                    analyzingId={analyzingId}
                  />
                ))}
              </div>
            ) : (
              /* DENSE TABLE VIEW */
              <div className="crm-table-container">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th className="crm-th" style={{ width: 140 }}>Priority</th>
                      <th className="crm-th">Customer</th>
                      <th className="crm-th">Location</th>
                      <th className="crm-th">Requirement</th>
                      <th className="crm-th" style={{ textAlign: 'right' }}>Budget</th>
                      <th className="crm-th">Timeline</th>
                      <th className="crm-th">Status</th>
                      <th className="crm-th" style={{ textAlign: 'right', width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const priority = lead.priority_category || 'unscored';
                      const score = lead.priority_score;
                      const hasScore = score !== null && score !== undefined;

                      return (
                        <tr key={lead.id} className="crm-tr">
                          {/* Priority */}
                          <td className="crm-td">
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span className={`badge badge-${priority}`}>
                                <span className="badge-dot" />
                                {priority.toUpperCase()} {hasScore ? score : ''}
                              </span>
                              {lead.is_stale_analysis && (
                                <span className="badge badge-stale" title="Inputs changed since last scoring run">
                                  STALE
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="crm-td">
                            <div>
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(lead)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  fontWeight: 600,
                                  color: 'var(--color-text-primary)',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: 'var(--text-sm)',
                                }}
                              >
                                {lead.customer_name}
                              </button>
                              {lead.phone && (
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  {lead.phone}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="crm-td" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                            {lead.location || '—'}
                          </td>

                          {/* Requirement */}
                          <td 
                            className="crm-td" 
                            style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-xs)' }}
                            title={lead.property_requirement || lead.property_type || undefined}
                          >
                            {lead.property_requirement || lead.property_type || '—'}
                          </td>

                          {/* Budget */}
                          <td className="crm-td" style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-xs)' }}>
                            {formatCurrency(lead.budget)}
                          </td>

                          {/* Timeline */}
                          <td 
                            className="crm-td" 
                            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}
                            title={lead.normalized_timeline && lead.buying_timeline && lead.normalized_timeline !== lead.buying_timeline ? `Stated: ${lead.buying_timeline}` : undefined}
                          >
                            {lead.normalized_timeline || lead.buying_timeline || lead.purchase_timeline || '—'}
                          </td>

                          {/* Status */}
                          <td className="crm-td">
                            <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                              {(lead.followup_status || lead.status || 'new').replace('_', ' ')}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="crm-td" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                              {/* Re-analyze / Score button */}
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => handleAnalyzeLead(lead.id)}
                                disabled={analyzingId === lead.id}
                                title={lead.is_stale_analysis ? "Re-analyze stale lead" : "Run AI scoring"}
                              >
                                {analyzingId === lead.id ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : (
                                  <Zap size={11} color="var(--color-brand)" />
                                )}
                                <span>{analyzingId === lead.id ? 'Scoring' : 'Score'}</span>
                              </button>

                              {/* LeadPilot Chat button */}
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => setChatLead(lead)}
                                title="Open LeadPilot Assistant"
                              >
                                <Bot size={12} color="var(--color-brand)" />
                              </button>

                              {/* View Details button */}
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => handleOpenDetail(lead)}
                                title="View Lead Details"
                              >
                                <Eye size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TASKS VIEW */}
        {activeTab === 'tasks' && (() => {
          // Timezone-safe local calendar day string (YYYY-MM-DD)
          const now = new Date();
          const todayYear = now.getFullYear();
          const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
          const todayDate = String(now.getDate()).padStart(2, '0');
          const localTodayStr = `${todayYear}-${todayMonth}-${todayDate}`;

          // Partition tasks into prioritized buckets
          const overdueList = [];
          const dueTodayList = [];
          const upcomingList = [];
          const completedList = [];

          tasks.forEach((task) => {
            if (task.status === 'completed') {
              completedList.push(task);
            } else if (!task.due_date) {
              upcomingList.push(task);
            } else if (task.due_date < localTodayStr) {
              overdueList.push(task);
            } else if (task.due_date === localTodayStr) {
              dueTodayList.push(task);
            } else {
              upcomingList.push(task);
            }
          });

          // Sorting within groups
          overdueList.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '') || (b.created_at || '').localeCompare(a.created_at || ''));
          dueTodayList.sort((a, b) => (a.title || '').localeCompare(b.title || '') || (b.created_at || '').localeCompare(a.created_at || ''));
          upcomingList.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999') || (a.title || '').localeCompare(b.title || ''));
          completedList.sort((a, b) => (b.completed_at || b.updated_at || b.created_at || '').localeCompare(a.completed_at || a.updated_at || a.created_at || ''));

          const renderTaskCard = (task, groupType) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = groupType === 'overdue';
            const isDueToday = groupType === 'due_today';

            return (
              <div
                key={task.id}
                className="card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  backgroundColor: isCompleted ? 'var(--color-surface-subtle)' : 'var(--color-surface)',
                  borderLeft: isOverdue 
                    ? '3px solid var(--color-danger)' 
                    : isDueToday 
                    ? '3px solid var(--color-warning)' 
                    : isCompleted 
                    ? '3px solid var(--color-border)' 
                    : '3px solid var(--color-brand)',
                  opacity: isCompleted ? 0.75 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggleTask(task)}
                    title={isCompleted ? "Reopen task as pending" : "Mark task as completed"}
                    style={{
                      width: 16,
                      height: 16,
                      cursor: 'pointer',
                      accentColor: 'var(--color-brand)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      marginBottom: 2,
                    }}>
                      {task.title}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      {task.lead_name && (
                        <span 
                          onClick={() => {
                            const foundLead = leads.find((l) => l.id === task.lead_id);
                            if (foundLead) handleOpenDetail(foundLead);
                          }}
                          style={{ 
                            fontSize: 'var(--text-xs)', 
                            color: 'var(--color-brand)', 
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Click to view lead details"
                        >
                          Lead: {task.lead_name}
                        </span>
                      )}
                      {task.description && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
                          {task.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                    {task.action_type}
                  </span>

                  {task.due_date && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: isOverdue ? 'var(--color-danger)' : isDueToday ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                    }}>
                      <Calendar size={12} />
                      {isOverdue && 'Overdue: '}
                      {isDueToday && 'Due Today: '}
                      {task.due_date}
                    </span>
                  )}

                  <span className={`badge-status status-${task.status}`}>
                    {task.status}
                  </span>

                  {!isCompleted && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleRescheduleTask(task, 1)}
                      title="Reschedule by +1 day"
                      style={{ fontSize: 'var(--text-xs)', padding: '3px 6px' }}
                    >
                      <Clock size={11} /> +1 Day
                    </button>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}>
                <div>
                  <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', fontWeight: 700, margin: 0 }}>Follow-up Task Pipeline</h2>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Pipeline: Overdue ({overdueList.length}) · Due Today ({dueTodayList.length}) · Upcoming ({upcomingList.length}) · Completed ({completedList.length})
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setTaskModalLead(null);
                    setIsTaskModalOpen(true);
                  }}
                >
                  <Plus size={13} /> Add New Task
                </button>
              </div>

              {tasks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-border)',
                }}>
                  <CheckSquare size={32} color="var(--color-brand)" style={{ marginBottom: 10 }} />
                  <h4 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 4 }}>No Follow-up Tasks</h4>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 14 }}>
                    Create tasks manually or ask LeadPilot in chat to schedule calls and site visits.
                  </p>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsTaskModalOpen(true)}
                  >
                    <Plus size={13} /> Create First Task
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* 1. OVERDUE SECTION */}
                  {overdueList.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                        paddingBottom: 6,
                        borderBottom: '1px solid var(--color-danger-border)',
                      }}>
                        <AlertTriangle size={15} color="var(--color-danger)" />
                        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-danger)', margin: 0 }}>
                          Overdue ({overdueList.length})
                        </h3>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          — Incomplete tasks past due date
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {overdueList.map((t) => renderTaskCard(t, 'overdue'))}
                      </div>
                    </div>
                  )}

                  {/* 2. DUE TODAY SECTION */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: '1px solid var(--color-warning-border)',
                    }}>
                      <Calendar size={15} color="var(--color-warning)" />
                      <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-warning)', margin: 0 }}>
                        Due Today ({dueTodayList.length})
                      </h3>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        — Incomplete tasks scheduled for today
                      </span>
                    </div>
                    {dueTodayList.length === 0 ? (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                        No tasks due today. All caught up!
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {dueTodayList.map((t) => renderTaskCard(t, 'due_today'))}
                      </div>
                    )}
                  </div>

                  {/* 3. UPCOMING SECTION */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: '1px solid var(--color-border)',
                    }}>
                      <Clock size={15} color="var(--color-brand)" />
                      <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                        Upcoming ({upcomingList.length})
                      </h3>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        — Future tasks ordered by nearest due date
                      </span>
                    </div>
                    {upcomingList.length === 0 ? (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                        No upcoming tasks scheduled.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {upcomingList.map((t) => renderTaskCard(t, 'upcoming'))}
                      </div>
                    )}
                  </div>

                  {/* 4. COMPLETED SECTION (Collapsible) */}
                  <div style={{
                    background: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                  }}>
                    <div
                      onClick={() => setIsCompletedTasksOpen(!isCompletedTasksOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={15} color="var(--color-success)" />
                        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-success)', margin: 0 }}>
                          Completed Tasks ({completedList.length})
                        </h3>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          — Finished tasks (excluded from overdue & pending)
                        </span>
                      </div>
                      <button
                        className="btn btn-ghost btn-xs"
                        style={{ padding: 4 }}
                        title={isCompletedTasksOpen ? "Collapse completed tasks" : "Expand completed tasks"}
                      >
                        {isCompletedTasksOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>

                    {isCompletedTasksOpen && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {completedList.length === 0 ? (
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                            No completed tasks yet.
                          </p>
                        ) : (
                          completedList.map((t) => renderTaskCard(t, 'completed'))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 3: MARKET INSIGHTS */}
        {activeTab === 'insights' && <MarketInsights />}
      </main>

      {/* MODAL: Lead Detail */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onAnalyze={handleAnalyzeLead}
          isAnalyzing={analyzingId === detailLead.id}
          onOpenCallBrief={(l) => setCallBriefLead(l)}
          onOpenLogInteraction={(l) => setLogInteractionLead(l)}
          onOpenChat={(l) => setChatLead(l)}
          onUpdateLead={handleUpdateLead}
          onAddTask={handleOpenAddTask}
          onToggleTask={handleToggleTask}
          showToast={showToast}
        />
      )}

      {/* MODAL: Call Brief */}
      {callBriefLead && (
        <CallBriefModal
          lead={callBriefLead}
          onClose={() => setCallBriefLead(null)}
          showToast={showToast}
        />
      )}

      {/* MODAL: Log Interaction */}
      {logInteractionLead && (
        <LogInteractionModal
          lead={logInteractionLead}
          onClose={() => setLogInteractionLead(null)}
          onUpdateLead={async (leadId, updates) => {
            await handleUpdateLead(leadId, updates);
            if (detailLead && detailLead.id === leadId) {
              const refreshed = await api.getLead(leadId);
              setDetailLead(refreshed);
            }
          }}
          onAddTask={handleCreateTask}
          showToast={showToast}
        />
      )}

      {/* DRAWER: LeadPilot Chat */}
      {chatLead && (
        <ChatDrawer
          lead={chatLead}
          onClose={() => {
            setChatLead(null);
            fetchDashboardData();
            fetchTasksData();
          }}
          showToast={showToast}
          onTaskMutated={() => {
            fetchTasksData();
            fetchDashboardData();
          }}
        />
      )}

      {/* MODAL: Create Inbound Lead */}
      {isCreateOpen && (
        <CreateLeadModal
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateLead}
          isSubmitting={isSubmitting}
        />
      )}

      {/* MODAL: Add Follow-up Task */}
      {isTaskModalOpen && (
        <TaskModal
          lead={taskModalLead}
          leads={leads}
          onClose={() => {
            setIsTaskModalOpen(false);
            setTaskModalLead(null);
          }}
          onSubmit={handleCreateTask}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
