import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorsTab } from '@/components/super-admin/ErrorsTab';
import { useToast } from '@/hooks/use-toast';
import * as useSuperAdminModule from '@/hooks/useSuperAdmin';
import * as errorReportingModule from '@/lib/error-handling/reporting';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/useSuperAdmin');
jest.mock('@/lib/error-handling/reporting', () => ({
  reportError: jest.fn().mockResolvedValue(undefined),
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

describe('ErrorsTab', () => {
  const mockErrors = [
    {
      id: 'error-1',
      error_type: 'TypeError',
      error_message: 'Cannot read property of undefined',
      stack_trace: 'at ComponentA.render (Component.tsx:25:10)',
      severity: 'high' as const,
      user_id: 'user-123',
      business_id: 'biz-123',
      url: 'https://app.example.com/dashboard',
      user_agent: 'Mozilla/5.0',
      metadata: { component: 'Dashboard' },
      resolved: false,
      resolved_by: null,
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: 'error-2',
      error_type: 'NetworkError',
      error_message: 'Failed to fetch data',
      stack_trace: null,
      severity: 'critical' as const,
      user_id: null,
      business_id: null,
      url: null,
      user_agent: null,
      metadata: null,
      resolved: false,
      resolved_by: null,
      resolved_at: null,
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    },
    {
      id: 'error-3',
      error_type: 'ValidationError',
      error_message: 'Invalid email format',
      stack_trace: 'at validateEmail (validation.ts:15:5)',
      severity: 'low' as const,
      user_id: 'user-456',
      business_id: 'biz-456',
      url: 'https://app.example.com/signup',
      user_agent: 'Chrome/120.0',
      metadata: { field: 'email' },
      resolved: true,
      resolved_by: 'admin-123',
      resolved_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
  ];

  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useSuperAdminModule.useSystemErrors as jest.Mock).mockReturnValue({
      data: mockErrors.filter(e => !e.resolved),
      isLoading: false,
      refetch: mockRefetch,
    });

    (useSuperAdminModule.useResolveError as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('renders the error tracking header', () => {
      render(<ErrorsTab />);

      expect(screen.getByText('Error Tracking')).toBeInTheDocument();
      expect(screen.getByText(/monitor and resolve system errors and exceptions/i)).toBeInTheDocument();
    });

    it('shows loading spinner while loading', () => {
      (useSuperAdminModule.useSystemErrors as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        refetch: mockRefetch,
      });

      render(<ErrorsTab />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays error count in card title', () => {
      render(<ErrorsTab />);

      expect(screen.getByText('System Errors (2)')).toBeInTheDocument();
    });

    it('renders create test error button', () => {
      render(<ErrorsTab />);

      expect(screen.getByRole('button', { name: /create test error/i })).toBeInTheDocument();
    });
  });

  describe('Error Table', () => {
    it('displays all table headers', () => {
      render(<ErrorsTab />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Business')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Occurred')).toBeInTheDocument();
    });

    it('displays error data correctly', () => {
      render(<ErrorsTab />);

      expect(screen.getByText('Cannot read property of undefined')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });

    it('shows severity badges with correct styling', () => {
      render(<ErrorsTab />);

      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('displays error type as code block', () => {
      render(<ErrorsTab />);

      expect(screen.getByText('TypeError')).toBeInTheDocument();
      expect(screen.getByText('NetworkError')).toBeInTheDocument();
    });

    it('shows Active badge for unresolved errors', () => {
      render(<ErrorsTab />);

      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBe(2);
    });

    it('shows truncated business ID', () => {
      render(<ErrorsTab />);

      expect(screen.getByText('biz-123...')).toBeInTheDocument();
    });

    it('shows dash for errors without business ID', () => {
      render(<ErrorsTab />);

      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('shows relative occurrence time', () => {
      render(<ErrorsTab />);

      expect(screen.getAllByText(/ago/i).length).toBeGreaterThan(0);
    });
  });

  describe('Tab Filtering', () => {
    it('defaults to showing unresolved errors', () => {
      render(<ErrorsTab />);

      expect(screen.getByRole('tab', { name: /unresolved/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('switches to show all errors when clicking All tab', async () => {
      const user = userEvent.setup();

      // Mock to return all errors when showResolved is true
      (useSuperAdminModule.useSystemErrors as jest.Mock).mockImplementation((resolved) => ({
        data: resolved === undefined ? mockErrors : mockErrors.filter(e => !e.resolved),
        isLoading: false,
        refetch: mockRefetch,
      }));

      render(<ErrorsTab />);

      await user.click(screen.getByRole('tab', { name: /^all$/i }));

      await waitFor(() => {
        expect(useSuperAdminModule.useSystemErrors).toHaveBeenCalled();
      });
    });
  });

  describe('Error Details Dialog', () => {
    it('opens error details dialog on View button click', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument();
        expect(screen.getByText('Full error information and stack trace')).toBeInTheDocument();
      });
    });

    it('displays severity in error dialog', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        // Multiple severity badges may exist
        const severityBadges = screen.getAllByText('high');
        expect(severityBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays error message in dialog', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error Message')).toBeInTheDocument();
      });
    });

    it('displays stack trace when available', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Stack Trace')).toBeInTheDocument();
        expect(screen.getByText(/ComponentA\.render/)).toBeInTheDocument();
      });
    });

    it('displays URL when available', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('URL')).toBeInTheDocument();
        expect(screen.getByText('https://app.example.com/dashboard')).toBeInTheDocument();
      });
    });

    it('displays metadata when available', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Metadata')).toBeInTheDocument();
      });
    });

    it('shows Mark as Resolved button for unresolved errors', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as resolved/i })).toBeInTheDocument();
      });
    });

    it('closes dialog on Close button click', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /close/i }));

      await waitFor(() => {
        expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Resolving Errors', () => {
    it('calls resolve mutation when Mark as Resolved is clicked', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
      (useSuperAdminModule.useResolveError as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as resolved/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /mark as resolved/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('error-1');
      });
    });

    it('shows Resolving... text when mutation is pending', async () => {
      (useSuperAdminModule.useResolveError as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      });

      const user = userEvent.setup();
      render(<ErrorsTab />);

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Resolving...')).toBeInTheDocument();
      });
    });
  });

  describe('Create Test Error', () => {
    it('creates test error on button click', async () => {
      const user = userEvent.setup();
      render(<ErrorsTab />);

      await user.click(screen.getByRole('button', { name: /create test error/i }));

      await waitFor(() => {
        expect(errorReportingModule.reportError).toHaveBeenCalled();
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Test Error Created',
        }));
      });
    });

    it('refetches errors after creating test error', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<ErrorsTab />);

      await user.click(screen.getByRole('button', { name: /create test error/i }));

      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Empty States', () => {
    it('shows empty state for unresolved errors', () => {
      (useSuperAdminModule.useSystemErrors as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      render(<ErrorsTab />);

      expect(screen.getByText('No unresolved errors')).toBeInTheDocument();
    });

    it('shows empty state for all errors when filter is All', async () => {
      (useSuperAdminModule.useSystemErrors as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      const user = userEvent.setup();
      render(<ErrorsTab />);

      await user.click(screen.getByRole('tab', { name: /^all$/i }));

      await waitFor(() => {
        expect(screen.getByText('No errors found')).toBeInTheDocument();
      });
    });
  });

  describe('Severity Color Coding', () => {
    it('applies correct color class for critical severity', () => {
      render(<ErrorsTab />);

      const criticalBadge = screen.getByText('critical');
      expect(criticalBadge).toHaveClass('bg-red-500');
    });

    it('applies correct color class for high severity', () => {
      render(<ErrorsTab />);

      const highBadge = screen.getByText('high');
      expect(highBadge).toHaveClass('bg-orange-500');
    });
  });
});
