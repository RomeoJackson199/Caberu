import { renderHook, waitFor } from '@testing-library/react';
import { useOptimisticAppointmentStatus } from '../useOptimisticAppointmentStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useOptimisticAppointmentStatus', () => {
  const mockAppointmentId = 'appt-123';
  const mockCurrentAppointment = {
    id: mockAppointmentId,
    status: 'pending',
    patient_name: 'John Doe',
    updated_at: '2024-01-15T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update status optimistically and sync with server', async () => {
    const mockOnOptimisticUpdate = jest.fn();
    const mockOnSuccess = jest.fn();

    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    const { result } = renderHook(() =>
      useOptimisticAppointmentStatus({
        onOptimisticUpdate: mockOnOptimisticUpdate,
        onSuccess: mockOnSuccess,
      })
    );

    const response = await result.current.updateStatus(
      mockAppointmentId,
      'confirmed',
      mockCurrentAppointment
    );

    expect(mockOnOptimisticUpdate).toHaveBeenCalledWith(
      mockAppointmentId,
      expect.objectContaining({
        status: 'confirmed',
      })
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'confirmed',
      })
    );

    expect(mockEq).toHaveBeenCalledWith('id', mockAppointmentId);
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(response.success).toBe(true);
  });

  it('should include additional updates', async () => {
    const mockOnOptimisticUpdate = jest.fn();

    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    const { result } = renderHook(() =>
      useOptimisticAppointmentStatus({
        onOptimisticUpdate: mockOnOptimisticUpdate,
      })
    );

    const additionalUpdates = {
      consultation_notes: 'Patient arrived on time',
      urgency: 'normal',
    };

    await result.current.updateStatus(
      mockAppointmentId,
      'completed',
      mockCurrentAppointment,
      additionalUpdates
    );

    expect(mockOnOptimisticUpdate).toHaveBeenCalledWith(
      mockAppointmentId,
      expect.objectContaining({
        status: 'completed',
        consultation_notes: 'Patient arrived on time',
        urgency: 'normal',
      })
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        consultation_notes: 'Patient arrived on time',
        urgency: 'normal',
      })
    );
  });

  it('should rollback on error', async () => {
    const mockOnOptimisticUpdate = jest.fn();
    const mockOnRollback = jest.fn();

    const error = new Error('Update failed');
    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    const { result } = renderHook(() =>
      useOptimisticAppointmentStatus({
        onOptimisticUpdate: mockOnOptimisticUpdate,
        onRollback: mockOnRollback,
      })
    );

    const response = await result.current.updateStatus(
      mockAppointmentId,
      'confirmed',
      mockCurrentAppointment
    );

    expect(mockOnOptimisticUpdate).toHaveBeenCalled();
    expect(mockOnRollback).toHaveBeenCalledWith(
      mockAppointmentId,
      mockCurrentAppointment
    );
    expect(toast.error).toHaveBeenCalledWith('Failed to update appointment', {
      description: 'Please try again',
    });
    expect(response.success).toBe(false);
    expect(response.error).toBe(error);
  });

  it('should work without callbacks', async () => {
    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    const { result } = renderHook(() => useOptimisticAppointmentStatus());

    const response = await result.current.updateStatus(
      mockAppointmentId,
      'confirmed',
      mockCurrentAppointment
    );

    expect(response.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should update the updated_at timestamp', async () => {
    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    const { result } = renderHook(() => useOptimisticAppointmentStatus());

    const beforeTime = new Date();

    await result.current.updateStatus(
      mockAppointmentId,
      'confirmed',
      mockCurrentAppointment
    );

    const afterTime = new Date();

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        updated_at: expect.any(String),
      })
    );

    const updateCall = mockUpdate.mock.calls[0][0];
    const updatedAt = new Date(updateCall.updated_at);

    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it('should handle network errors', async () => {
    const mockOnRollback = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockRejectedValue(new Error('Network error'));

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    const { result } = renderHook(() =>
      useOptimisticAppointmentStatus({
        onRollback: mockOnRollback,
      })
    );

    const response = await result.current.updateStatus(
      mockAppointmentId,
      'confirmed',
      mockCurrentAppointment
    );

    expect(mockOnRollback).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error updating appointment status:',
      expect.any(Error)
    );
    expect(response.success).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should preserve original appointment data for rollback', async () => {
    const mockOnRollback = jest.fn();

    const error = new Error('Update failed');
    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    const { result } = renderHook(() =>
      useOptimisticAppointmentStatus({
        onRollback: mockOnRollback,
      })
    );

    await result.current.updateStatus(
      mockAppointmentId,
      'confirmed',
      mockCurrentAppointment
    );

    expect(mockOnRollback).toHaveBeenCalledWith(
      mockAppointmentId,
      expect.objectContaining({
        id: mockAppointmentId,
        status: 'pending',
        patient_name: 'John Doe',
      })
    );
  });
});
