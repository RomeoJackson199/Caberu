import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { BusinessProvider, useBusinessContext, useRequireBusinessContext } from '@/hooks/useBusinessContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/integrations/supabase/client');
jest.mock('sonner');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockProfile = {
  id: 'profile-123',
  user_id: 'user-123',
};

const mockBusinessMembership = {
  id: 'membership-123',
  business_id: 'business-456',
  role: 'admin',
};

const mockBusiness = {
  id: 'business-456',
  name: 'Test Clinic',
  slug: 'test-clinic',
  template_type: 'healthcare',
};

const mockAllBusinesses = [
  mockBusiness,
  {
    id: 'business-789',
    name: 'Another Clinic',
    slug: 'another-clinic',
    template_type: 'dentist',
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BusinessProvider>{children}</BusinessProvider>
);

describe('useBusinessContext', () => {
  let mockAuthStateCallback: any;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();

    // Mock auth
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

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

    // Mock functions.invoke
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        businessId: 'business-456',
        role: 'admin',
      },
      error: null,
    });
  });

  describe('Basic Functionality', () => {
    it('should initialize with default values', () => {
      // Mock profile query
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      expect(result.current.businessId).toBeNull();
      expect(result.current.businessSlug).toBeNull();
      expect(result.current.businessName).toBeNull();
      expect(result.current.membershipRole).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(typeof result.current.switchBusiness).toBe('function');
      expect(typeof result.current.refreshMemberships).toBe('function');
    });

    it('should load user memberships on mount', async () => {
      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: [mockBusinessMembership],
              error: null,
            }),
          };
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
          };
        }
        if (table === 'session_business') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.memberships).toHaveLength(0); // Will be populated with business data
    });

    it('should provide all businesses for selection', async () => {
      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAllBusinesses,
              error: null,
            }),
          };
        }
        if (table === 'session_business') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.allBusinesses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
        ])
      );
    });
  });

  describe('Switch Business', () => {
    it('should switch business by ID successfully', async () => {
      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: [mockBusinessMembership],
              error: null,
            }),
          };
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
          };
        }
        if (table === 'session_business') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.switchBusiness('business-456');
      });

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('set-current-business', {
          body: { businessId: 'business-456' },
        });
      });
    });

    it('should switch business by slug successfully', async () => {
      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
          };
        }
        if (table === 'session_business') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.switchBusiness('test-clinic');
      });

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('set-current-business', {
          body: { businessSlug: 'test-clinic' },
        });
      });
    });

    it('should handle switch business error', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error('Failed to switch business'),
      });

      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAllBusinesses,
              error: null,
            }),
          };
        }
        if (table === 'session_business') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.switchBusiness('business-456');
      });

      expect(toast.error).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Auth State Changes', () => {
    it('should reload memberships on sign in', async () => {
      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAllBusinesses,
              error: null,
            }),
          };
        }
        if (table === 'session_business') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        mockAuthStateCallback('SIGNED_IN', null);
      });

      await waitFor(() => {
        expect(supabase.auth.getUser).toHaveBeenCalled();
      });
    });

    it('should clear state on sign out', async () => {
      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: [mockBusinessMembership],
              error: null,
            }),
          };
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
          };
        }
        if (table === 'session_business') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { business_id: 'business-456' },
              error: null,
            }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        mockAuthStateCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.businessId).toBeNull();
        expect(result.current.memberships).toEqual([]);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle profile fetch error', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Profile not found'),
        }),
      });

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle membership fetch error', async () => {
      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Failed to fetch memberships'),
            }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { result } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(toast.error).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const mockFromImplementation = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAllBusinesses,
              error: null,
            }),
          };
        }
        if (table === 'session_business') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      (supabase.from as jest.Mock) = mockFromImplementation;

      const { unmount } = renderHook(() => useBusinessContext(), { wrapper });

      await waitFor(() => expect(mockUnsubscribe).not.toHaveBeenCalled());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});

describe('useRequireBusinessContext', () => {
  it('should show error toast when no business selected', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useRequireBusinessContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.businessId).toBeNull();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please select a business first');
    });
  });

  it('should not show error when business is selected', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    const mockFromImplementation = jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (table === 'business_members') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: [mockBusinessMembership],
            error: null,
          }),
        };
      }
      if (table === 'businesses') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
        };
      }
      if (table === 'session_business') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { business_id: 'business-456' },
            error: null,
          }),
        };
      }
    });

    (supabase.from as jest.Mock) = mockFromImplementation;

    renderHook(() => useRequireBusinessContext(), { wrapper });

    await waitFor(() => {
      expect(toast.error).not.toHaveBeenCalledWith('Please select a business first');
    });
  });
});
