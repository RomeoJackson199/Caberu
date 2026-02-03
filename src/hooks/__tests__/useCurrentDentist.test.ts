/**
 * Tests for useCurrentDentist hook - Get current dentist context
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentDentist } from '../useCurrentDentist';

// Mock Supabase
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return {
                eq: (...eqArgs2: unknown[]) => {
                  mockEq(...eqArgs2);
                  return {
                    maybeSingle: () => mockMaybeSingle(),
                  };
                },
                maybeSingle: () => mockMaybeSingle(),
              };
            },
          };
        },
      };
    },
  },
}));

describe('useCurrentDentist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useCurrentDentist());

    expect(result.current.loading).toBe(true);
    expect(result.current.userId).toBeNull();
    expect(result.current.profileId).toBeNull();
    expect(result.current.dentistId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return null values when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useCurrentDentist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userId).toBeNull();
    expect(result.current.profileId).toBeNull();
    expect(result.current.dentistId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch user and profile data when authenticated', async () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = { id: 'profile-456' };
    const mockDentist = { id: 'dentist-789' };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null }) // profiles query
      .mockResolvedValueOnce({ data: mockDentist, error: null }); // dentists query

    const { result } = renderHook(() => useCurrentDentist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userId).toBe('user-123');
    expect(result.current.profileId).toBe('profile-456');
    expect(result.current.dentistId).toBe('dentist-789');
    expect(result.current.error).toBeNull();
  });

  it('should return null dentistId when user has no profile', async () => {
    const mockUser = { id: 'user-123' };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // no profile

    const { result } = renderHook(() => useCurrentDentist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userId).toBe('user-123');
    expect(result.current.profileId).toBeNull();
    expect(result.current.dentistId).toBeNull();
  });

  it('should return null dentistId when user has no dentist record', async () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = { id: 'profile-456' };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null }) // profiles query
      .mockResolvedValueOnce({ data: null, error: null }); // no dentist

    const { result } = renderHook(() => useCurrentDentist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userId).toBe('user-123');
    expect(result.current.profileId).toBe('profile-456');
    expect(result.current.dentistId).toBeNull();
  });

  it('should handle profile query errors', async () => {
    const mockUser = { id: 'user-123' };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    const { result } = renderHook(() => useCurrentDentist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Database error');
  });

  it('should handle dentist query errors', async () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = { id: 'profile-456' };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('Dentist error') });

    const { result } = renderHook(() => useCurrentDentist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Dentist error');
  });

  describe('with businessId', () => {
    it('should query through business_members when businessId provided', async () => {
      const mockUser = { id: 'user-123' };
      const mockProfile = { id: 'profile-456' };
      const mockMember = { profile_id: 'profile-456' };
      const mockDentist = { id: 'dentist-789' };

      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockMaybeSingle
        .mockResolvedValueOnce({ data: mockProfile, error: null }) // profiles
        .mockResolvedValueOnce({ data: mockMember, error: null }) // business_members
        .mockResolvedValueOnce({ data: mockDentist, error: null }); // dentists

      const { result } = renderHook(() => useCurrentDentist('business-abc'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have queried business_members table
      expect(mockFrom).toHaveBeenCalledWith('business_members');
      expect(result.current.dentistId).toBe('dentist-789');
    });

    it('should return null dentistId when user is not member of business', async () => {
      const mockUser = { id: 'user-123' };
      const mockProfile = { id: 'profile-456' };

      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockMaybeSingle
        .mockResolvedValueOnce({ data: mockProfile, error: null }) // profiles
        .mockResolvedValueOnce({ data: null, error: null }); // not a business member

      const { result } = renderHook(() => useCurrentDentist('business-abc'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dentistId).toBeNull();
    });

    it('should reload when businessId changes', async () => {
      const mockUser = { id: 'user-123' };
      const mockProfile = { id: 'profile-456' };

      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockMaybeSingle
        .mockResolvedValue({ data: mockProfile, error: null });

      const { result, rerender } = renderHook(
        ({ businessId }) => useCurrentDentist(businessId),
        { initialProps: { businessId: 'business-1' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear mocks and rerender with new businessId
      mockGetUser.mockClear();

      rerender({ businessId: 'business-2' });

      // Should have triggered a reload
      expect(mockGetUser).toHaveBeenCalled();
    });
  });

  it('should handle non-Error exceptions', async () => {
    const mockUser = { id: 'user-123' };

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockMaybeSingle.mockRejectedValueOnce('String error');

    const { result } = renderHook(() => useCurrentDentist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load dentist context');
  });
});
