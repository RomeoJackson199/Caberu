import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth, useHasRole, useRequireAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
};

const mockSession = {
  user: mockUser,
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
};

const mockProfile = {
  id: 'profile-123',
  user_id: 'user-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'test@example.com',
  role: 'dentist',
};

describe('useAuth', () => {
  let mockAuthStateCallback: any;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();

    // Mock auth state change listener
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      mockAuthStateCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });

    // Mock profiles query
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    });
  });

  describe('Basic Functionality', () => {
    it('should initialize with loading state', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should provide auth state and methods', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.refreshSession).toBe('function');
      expect(typeof result.current.checkSession).toBe('function');
    });

    it('should fetch and set user profile', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.profile).toEqual(mockProfile));
    });
  });

  describe('Authentication State Changes', () => {
    it('should handle SIGNED_IN event', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        mockAuthStateCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
        expect(logger.info).toHaveBeenCalledWith('User signed in');
      });
    });

    it('should handle SIGNED_OUT event', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      act(() => {
        mockAuthStateCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
        expect(logger.info).toHaveBeenCalledWith('User signed out');
      });
    });

    it('should handle TOKEN_REFRESHED event', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      act(() => {
        mockAuthStateCallback('TOKEN_REFRESHED', mockSession);
      });

      await waitFor(() => {
        expect(logger.debug).toHaveBeenCalledWith('Token refreshed');
      });
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const signOutError = new Error('Sign out failed');
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: signOutError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.signOut();
      });

      expect(logger.error).toHaveBeenCalledWith('Error signing out:', signOutError);
      expect(result.current.error).toEqual(signOutError);
    });
  });

  describe('Session Management', () => {
    it('should refresh session successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });

    it('should handle refresh session error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const refreshError = new Error('Refresh failed');
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: refreshError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(logger.error).toHaveBeenCalledWith('Error refreshing session:', refreshError);
      expect(result.current.error).toEqual(refreshError);
    });

    it('should check current session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      let sessionResult;
      await act(async () => {
        sessionResult = await result.current.checkSession();
      });

      expect(sessionResult).toEqual(mockSession);
    });

    it('should handle check session error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: new Error('Session check failed'),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let sessionResult;
      await act(async () => {
        sessionResult = await result.current.checkSession();
      });

      expect(sessionResult).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Profile Fetching', () => {
    it('should not fetch profile twice for same user', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const { result, rerender } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.profile).toEqual(mockProfile));

      // Trigger auth state change with same user
      act(() => {
        mockAuthStateCallback('TOKEN_REFRESHED', mockSession);
      });

      rerender();

      // Should not fetch profile again
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('should handle profile fetch error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No profile found' },
        }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should not throw error, just not set profile
      expect(result.current.profile).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => expect(mockUnsubscribe).not.toHaveBeenCalled());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle multiple hook instances with global listener', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { unmount: unmount1 } = renderHook(() => useAuth());
      const { unmount: unmount2 } = renderHook(() => useAuth());

      // Listener should be created once
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);

      unmount1();
      // Listener should still be active
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      unmount2();
      // Now listener should be cleaned up
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle initial session error', async () => {
      const sessionError = new Error('Failed to get session');
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: sessionError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toEqual(sessionError);
        expect(logger.error).toHaveBeenCalledWith('Error getting session:', sessionError);
      });
    });
  });
});

describe('useHasRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    });
  });

  it('should return true when user has the specified role', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useHasRole('dentist'));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('should return false when user has different role', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useHasRole('admin'));

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('should return false when no profile', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useHasRole('dentist'));

    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useRequireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    });
  });

  it('should execute function when authenticated', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    const mockFn = jest.fn().mockResolvedValue('success');
    let response;

    await act(async () => {
      response = await result.current.requireAuth(mockFn);
    });

    expect(mockFn).toHaveBeenCalled();
    expect(response).toBe('success');
  });

  it('should not execute function when not authenticated', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));

    const mockFn = jest.fn().mockResolvedValue('success');
    let response;

    await act(async () => {
      response = await result.current.requireAuth(mockFn);
    });

    expect(mockFn).not.toHaveBeenCalled();
    expect(response).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('Operation requires authentication');
  });
});
