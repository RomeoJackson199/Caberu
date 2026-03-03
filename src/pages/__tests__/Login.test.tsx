import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Login from '@/pages/Login';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/hooks/useDespia', () => ({
  useDespiaNative: () => false,
  useBiometricAuth: () => ({
    isAvailable: false,
    isAuthenticating: false,
    authenticate: jest.fn(),
  }),
  useHaptics: () => ({
    impact: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  }),
  useStorageVault: () => ({
    value: null,
    save: jest.fn(),
  }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockToast.toast.mockClear();

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { allowed: true },
      error: null,
    });
  });

  describe('Rendering', () => {
    it('renders login form without crashing', () => {
      renderWithRouter(<Login />);
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('displays sign up link', () => {
      renderWithRouter(<Login />);
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });
  });

  describe('Google Sign In', () => {
    it('initiates Google OAuth flow', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      renderWithRouter(<Login />);

      const googleButton = screen.getByLabelText('Sign in with Google');
      await user.click(googleButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: expect.stringContaining('/auth-redirect'),
          },
        });
      });
    });

    it('handles Google sign in error', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: {},
        error: new Error('OAuth error'),
      });

      renderWithRouter(<Login />);

      const googleButton = screen.getByLabelText('Sign in with Google');
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Google sign in failed',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('redirects authenticated users on page load', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user' },
          },
        },
      });

      renderWithRouter(<Login />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth-redirect');
      });
    });

    it('navigates to signup page', async () => {
      renderWithRouter(<Login />);
      const signupLink = screen.getByText('Sign up');
      expect(signupLink).toHaveAttribute('href', '/signup');
    });
  });
});
