/**
 * Tests for usePatientProfile hook - Fetch patient profile data
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  usePatientProfile,
  usePatientProfileById,
  getPatientDisplayName,
  getPatientInitials,
} from '../usePatientProfile';

// Mock Supabase
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args);
          return {
            eq: (...args: unknown[]) => {
              mockEq(...args);
              return {
                maybeSingle: () => mockMaybeSingle(),
              };
            },
          };
        },
      };
    },
  },
}));

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePatientProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch when userId is null', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePatientProfile(null), { wrapper });

    // Query should not be enabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should not fetch when userId is undefined', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePatientProfile(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should fetch profile when userId is provided', async () => {
    const mockProfile = {
      id: 'profile-123',
      user_id: 'user-456',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      date_of_birth: '1990-01-15',
      profile_picture_url: null,
      preferred_language: 'en',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockMaybeSingle.mockResolvedValue({ data: mockProfile, error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePatientProfile('user-456'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFrom).toHaveBeenCalledWith('secure_profiles_view');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-456');
    expect(result.current.data).toEqual(mockProfile);
  });

  it('should handle fetch errors', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePatientProfile('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should return null when profile not found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePatientProfile('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('usePatientProfileById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch when profileId is null', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePatientProfileById(null), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should fetch profile by id when profileId is provided', async () => {
    const mockProfile = {
      id: 'profile-123',
      user_id: 'user-456',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
    };

    mockMaybeSingle.mockResolvedValue({ data: mockProfile, error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePatientProfileById('profile-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFrom).toHaveBeenCalledWith('secure_profiles_view');
    expect(mockEq).toHaveBeenCalledWith('id', 'profile-123');
    expect(result.current.data).toEqual(mockProfile);
  });
});

describe('getPatientDisplayName', () => {
  it('should return "Unknown" for null profile', () => {
    expect(getPatientDisplayName(null)).toBe('Unknown');
  });

  it('should return "Unknown" for undefined profile', () => {
    expect(getPatientDisplayName(undefined)).toBe('Unknown');
  });

  it('should return full name when first and last name exist', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientDisplayName(profile)).toBe('John Doe');
  });

  it('should return first name only when last name is null', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: 'John',
      last_name: null,
      email: 'john@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientDisplayName(profile)).toBe('John');
  });

  it('should return last name only when first name is null', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: null,
      last_name: 'Doe',
      email: 'john@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientDisplayName(profile)).toBe('Doe');
  });

  it('should return email when no name available', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: null,
      last_name: null,
      email: 'john@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientDisplayName(profile)).toBe('john@example.com');
  });

  it('should return "Unknown" when no name or email', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: null,
      last_name: null,
      email: null,
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientDisplayName(profile)).toBe('Unknown');
  });

  it('should handle empty strings', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: '',
      last_name: '',
      email: 'test@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientDisplayName(profile)).toBe('test@example.com');
  });
});

describe('getPatientInitials', () => {
  it('should return "?" for null profile', () => {
    expect(getPatientInitials(null)).toBe('?');
  });

  it('should return "?" for undefined profile', () => {
    expect(getPatientInitials(undefined)).toBe('?');
  });

  it('should return initials from first and last name', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientInitials(profile)).toBe('JD');
  });

  it('should return first initial only when last name missing', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: 'John',
      last_name: null,
      email: 'john@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientInitials(profile)).toBe('J');
  });

  it('should return last initial only when first name missing', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: null,
      last_name: 'Doe',
      email: 'john@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientInitials(profile)).toBe('D');
  });

  it('should return email initial when no name', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: null,
      last_name: null,
      email: 'john@example.com',
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientInitials(profile)).toBe('J');
  });

  it('should return "?" when no name or email', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: null,
      last_name: null,
      email: null,
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientInitials(profile)).toBe('?');
  });

  it('should uppercase initials', () => {
    const profile = {
      id: '1',
      user_id: 'u1',
      first_name: 'john',
      last_name: 'doe',
      email: null,
      phone: null,
      date_of_birth: null,
      profile_picture_url: null,
      preferred_language: null,
      created_at: '',
      updated_at: '',
    };

    expect(getPatientInitials(profile)).toBe('JD');
  });
});
