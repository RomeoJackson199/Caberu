import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as useSuperAdminModule from '@/hooks/useSuperAdmin';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/useSuperAdmin');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({}),
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'test-admin' } } } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-admin' } } }),
    },
    from: jest.fn(),
    rpc: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
      unsubscribe: jest.fn(),
    })),
    storage: {
      listBuckets: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('SuperAdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Default: user is super admin
    (useSuperAdminModule.useIsSuperAdmin as jest.Mock).mockReturnValue({
      data: true,
      isLoading: false,
      error: null,
    });

    // Mock system stats for OverviewTab
    (useSuperAdminModule.useSystemStats as jest.Mock).mockReturnValue({
      data: {
        total_businesses: 25,
        active_businesses: 20,
        total_users: 150,
        total_appointments: 500,
        appointments_today: 15,
        unresolved_errors: 3,
        critical_errors: 1,
        users_joined_this_month: 12,
        businesses_created_this_month: 5,
      },
      isLoading: false,
    });

    // Mock all other hooks with defaults
    (useSuperAdminModule.useAllBusinesses as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    (useSuperAdminModule.useAllUsers as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    (useSuperAdminModule.useSystemErrors as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    (useSuperAdminModule.useResolveError as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (useSuperAdminModule.useAuditLogs as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    (useSuperAdminModule.useCreateBusinessForUser as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
  });

  describe('Access Control', () => {
    it('shows loading spinner while checking super admin status', () => {
      (useSuperAdminModule.useIsSuperAdmin as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderWithRouter(<SuperAdminDashboard />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('redirects non-super-admin users to home page', async () => {
      (useSuperAdminModule.useIsSuperAdmin as jest.Mock).mockReturnValue({
        data: false,
        isLoading: false,
        error: null,
      });

      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('shows error message when super admin check fails', () => {
      (useSuperAdminModule.useIsSuperAdmin as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to verify'),
      });

      renderWithRouter(<SuperAdminDashboard />);

      expect(screen.getByText(/failed to verify super admin status/i)).toBeInTheDocument();
    });

    it('renders dashboard for authenticated super admin', async () => {
      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Header', () => {
    it('displays dashboard title and description', async () => {
      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText(/system oversight and management/i)).toBeInTheDocument();
      });
    });

    it('shows warning banner about audit logging', async () => {
      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/all actions are logged and audited/i)).toBeInTheDocument();
      });
    });

    it('displays sign out button', async () => {
      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });
    });

    it('handles sign out successfully', async () => {
      const user = userEvent.setup();
      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Signed out',
        }));
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('handles sign out error gracefully', async () => {
      (supabase.auth.signOut as jest.Mock).mockRejectedValueOnce(new Error('Sign out failed'));

      const user = userEvent.setup();
      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Error',
          variant: 'destructive',
        }));
      });
    });
  });

  describe('Tab Navigation', () => {
    it('renders all main tabs', async () => {
      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /businesses/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /errors/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /email test/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /audit logs/i })).toBeInTheDocument();
      });
    });

    it('defaults to overview tab', async () => {
      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        expect(overviewTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('switches to businesses tab on click', async () => {
      const user = userEvent.setup();

      // Mock useAllBusinesses for businesses tab
      (useSuperAdminModule.useAllBusinesses as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /businesses/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /businesses/i }));

      await waitFor(() => {
        expect(screen.getByText('Business Management')).toBeInTheDocument();
      });
    });

    it('switches to users tab on click', async () => {
      const user = userEvent.setup();

      // Mock useAllUsers for users tab
      (useSuperAdminModule.useAllUsers as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /users/i }));

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument();
      });
    });

    it('switches to errors tab on click', async () => {
      const user = userEvent.setup();

      // Mock useSystemErrors for errors tab
      (useSuperAdminModule.useSystemErrors as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      });
      (useSuperAdminModule.useResolveError as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /errors/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /errors/i }));

      await waitFor(() => {
        expect(screen.getByText('Error Tracking')).toBeInTheDocument();
      });
    });

    it('switches to audit logs tab on click', async () => {
      const user = userEvent.setup();

      // Mock useAuditLogs for audit tab
      (useSuperAdminModule.useAuditLogs as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithRouter(<SuperAdminDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /audit logs/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /audit logs/i }));

      await waitFor(() => {
        // Look for unique content from AuditLogsTab
        expect(screen.getByText(/complete audit trail of all super admin actions/i)).toBeInTheDocument();
      });
    });
  });
});
