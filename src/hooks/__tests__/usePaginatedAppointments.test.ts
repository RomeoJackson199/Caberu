import { renderHook, waitFor } from '@testing-library/react';
import { usePaginatedAppointments } from '../usePaginatedAppointments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

describe('usePaginatedAppointments', () => {
  const mockDentistId = 'dentist-123';
  const mockBusinessId = 'business-456';

  const mockAppointments = [
    {
      id: 'appt-1',
      appointment_date: '2024-01-20T10:00:00Z',
      duration_minutes: 30,
      status: 'pending',
      urgency: 'normal',
      reason: 'Checkup',
      patient_id: 'patient-1',
      patient_first_name: 'John',
      patient_last_name: 'Doe',
      patient_email: 'john@example.com',
      created_at: '2024-01-15T10:00:00Z',
      has_more: true,
    },
    {
      id: 'appt-2',
      appointment_date: '2024-01-21T14:00:00Z',
      duration_minutes: 60,
      status: 'confirmed',
      urgency: 'high',
      reason: 'Emergency',
      patient_id: 'patient-2',
      patient_first_name: 'Jane',
      patient_last_name: 'Smith',
      patient_email: 'jane@example.com',
      created_at: '2024-01-16T10:00:00Z',
      has_more: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch initial appointments on mount', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockAppointments,
      error: null,
    });

    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: mockDentistId, businessId: mockBusinessId })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.appointments).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('get_appointments_paginated', {
      p_dentist_id: mockDentistId,
      p_business_id: mockBusinessId,
      p_cursor: null,
      p_limit: 50,
      p_status_filter: null,
      p_date_from: null,
      p_date_to: null,
    });
  });

  it('should not fetch if dentistId is not provided', async () => {
    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: '' })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    const error = new Error('RPC failed');
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error,
    });

    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: mockDentistId })
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    expect(mockToast.toast).toHaveBeenCalledWith({
      title: 'Error loading appointments',
      description: 'RPC failed',
      variant: 'destructive',
    });
  });

  it('should apply status filter', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [mockAppointments[0]],
      error: null,
    });

    renderHook(() =>
      usePaginatedAppointments({
        dentistId: mockDentistId,
        statusFilter: 'pending',
      })
    );

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_appointments_paginated',
        expect.objectContaining({
          p_status_filter: 'pending',
        })
      );
    });
  });

  it('should apply date range filters', async () => {
    const dateFrom = new Date('2024-01-20');
    const dateTo = new Date('2024-01-25');

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockAppointments,
      error: null,
    });

    renderHook(() =>
      usePaginatedAppointments({
        dentistId: mockDentistId,
        dateFrom,
        dateTo,
      })
    );

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_appointments_paginated',
        expect.objectContaining({
          p_date_from: dateFrom.toISOString(),
          p_date_to: dateTo.toISOString(),
        })
      );
    });
  });

  it('should load more appointments when called', async () => {
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({
        data: [mockAppointments[0]],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [mockAppointments[1]],
        error: null,
      });

    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: mockDentistId })
    );

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
    });

    await result.current.loadMore();

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(2);
    });

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it('should not load more if already loading', async () => {
    (supabase.rpc as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: mockAppointments, error: null }), 100)
        )
    );

    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: mockDentistId })
    );

    // Try to load more while initial load is in progress
    result.current.loadMore();
    result.current.loadMore();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only be called once for initial load
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('should not load more if hasMore is false', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ ...mockAppointments[0], has_more: false }],
      error: null,
    });

    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: mockDentistId })
    );

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    jest.clearAllMocks();

    await result.current.loadMore();

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('should refresh appointments', async () => {
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({
        data: [mockAppointments[0]],
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockAppointments,
        error: null,
      });

    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: mockDentistId })
    );

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
    });

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(2);
    });

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    // Refresh should reset cursor to null
    expect(supabase.rpc).toHaveBeenLastCalledWith(
      'get_appointments_paginated',
      expect.objectContaining({
        p_cursor: null,
      })
    );
  });

  it('should handle empty results', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: mockDentistId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.appointments).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('should use custom limit', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockAppointments,
      error: null,
    });

    renderHook(() =>
      usePaginatedAppointments({
        dentistId: mockDentistId,
        limit: 25,
      })
    );

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_appointments_paginated',
        expect.objectContaining({
          p_limit: 25,
        })
      );
    });
  });

  it('should set cursor from last appointment date', async () => {
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({
        data: [mockAppointments[0]],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [mockAppointments[1]],
        error: null,
      });

    const { result } = renderHook(() =>
      usePaginatedAppointments({ dentistId: mockDentistId })
    );

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
    });

    await result.current.loadMore();

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenLastCalledWith(
        'get_appointments_paginated',
        expect.objectContaining({
          p_cursor: mockAppointments[0].appointment_date,
        })
      );
    });
  });

  it('should refetch when filters change', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockAppointments,
      error: null,
    });

    const { rerender } = renderHook(
      ({ statusFilter }) =>
        usePaginatedAppointments({
          dentistId: mockDentistId,
          statusFilter,
        }),
      {
        initialProps: { statusFilter: 'pending' },
      }
    );

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    // Change filter
    rerender({ statusFilter: 'confirmed' });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });
});
