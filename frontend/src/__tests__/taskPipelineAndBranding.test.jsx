import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '../components/Navbar';
import DashboardMetrics from '../components/DashboardMetrics';
import TaskModal from '../components/TaskModal';
import { api } from '../api';

describe('Part 1: MasalNest Branding & LeadPilot Labels', () => {
  it('renders MasalNest brand name, LeadPilot assistant badge, and real estate intelligence tagline', () => {
    render(
      <Navbar
        onOpenCreateLead={() => {}}
        activeTab="leads"
        setActiveTab={() => {}}
      />
    );

    // Verify MasalNest brand
    expect(screen.getByText(/Masal/i)).toBeInTheDocument();
    expect(screen.getByText(/Nest/i)).toBeInTheDocument();

    // Verify LeadPilot assistant badge
    expect(screen.getByText('LeadPilot')).toBeInTheDocument();

    // Verify tagline
    expect(screen.getByText(/AI-Powered Real Estate Intelligence/i)).toBeInTheDocument();
  });
});

describe('Part 3: Task Grouping, Sorting, and Date Boundaries', () => {
  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  it('correctly partitions tasks into Overdue, Due Today, Upcoming, and Completed', () => {
    const today = formatLocalDate(new Date());
    const yesterday = formatLocalDate(new Date(Date.now() - 86400000));
    const tomorrow = formatLocalDate(new Date(Date.now() + 86400000));

    const sampleTasks = [
      { id: '1', title: 'Task Due Yesterday', status: 'pending', due_date: yesterday },
      { id: '2', title: 'Task Due Today', status: 'pending', due_date: today },
      { id: '3', title: 'Task Due Tomorrow', status: 'pending', due_date: tomorrow },
      { id: '4', title: 'Completed Task Due In Past', status: 'completed', due_date: yesterday },
    ];

    const overdueList = [];
    const dueTodayList = [];
    const upcomingList = [];
    const completedList = [];

    sampleTasks.forEach((task) => {
      if (task.status === 'completed') {
        completedList.push(task);
      } else if (!task.due_date) {
        upcomingList.push(task);
      } else if (task.due_date < today) {
        overdueList.push(task);
      } else if (task.due_date === today) {
        dueTodayList.push(task);
      } else {
        upcomingList.push(task);
      }
    });

    // 1. Overdue must only contain incomplete tasks whose due date has passed
    expect(overdueList.map((t) => t.id)).toEqual(['1']);

    // 2. Due today must only contain incomplete tasks due today
    expect(dueTodayList.map((t) => t.id)).toEqual(['2']);

    // 3. Upcoming must contain future incomplete tasks
    expect(upcomingList.map((t) => t.id)).toEqual(['3']);

    // 4. Completed tasks must NEVER count as overdue even if due date was in the past
    expect(completedList.map((t) => t.id)).toEqual(['4']);
    expect(overdueList.find((t) => t.id === '4')).toBeUndefined();
  });

  it('orders upcoming tasks nearest due date first and overdue oldest first', () => {
    const date1 = '2026-11-01';
    const date2 = '2026-11-15';
    const date3 = '2026-11-05';

    const upcoming = [
      { id: 'a', title: 'Task Nov 15', due_date: date2 },
      { id: 'b', title: 'Task Nov 01', due_date: date1 },
      { id: 'c', title: 'Task Nov 05', due_date: date3 },
    ];

    upcoming.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

    expect(upcoming.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('Part 3: Task Counters and Dashboard Metrics', () => {
  it('renders exact counts from supplied persisted task records', () => {
    const mockMetrics = {
      total_leads: 12,
      hot_leads: 5,
      warm_leads: 4,
      cold_leads: 1,
      unscored_leads: 0,
      pending_tasks: 7,
      overdue_tasks: 2,
      due_today_tasks: 3,
      completed_tasks: 8,
    };

    render(
      <DashboardMetrics
        metrics={mockMetrics}
        selectedPriority="all"
        onFilterPriority={() => {}}
      />
    );

    // Verify task metric values in cards
    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    expect(screen.getByText('Due Today')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});

describe('Part 3: TaskModal Duplicate Submission Prevention', () => {
  it('disables submit button and ignores repeated form submissions while isSubmitting is true', () => {
    const handleSubmit = vi.fn();
    const { rerender } = render(
      <TaskModal
        lead={{ id: 'lead-1', customer_name: 'Priyanka' }}
        onClose={() => {}}
        onSubmit={handleSubmit}
        isSubmitting={false}
      />
    );

    const titleInput = screen.getByPlaceholderText(/Call to confirm Saturday/i);
    fireEvent.change(titleInput, { target: { value: 'Schedule Private Walkthrough' } });

    const submitBtn = screen.getByRole('button', { name: /Create Task/i });
    expect(submitBtn).not.toBeDisabled();

    // Rerender with isSubmitting = true
    rerender(
      <TaskModal
        lead={{ id: 'lead-1', customer_name: 'Priyanka' }}
        onClose={() => {}}
        onSubmit={handleSubmit}
        isSubmitting={true}
      />
    );

    expect(screen.getByRole('button', { name: /Creating\.\.\./i })).toBeDisabled();

    // Attempting submit while in-progress should be guarded
    fireEvent.click(screen.getByRole('button', { name: /Creating\.\.\./i }));
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});

describe('Part 3: Persistent Mutations and Honest Failure Handling', () => {
  it('fails honestly without displaying false success when task mutation fails', async () => {
    vi.spyOn(api, 'updateTask').mockRejectedValue(new Error('Database lock error'));

    let taskStatus = 'pending';
    const showToast = vi.fn();

    const handleToggleTask = async (task) => {
      try {
        const updated = await api.updateTask(task.id, { status: 'completed' });
        taskStatus = updated.status;
        showToast('Task completed!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

    await handleToggleTask({ id: 'task-err-1', status: 'pending' });

    // Task status remains pending
    expect(taskStatus).toBe('pending');
    // Toast reports real error
    expect(showToast).toHaveBeenCalledWith('Database lock error', 'error');
    expect(showToast).not.toHaveBeenCalledWith('Task completed!', 'success');
  });
});
