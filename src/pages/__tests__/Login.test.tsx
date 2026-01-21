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
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
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

jest.mock('@/components/auth/TwoFactorVerificationDialog', () => ({
  TwoFactorVerificationDialog: ({ open, onSuccess }: any) =>
    open ? <div data-testid="2fa-dialog" onClick={onSuccess}>2FA Dialog</div> : null,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockToast.toast.mockClear();

    // Default mocks
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('Rendering', () => {
    it('renders login form without crashing', () => {
      renderWithRouter(<Login />);

      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('displays all authentication options', () => {
      renderWithRouter(<Login />);

      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('or continue with email')).toBeInTheDocument();
    });

    it('displays forgot password link', () => {
      renderWithRouter(<Login />);

      expect(screen.getByText('Forgot?')).toBeInTheDocument();
    });

    it('displays sign up link', () => {
      renderWithRouter(<Login />);

      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });
  });

  describe('Email/Password Sign In', () => {
    it('handles successful sign in without 2FA', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            email_confirmed_at: '2024-01-01',
            user_metadata: { two_factor_enabled: false },
          },
        },
        error: null,
      });

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            refresh_token: 'test-token',
            user: { email: 'test@example.com' },
          },
        },
      });

      renderWithRouter(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /continue/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Welcome back!',
          })
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/auth-redirect');
    });

    it('shows 2FA dialog for users with 2FA enabled', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            email_confirmed_at: '2024-01-01',
            user_metadata: { two_factor_enabled: true },
          },
        },
        error: null,
      });

      renderWithRouter(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /continue/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('2fa-dialog')).toBeInTheDocument();
      });
    });

    it('handles unverified email', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            email_confirmed_at: null,
          },
        },
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({});

      renderWithRouter(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /continue/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Email Not Verified',
            variant: 'destructive',
          })
        );
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('handles invalid credentials error', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid credentials'),
      });

      renderWithRouter(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /continue/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });
    });

    it('displays loading state during sign in', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /continue/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
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

      const googleButton = screen.getByText('Continue with Google');
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

      const googleButton = screen.getByText('Continue with Google');
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
            user: {
              id: 'test-user',
              user_metadata: { two_factor_enabled: false },
            },
          },
        },
      });

      renderWithRouter(<Login />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth-redirect');
      });
    });

    it('navigates to forgot password page', async () => {
      renderWithRouter(<Login />);

      const forgotLink = screen.getByText('Forgot?');
      expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    });

    it('navigates to signup page', async () => {
      renderWithRouter(<Login />);

      const signupLink = screen.getByText('Sign up');
      expect(signupLink).toHaveAttribute('href', '/signup');
    });
  });

  describe('Form Validation', () => {
    it('requires email and password', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Login />);

      const submitButton = screen.getByRole('button', { name: /continue/i });
      await user.click(submitButton);

      // Form should not submit without values
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('accepts valid email format', async () => {
      renderWithRouter(<Login />);

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      expect(emailInput.type).toBe('email');
    });

    it('masks password input', () => {
      renderWithRouter(<Login />);

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Error States', () => {
    it('handles network errors', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      renderWithRouter(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /continue/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/trouble connecting/i)).toBeInTheDocument();
      });
    });

    it('handles rate limit errors', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      renderWithRouter(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /continue/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
      });
    });
  });
});
