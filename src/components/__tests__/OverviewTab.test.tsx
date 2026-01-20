import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverviewTab } from '@/components/super-admin/OverviewTab';
import * as useSuperAdminModule from '@/hooks/useSuperAdmin';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/useSuperAdmin');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { db_latency_ms: 5 }, error: null }),
    },
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'test' } } }, error: null }),
    },
    storage: {
      listBuckets: jest.fn().mockResolvedValue({ data: [{ id: 'bucket1' }], error: null }),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        if (callback) callback('SUBSCRIBED');
        return { unsubscribe: jest.fn() };
      }),
      unsubscribe: jest.fn(),
    })),
  },
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

describe('OverviewTab', () => {
  const mockStats = {
    total_businesses: 25,
    active_businesses: 20,
    total_users: 150,
    total_appointments: 500,
    appointments_today: 15,
    unresolved_errors: 3,
    critical_errors: 1,
    users_joined_this_month: 12,
    businesses_created_this_month: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useSuperAdminModule.useSystemStats as jest.Mock).mockReturnValue({
      data: mockStats,
      isLoading: false,
    });
  });

  describe('Rendering', () => {
    it('renders the system overview header', () => {
      render(<OverviewTab />);

      expect(screen.getByText('System Overview')).toBeInTheDocument();
      expect(screen.getByText(/real-time statistics and platform health metrics/i)).toBeInTheDocument();
    });

    it('shows loading spinner while stats are loading', () => {
      (useSuperAdminModule.useSystemStats as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<OverviewTab />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('renders all stat cards with correct values', () => {
      render(<OverviewTab />);

      // Total Businesses
      expect(screen.getByText('Total Businesses')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('20 active')).toBeInTheDocument();

      // Total Users
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('+12 this month')).toBeInTheDocument();

      // Total Appointments
      expect(screen.getByText('Total Appointments')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('15 today')).toBeInTheDocument();

      // System Errors
      expect(screen.getByText('System Errors')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1 critical')).toBeInTheDocument();

      // Monthly Growth
      expect(screen.getByText('Monthly Growth')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('New businesses')).toBeInTheDocument();
    });

    it('shows system health as "Good" when no critical errors', () => {
      (useSuperAdminModule.useSystemStats as jest.Mock).mockReturnValue({
        data: { ...mockStats, critical_errors: 0 },
        isLoading: false,
      });

      render(<OverviewTab />);

      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('All systems operational')).toBeInTheDocument();
    });

    it('shows system health as "Issues" when critical errors exist', () => {
      render(<OverviewTab />);

      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Issues')).toBeInTheDocument();
      expect(screen.getByText('Attention needed')).toBeInTheDocument();
    });

    it('handles zero values gracefully', () => {
      (useSuperAdminModule.useSystemStats as jest.Mock).mockReturnValue({
        data: {
          total_businesses: 0,
          active_businesses: 0,
          total_users: 0,
          total_appointments: 0,
          appointments_today: 0,
          unresolved_errors: 0,
          critical_errors: 0,
          users_joined_this_month: 0,
          businesses_created_this_month: 0,
        },
        isLoading: false,
      });

      render(<OverviewTab />);

      // Should show zeros for values
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('handles null stats gracefully', () => {
      (useSuperAdminModule.useSystemStats as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
      });

      render(<OverviewTab />);

      // Should still render the component
      expect(screen.getByText('System Overview')).toBeInTheDocument();
    });
  });

  describe('Quick Navigation', () => {
    it('renders quick navigation section', () => {
      render(<OverviewTab />);

      expect(screen.getByText('Quick Navigation')).toBeInTheDocument();
      expect(screen.getByText('Jump to administrative sections')).toBeInTheDocument();
    });

    it('displays navigation links to other sections', () => {
      render(<OverviewTab />);

      expect(screen.getByText('Businesses')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });

    it('shows descriptive text for each navigation item', () => {
      render(<OverviewTab />);

      expect(screen.getByText('View & create')).toBeInTheDocument();
      expect(screen.getByText('Search & view')).toBeInTheDocument();
      expect(screen.getByText('Monitor issues')).toBeInTheDocument();
      expect(screen.getByText('Track actions')).toBeInTheDocument();
    });
  });

  describe('Diagnostics Card Integration', () => {
    it('renders the diagnostics card', () => {
      render(<OverviewTab />);

      expect(screen.getByText('System Diagnostics')).toBeInTheDocument();
      expect(screen.getByText(/test connectivity and performance/i)).toBeInTheDocument();
    });

    it('shows all diagnostic test options', () => {
      render(<OverviewTab />);

      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Edge Functions')).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Realtime')).toBeInTheDocument();
    });

    it('has a run all tests button', () => {
      render(<OverviewTab />);

      expect(screen.getByRole('button', { name: /run all tests/i })).toBeInTheDocument();
    });
  });

  describe('Quick Actions Card Integration', () => {
    it('renders the quick actions card', () => {
      render(<OverviewTab />);

      expect(screen.getByText('Admin Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Common administrative tasks and utilities')).toBeInTheDocument();
    });

    it('shows grant super admin section', () => {
      render(<OverviewTab />);

      expect(screen.getByText('Grant Super Admin')).toBeInTheDocument();
      expect(screen.getByText('Dangerous')).toBeInTheDocument();
    });

    it('shows quick email test section', () => {
      render(<OverviewTab />);

      expect(screen.getByText('Quick Email Test')).toBeInTheDocument();
    });

    it('shows utility buttons', () => {
      render(<OverviewTab />);

      expect(screen.getByRole('button', { name: /clear cache/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export info/i })).toBeInTheDocument();
    });
  });

  describe('Stat Card Icons', () => {
    it('renders correct icons for each stat card', () => {
      render(<OverviewTab />);

      // Check that the stat cards section exists
      const statsSection = screen.getByText('Total Businesses').closest('.grid');
      expect(statsSection).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('renders stats in a responsive grid', () => {
      const { container } = render(<OverviewTab />);

      // Check for grid layout classes
      const grids = container.querySelectorAll('.grid');
      expect(grids.length).toBeGreaterThan(0);
    });
  });
});
