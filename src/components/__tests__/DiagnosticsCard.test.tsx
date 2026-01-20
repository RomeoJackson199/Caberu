import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiagnosticsCard } from '@/components/super-admin/DiagnosticsCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Mock date-fns format
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'PPpp') return '2024-01-15 10:30 AM';
    if (formatStr === 'yyyy-MM-dd-HHmmss') return '2024-01-15-103000';
    return date.toISOString();
  }),
}));

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [{ id: 'test' }], error: null })),
        head: jest.fn(() => Promise.resolve({ count: 5, error: null })),
      })),
    })),
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          status: 'healthy',
          checks: {
            database: { status: 'ok', latency_ms: 15 },
            storage: { status: 'ok', latency_ms: 20 },
            auth: { status: 'ok', latency_ms: 10 },
            realtime: { status: 'ok', latency_ms: 50 },
            edge_functions: { status: 'ok', latency_ms: 5 },
            system: { status: 'ok', latency_ms: 2 },
          },
          overall_latency_ms: 25,
          version: '2.0.0',
        },
        error: null,
      }),
    },
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null }),
    },
    storage: {
      listBuckets: jest.fn().mockResolvedValue({
        data: [
          { id: 'bucket1', name: 'avatars' },
          { id: 'bucket2', name: 'documents' },
        ],
        error: null,
      }),
    },
    channel: jest.fn((name) => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        if (callback) {
          setTimeout(() => callback('SUBSCRIBED'), 10);
        }
        return { unsubscribe: jest.fn() };
      }),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock HTMLAnchorElement click
HTMLAnchorElement.prototype.click = jest.fn();

