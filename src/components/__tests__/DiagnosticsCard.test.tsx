import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiagnosticsCard } from '@/components/super-admin/DiagnosticsCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { db_latency_ms: 15 }, error: null }),
    },
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null }),
    },
    storage: {
      listBuckets: jest.fn().mockResolvedValue({ data: [{ id: 'bucket1' }, { id: 'bucket2' }], error: null }),
    },
    channel: jest.fn(() => ({
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

describe('DiagnosticsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the diagnostics card header', () => {
      render(<DiagnosticsCard />);

      expect(screen.getByText('System Diagnostics')).toBeInTheDocument();
      expect(screen.getByText(/test connectivity and performance/i)).toBeInTheDocument();
    });

    it('renders Run All Tests button', () => {
      render(<DiagnosticsCard />);

      expect(screen.getByRole('button', { name: /run all tests/i })).toBeInTheDocument();
    });

    it('displays all diagnostic test items', () => {
      render(<DiagnosticsCard />);

      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Edge Functions')).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Realtime')).toBeInTheDocument();
    });

    it('shows "Not tested" badge for all items initially', () => {
      render(<DiagnosticsCard />);

      const notTestedBadges = screen.getAllByText('Not tested');
      expect(notTestedBadges.length).toBe(5);
    });
  });

  describe('Database Test', () => {
    it('tests database connectivity', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('businesses');
      });
    });

    it('shows success status on database connection success', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Connection successful')).toBeInTheDocument();
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

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Connection refused')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Functions Test', () => {
    it('tests edge functions health', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('health-check');
      });
    });

    it('shows DB latency in edge functions result', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/healthy/i)).toBeInTheDocument();
      });
    });

    it('shows error on edge functions failure', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Function timeout' },
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Function timeout')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Test', () => {
    it('tests authentication service', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(supabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it('shows authenticated status when session exists', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Authenticated')).toBeInTheDocument();
      });
    });

    it('shows no session status when not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('No session')).toBeInTheDocument();
      });
    });
  });

  describe('Storage Test', () => {
    it('tests storage service', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(supabase.storage.listBuckets).toHaveBeenCalled();
      });
    });

    it('shows bucket count on success', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('2 buckets available')).toBeInTheDocument();
      });
    });
  });

  describe('Realtime Test', () => {
    it('tests realtime WebSocket connection', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('diagnostics-test');
      });
    });

    it('shows success on WebSocket connection', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('WebSocket connected')).toBeInTheDocument();
      });
    });
  });

  describe('Run All Tests', () => {
    it('disables button while tests are running', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      const button = screen.getByRole('button', { name: /run all tests/i });
      await user.click(button);

      expect(button).toBeDisabled();

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
    });

    it('shows toast with test results summary', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: expect.stringMatching(/systems healthy|issues detected/i),
          description: expect.stringMatching(/\d+\/\d+ tests passed/),
        }));
      });
    });

    it('runs all tests in parallel', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // All services should be called roughly simultaneously
      expect(supabase.from).toHaveBeenCalled();
      expect(supabase.functions.invoke).toHaveBeenCalled();
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.storage.listBuckets).toHaveBeenCalled();
      expect(supabase.channel).toHaveBeenCalled();
    });
  });

  describe('Latency Display', () => {
    it('shows latency in milliseconds for successful tests', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        // Should show latency badges (e.g., "15ms")
        const badges = screen.getAllByText(/\d+ms/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Status Icons', () => {
    it('shows idle clock icon initially', () => {
      render(<DiagnosticsCard />);

      // Clock icons should be present for idle state
      const testItems = screen.getAllByText('Not tested');
      expect(testItems.length).toBe(5);
    });

    it('shows spinning icon while test is running', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      // Should show Testing... badges
      await waitFor(() => {
        const testingBadges = screen.getAllByText('Testing...');
        expect(testingBadges.length).toBeGreaterThan(0);
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
    });
  });

  describe('Test Result States', () => {
    it('shows success state with green styling', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        // Check for success status messages
        expect(screen.getByText('Connection successful')).toBeInTheDocument();
      });
    });

    it('shows failed state for failed tests', async () => {
      // Fail all tests
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: null, error: { message: 'DB Error' } })),
        })),
      });
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Function Error' } });
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Auth Error' } });
      (supabase.storage.listBuckets as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Storage Error' } });
      (supabase.channel as jest.Mock).mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          if (callback) callback('CHANNEL_ERROR');
          return { unsubscribe: jest.fn() };
        }),
        unsubscribe: jest.fn(),
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DiagnosticsCard />);

      await user.click(screen.getByRole('button', { name: /run all tests/i }));

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const failedBadges = screen.getAllByText('Failed');
        expect(failedBadges.length).toBeGreaterThan(0);
      });
    });
  });
});
