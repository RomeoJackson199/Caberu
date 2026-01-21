import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Signup from '@/pages/Signup';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/utils/passwordValidation', () => ({
  validatePassword: jest.fn((password: string) => ({
    isValid: password.length >= 12,
    score: password.length >= 12 ? 4 : 2,
    feedback: password.length >= 12 ? [] : ['Password must be at least 12 characters'],
  })),
  checkPasswordBreach: jest.fn().mockResolvedValue(false),
  getStrengthLabel: jest.fn((score: number) => ({
    label: score >= 4 ? 'Strong' : 'Weak',
    color: score >= 4 ? 'text-green-600' : 'text-red-600',
  })),
}));

jest.mock('@/components/consent', () => ({
  DentalPracticeConsentDialog: ({ open, onAccept }: any) =>
    open ? (
      <div data-testid="business-consent-dialog" onClick={() => onAccept({})}>
        Business Consent
      </div>
    ) : null,
  PatientTermsConsentDialog: ({ open, onAccept }: any) =>
    open ? (
      <div data-testid="patient-consent-dialog" onClick={() => onAccept({})}>
        Patient Consent
      </div>
    ) : null,
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

describe('Signup Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockToast.toast.mockClear();
    sessionStorage.clear();

    // Default mocks
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('Rendering', () => {
    it('renders signup page without crashing', () => {
      renderWithRouter(<Signup />);

      expect(screen.getByText('SIGN UP')).toBeInTheDocument();
      expect(screen.getByText('I am signing up as:')).toBeInTheDocument();
    });

    it('displays user type selection buttons', () => {
      renderWithRouter(<Signup />);

      expect(screen.getByText('A Client')).toBeInTheDocument();
      expect(screen.getByText('A Business Owner')).toBeInTheDocument();
    });

    it('displays login link', () => {
      renderWithRouter(<Signup />);

      const loginLinks = screen.getAllByText('Log in');
      expect(loginLinks.length).toBeGreaterThan(0);
    });
  });

  describe('User Type Selection', () => {
    it('shows signup form when client type is selected', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />);

      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      });
    });

    it('shows signup form when business type is selected', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />);

      const businessButton = screen.getByText('A Business Owner');
      await user.click(businessButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      });
    });

    it('allows changing account type', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />);

      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByText('← Change account type')).toBeInTheDocument();
      });

      const changeButton = screen.getByText('← Change account type');
      await user.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText('I am signing up as:')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission - Client', () => {
    it('handles successful client signup', async () => {
      const user = userEvent.setup();

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      renderWithRouter(<Signup />);

      // Select client type
      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      // Fill out form
      await waitFor(() => {
        expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('Your Email');
      const passwordInput = screen.getByLabelText('Create Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'StrongPassword123!@#');
      await user.type(confirmPasswordInput, 'StrongPassword123!@#');

      // Click submit which triggers consent
      const submitButton = screen.getByText('CREATE ACCOUNT');
      await user.click(submitButton);

      // Accept consent
      await waitFor(() => {
        expect(screen.getByTestId('patient-consent-dialog')).toBeInTheDocument();
      });

      const consentDialog = screen.getByTestId('patient-consent-dialog');
      await user.click(consentDialog);

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'StrongPassword123!@#',
          options: expect.objectContaining({
            data: { role_type: 'patient' },
          }),
        });
      });

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Account created'),
          })
        );
      });
    });

    it('requires consent before signup', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />);

      // Select client type
      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('Your Email');
      const passwordInput = screen.getByLabelText('Create Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'StrongPassword123!@#');
      await user.type(confirmPasswordInput, 'StrongPassword123!@#');

      const submitButton = screen.getByText('CREATE ACCOUNT');
      await user.click(submitButton);

      // Should show consent dialog
      await waitFor(() => {
        expect(screen.getByTestId('patient-consent-dialog')).toBeInTheDocument();
      });

      // Should not have called signup yet
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('validates password mismatch', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />);

      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('Your Email');
      const passwordInput = screen.getByLabelText('Create Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'StrongPassword123!@#');
      await user.type(confirmPasswordInput, 'DifferentPassword123!@#');

      const submitButton = screen.getByText('CREATE ACCOUNT');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Passwords don't match",
            variant: 'destructive',
          })
        );
      });

      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('validates password strength', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />);

      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('Your Email');
      const passwordInput = screen.getByLabelText('Create Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'weak');
      await user.type(confirmPasswordInput, 'weak');

      const submitButton = screen.getByText('CREATE ACCOUNT');
      await user.click(submitButton);

      // Accept consent
      await waitFor(() => {
        expect(screen.getByTestId('patient-consent-dialog')).toBeInTheDocument();
      });

      const consentDialog = screen.getByTestId('patient-consent-dialog');
      await user.click(consentDialog);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Password Too Weak',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Form Submission - Business', () => {
    it('handles successful business signup', async () => {
      const user = userEvent.setup();

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user', email: 'business@example.com' } },
        error: null,
      });

      renderWithRouter(<Signup />);

      // Select business type
      const businessButton = screen.getByText('A Business Owner');
      await user.click(businessButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('Your Email');
      const passwordInput = screen.getByLabelText('Create Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'business@example.com');
      await user.type(passwordInput, 'StrongPassword123!@#');
      await user.type(confirmPasswordInput, 'StrongPassword123!@#');

      const submitButton = screen.getByText('CREATE ACCOUNT');
      await user.click(submitButton);

      // Accept business consent
      await waitFor(() => {
        expect(screen.getByTestId('business-consent-dialog')).toBeInTheDocument();
      });

      const consentDialog = screen.getByTestId('business-consent-dialog');
      await user.click(consentDialog);

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'business@example.com',
          password: 'StrongPassword123!@#',
          options: expect.objectContaining({
            data: { role_type: 'owner' },
            emailRedirectTo: expect.stringContaining('/create-business'),
          }),
        });
      });
    });
  });

  describe('Google Sign Up', () => {
    it('initiates Google OAuth for client signup', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      renderWithRouter(<Signup />);

      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      });

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

      expect(sessionStorage.getItem('pending_signup_user_type')).toBe('patient');
    });

    it('handles Google OAuth error', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: {},
        error: new Error('OAuth error'),
      });

      renderWithRouter(<Signup />);

      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      });

      const googleButton = screen.getByText('Continue with Google');
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Google sign up failed'),
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles existing account error', async () => {
      const user = userEvent.setup();

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {},
        error: new Error('User already registered'),
      });

      renderWithRouter(<Signup />);

      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('Your Email');
      const passwordInput = screen.getByLabelText('Create Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'StrongPassword123!@#');
      await user.type(confirmPasswordInput, 'StrongPassword123!@#');

      const submitButton = screen.getByText('CREATE ACCOUNT');
      await user.click(submitButton);

      // Accept consent
      await waitFor(() => {
        expect(screen.getByTestId('patient-consent-dialog')).toBeInTheDocument();
      });

      const consentDialog = screen.getByTestId('patient-consent-dialog');
      await user.click(consentDialog);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Sign up failed'),
            description: expect.stringContaining('already exists'),
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
          session: { user: { id: 'test-user' } },
        },
      });

      renderWithRouter(<Signup />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth-redirect');
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />);

      const clientButton = screen.getByText('A Client');
      await user.click(clientButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Create Password')).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText('Create Password') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      // Find and click the toggle button (eye icon)
      const toggleButtons = screen.getAllByRole('button', { name: '' });
      const eyeButton = toggleButtons.find((btn) =>
        btn.querySelector('.lucide-eye, .lucide-eye-off')
      );

      if (eyeButton) {
        await user.click(eyeButton);
        await waitFor(() => {
          expect(passwordInput.type).toBe('text');
        });
      }
    });
  });
});