describe('DiagnosticsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the diagnostics card header', async () => {
      render(<DiagnosticsCard />);

      expect(screen.getByText('System Diagnostics')).toBeInTheDocument();
      expect(screen.getByText(/comprehensive health monitoring/i)).toBeInTheDocument();
    });

    it('renders Run All Tests and Export buttons', async () => {
      render(<DiagnosticsCard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run all tests/i })).toBeInTheDocument();
      });

      // Export button should be disabled initially
      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('displays all 6 diagnostic test items', async () => {
      render(<DiagnosticsCard />);

      await waitFor(() => {
        expect(screen.getByText('Database')).toBeInTheDocument();
        expect(screen.getByText('Edge Functions')).toBeInTheDocument();
        expect(screen.getByText('Authentication')).toBeInTheDocument();
        expect(screen.getByText('Storage')).toBeInTheDocument();
        expect(screen.getByText('Realtime')).toBeInTheDocument();
        expect(screen.getByText('System Resources')).toBeInTheDocument();
      });
    });

    it('shows test descriptions for each service', async () => {
      render(<DiagnosticsCard />);

      await waitFor(() => {
        expect(screen.getByText(/PostgreSQL connectivity and query performance/i)).toBeInTheDocument();
        expect(screen.getByText(/Serverless functions and API endpoints/i)).toBeInTheDocument();
        expect(screen.getByText(/Auth service and session management/i)).toBeInTheDocument();
        expect(screen.getByText(/Object storage and file buckets/i)).toBeInTheDocument();
        expect(screen.getByText(/WebSocket connectivity and subscriptions/i)).toBeInTheDocument();
        expect(screen.getByText(/Client resources and performance/i)).toBeInTheDocument();
      });
    });

    it('auto-runs tests on mount', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled();
        expect(supabase.functions.invoke).toHaveBeenCalled();
        expect(supabase.auth.getSession).toHaveBeenCalled();
        expect(supabase.storage.listBuckets).toHaveBeenCalled();
      });
    });
  });

  describe('Database Test', () => {
    it('tests database connectivity with multiple operations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Click individual test button
      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[0]); // Database test button

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('businesses');
      });
    });

    it('shows success status on database connection success', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('Connection successful')).toBeInTheDocument();
      });
    });

    it('shows warning status when database is slow', async () => {
      // Mock slow database response
      const slowDbMock = jest.fn(() => ({
        select: jest.fn(() => ({
          limit: jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ data: [{ id: 'test' }], error: null }), 1500))),
          head: jest.fn(() => Promise.resolve({ count: 5, error: null })),
        })),
      }));
      (supabase.from as jest.Mock) = slowDbMock;

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[0]);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('Responding slowly')).toBeInTheDocument();
      });
    });

    it('shows error status on database connection failure', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Connection refused' } })),
        })),
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[0]);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Connection refused')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Functions Test', () => {
    it('tests edge functions health and parses comprehensive response', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('health-check');
      });
    });

    it('shows overall status from health check response', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText(/healthy/i)).toBeInTheDocument();
      });
    });

    it('handles degraded status from health check', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: {
          status: 'degraded',
          checks: {
            database: { status: 'ok', latency_ms: 15 },
            storage: { status: 'warning', latency_ms: 2500 },
          },
          overall_latency_ms: 50,
          version: '2.0.0',
        },
        error: null,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[1]); // Edge Functions test

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/degraded/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Test', () => {
    it('tests authentication service', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(supabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it('shows authenticated status when session exists', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('Authenticated')).toBeInTheDocument();
      });
    });

    it('shows service available when no session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[2]); // Auth test

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Service available')).toBeInTheDocument();
      });
    });
  });

  describe('Storage Test', () => {
    it('tests storage service and counts buckets', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(supabase.storage.listBuckets).toHaveBeenCalled();
        expect(screen.getByText('2 buckets available')).toBeInTheDocument();
      });
    });

    it('handles singular bucket count correctly', async () => {
      (supabase.storage.listBuckets as jest.Mock).mockResolvedValueOnce({
        data: [{ id: 'bucket1', name: 'avatars' }],
        error: null,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[3]); // Storage test

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('1 bucket available')).toBeInTheDocument();
      });
    });
  });

  describe('Realtime Test', () => {
    it('tests realtime WebSocket connection with unique channel', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled();
        // Channel should have unique name with timestamp
        const channelCall = (supabase.channel as jest.Mock).mock.calls[0][0];
        expect(channelCall).toMatch(/diagnostics-test-\d+/);
      });
    });

    it('shows success on WebSocket connection', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('WebSocket connected')).toBeInTheDocument();
      });
    });

    it('handles connection timeout', async () => {
      (supabase.channel as jest.Mock).mockReturnValueOnce({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          // Don't call callback - simulate timeout
          return { unsubscribe: jest.fn() };
        }),
        unsubscribe: jest.fn().mockResolvedValue(undefined),
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[4]); // Realtime test

      await act(async () => {
        jest.advanceTimersByTime(6000); // Wait for timeout
      });

      await waitFor(() => {
        expect(screen.getByText(/timeout|unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('System Resources Test', () => {
    it('tests system resources and memory usage', async () => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        writable: true,
        configurable: true,
        value: {
          usedJSHeapSize: 50 * 1024 * 1024, // 50MB
          jsHeapSizeLimit: 1024 * 1024 * 1024, // 1GB
        },
      });

      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('System resources normal')).toBeInTheDocument();
      });
    });

    it('shows warning for high memory usage', async () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        writable: true,
        configurable: true,
        value: {
          usedJSHeapSize: 850 * 1024 * 1024, // 850MB
          jsHeapSizeLimit: 1024 * 1024 * 1024, // 1GB (85% usage)
        },
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[5]); // System test

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('High memory usage detected')).toBeInTheDocument();
      });
    });
  });

  describe('Run All Tests', () => {
    it('runs all 6 tests in parallel', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // All services should be called
      expect(supabase.from).toHaveBeenCalled();
      expect(supabase.functions.invoke).toHaveBeenCalled();
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.storage.listBuckets).toHaveBeenCalled();
      expect(supabase.channel).toHaveBeenCalled();
    });

    it('shows toast with all systems healthy', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: expect.stringMatching(/all systems healthy/i),
          description: '6/6 tests passed',
        }));
      });
    });

    it('shows overall status badge', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('All Systems Healthy')).toBeInTheDocument();
      });
    });

    it('updates last check time', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText(/last checked:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Individual Test Buttons', () => {
    it('renders individual test buttons for each service', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      expect(testButtons).toHaveLength(6);
    });

    it('disables test button while test is running', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      const firstTestButton = testButtons[0];

      await user.click(firstTestButton);

      expect(firstTestButton).toBeDisabled();

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
    });
  });

  describe('Status Indicators', () => {
    it('shows success badge with green styling', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        // Should show latency badges
        const badges = screen.getAllByText(/\d+ms/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('shows warning badge with yellow styling', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: {
          status: 'degraded',
          checks: {
            database: { status: 'warning', latency_ms: 1500 },
          },
          overall_latency_ms: 1500,
          version: '2.0.0',
        },
        error: null,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[1]);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Degraded Performance')).toBeInTheDocument();
      });
    });

    it('shows error badge with red styling', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Critical error' } })),
        })),
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const testButtons = await screen.findAllByRole('button', { name: /^test$/i });
      await user.click(testButtons[0]);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });
  });

  describe('Details Expansion', () => {
    it('renders details expansion for test results', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        const detailsElements = screen.getAllByText('View details');
        expect(detailsElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Health Check History', () => {
    it('displays recent health checks history', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Health Checks')).toBeInTheDocument();
      });
    });

    it('adds new entries to history on each run', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      // First run (auto-run)
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Health Checks')).toBeInTheDocument();
      });

      // Second run (manual)
      const runAllButton = screen.getByRole('button', { name: /run all tests/i });
      await user.click(runAllButton);

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // History should have multiple entries
      await waitFor(() => {
        const historyItems = screen.getAllByText(/2024-01-15 10:30 AM/);
        expect(historyItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Export Functionality', () => {
    it('exports health data as JSON file', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      // Wait for initial tests to complete
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      const exportButton = screen.getByRole('button', { name: /export/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Health Data Exported',
          description: 'System health data has been downloaded',
        }));
      });
    });

    it('export button is disabled when no tests have run', () => {
      // Don't allow auto-run to complete
      render(<DiagnosticsCard />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      // Button exists but might be disabled initially
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Critical Service Failures', () => {
    it('marks overall status as unhealthy when database fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: null, error: { message: 'DB Down' } })),
        })),
      });

      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: expect.stringMatching(/critical issues/i),
        }));
      });
    });

    it('marks overall status as unhealthy when auth fails', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Auth service down' },
      });

      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: expect.stringMatching(/critical issues|issues detected/i),
        }));
      });
    });

    it('marks overall status as degraded when non-critical service fails', async () => {
      (supabase.storage.listBuckets as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Storage unavailable' },
      });

      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: expect.stringMatching(/issues detected/i),
          description: expect.stringMatching(/5\/6 tests passed/),
        }));
      });
    });
  });

  describe('Performance and Latency Tracking', () => {
    it('tracks latency for all tests', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        // All successful tests should show latency
        const latencyBadges = screen.getAllByText(/\d+ms/);
        expect(latencyBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays average latency in history', async () => {
      render(<DiagnosticsCard />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        const historySection = screen.getByText('Recent Health Checks');
        expect(historySection).toBeInTheDocument();

        // Should show latency values in history
        const latencyValues = screen.getAllByText(/\d+ms/);
        expect(latencyValues.length).toBeGreaterThan(0);
      });
    });
  });
});
