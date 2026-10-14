import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, ArrowUpDown, Plus, Sparkles, CheckSquare, 
  RefreshCw, AlertCircle, Phone, Mail, MapPin, Calendar, Clock,
  ChevronRight, CheckCircle2, AlertTriangle, Layers
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
import Toast from './components/Toast';

export default function App() {
  // Navigation & View
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'tasks'

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskModalLead, setTaskModalLead] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

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
      const analysisResult = await api.analyzeLead(leadId);
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
    try {
      const newLead = await api.createLead(formData);
      showToast(`Lead for ${newLead.customer_name} captured!`, 'success');
      setIsCreateOpen(false);

      if (autoAnalyze) {
        showToast('Running AI lead scoring...', 'info');
        handleAnalyzeLead(newLead.id);
      }

      await fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to create lead', 'error');
    } finally {
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
    setIsSubmitting(true);
    try {
      await api.createTask(taskData);
      showToast('Follow-up task created!', 'success');
      setIsTaskModalOpen(false);
      setTaskModalLead(null);
      await fetchDashboardData();
      if (detailLead) {
        await refreshDetailLead(detailLead.id);
      }
      if (activeTab === 'tasks') {
        await fetchTasksData();
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
      await api.updateTask(task.id, { status: newStatus });
      showToast(newStatus === 'completed' ? 'Task completed!' : 'Task marked pending', 'success');
      await fetchDashboardData();
      if (detailLead) {
        await refreshDetailLead(detailLead.id);
      }
      if (activeTab === 'tasks') {
        await fetchTasksData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update task', 'error');
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
    // fetch full detail
    await refreshDetailLead(lead.id);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navbar */}
      <Navbar
        onOpenCreateLead={() => setIsCreateOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: 1360, width: '100%', margin: '0 auto', padding: '24px', flex: 1 }}>
        {/* Backend Error Banner */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={20} color="#f43f5e" />
              <div>
                <p style={{ fontSize: '0.88rem', color: '#fda4af', fontWeight: 600 }}>
                  Backend Connection Notice
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {error}
                </p>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>
              <RefreshCw size={13} /> Retry Connection
            </button>
          </div>
        )}

        {/* Dashboard Metrics (Visible on both views) */}
        <DashboardMetrics
          metrics={metrics}
          selectedPriority={selectedPriority}
          onFilterPriority={(p) => setSelectedPriority(p)}
        />

        {/* TAB 1: LEADS PIPELINE */}
        {activeTab === 'leads' && (
          <div>
            {/* Filter & Search Bar */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Search by customer name, location, requirement, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 36 }}
                />
              </div>

              {/* Filter Controls */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                {/* Priority Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority:</span>
                  <select
                    className="select"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    style={{ width: 'auto', padding: '8px 12px' }}
                  >
                    <option value="all">All Priorities</option>
                    <option value="hot">🔥 Hot (≥ 70)</option>
                    <option value="warm">⚡ Warm (40-69)</option>
                    <option value="cold">❄️ Cold (&lt; 40)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
                  <select
                    className="select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ width: 'auto', padding: '8px 12px' }}
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sort by:</span>
                  <select
                    className="select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: 'auto', padding: '8px 12px' }}
                  >
                    <option value="priority_score">Priority Score</option>
                    <option value="created_at">Date Created</option>
                    <option value="customer_name">Customer Name</option>
                  </select>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    style={{ padding: '8px 10px' }}
                  >
                    <ArrowUpDown size={14} />
                    {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                  </button>
                </div>
              </div>
            </div>

            {/* Lead Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <RefreshCw size={32} color="var(--brand-primary)" className="animate-spin" />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 12 }}>
                  Loading prioritized leads pipeline...
                </p>
              </div>
            ) : leads.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-subtle)',
              }}>
                <Sparkles size={40} color="var(--brand-primary)" style={{ marginBottom: 14 }} />
                <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: 6 }}>
                  No Matching Leads Found
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 440, margin: '0 auto 18px' }}>
                  {searchQuery || selectedPriority !== 'all' || selectedStatus !== 'all'
                    ? 'Try clearing your search query or adjusting your filters to see more leads.'
                    : 'Get started by capturing your first inbound customer lead or importing inquiries.'}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus size={16} /> Capture Inbound Lead
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 16,
              }}>
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
            )}
          </div>
        )}

        {/* TAB 2: TASKS VIEW */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>Follow-up Task Pipeline</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Manage scheduled calls, site visits, and follow-ups across all customer accounts.
                </p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setTaskModalLead(null);
                  setIsTaskModalOpen(true);
                }}
              >
                <Plus size={14} /> Add New Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-subtle)',
              }}>
                <CheckSquare size={36} color="var(--brand-primary)" style={{ marginBottom: 12 }} />
                <h4 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: 4 }}>No Follow-up Tasks</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>
                  Create tasks manually or ask the Sales Copilot to auto-schedule site visits.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsTaskModalOpen(true)}
                >
                  <Plus size={14} /> Create First Task
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                  return (
                    <div
                      key={task.id}
                      className="card"
                      style={{
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                        borderColor: isOverdue ? 'rgba(239, 68, 68, 0.4)' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => handleToggleTask(task)}
                          style={{
                            width: 18,
                            height: 18,
                            cursor: 'pointer',
                            accentColor: 'var(--brand-primary)',
                          }}
                        />
                        <div>
                          <p style={{
                            fontSize: '0.92rem',
                            fontWeight: 600,
                            color: task.status === 'completed' ? 'var(--text-muted)' : '#ffffff',
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          }}>
                            {task.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                            {task.lead_name && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                                Lead: {task.lead_name}
                              </span>
                            )}
                            {task.description && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {task.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                        }}>
                          {task.action_type}
                        </span>

                        {task.due_date && (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: isOverdue ? '#f43f5e' : 'var(--text-secondary)',
                          }}>
                            <Calendar size={13} />
                            {isOverdue && '⚠️ '}
                            Due {task.due_date}
                          </span>
                        )}

                        <span className={`badge-status status-${task.status}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: Lead Detail */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onAnalyze={handleAnalyzeLead}
          isAnalyzing={analyzingId === detailLead.id}
          onOpenCallBrief={(l) => setCallBriefLead(l)}
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

      {/* DRAWER: Sales Copilot Chat */}
      {chatLead && (
        <ChatDrawer
          lead={chatLead}
          onClose={() => setChatLead(null)}
          showToast={showToast}
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
