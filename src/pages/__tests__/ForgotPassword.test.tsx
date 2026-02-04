/**
 * Tests for ForgotPassword page - Password reset flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ForgotPassword from '../ForgotPassword';

// Mock dependencies
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/errorUtils', () => ({
  getErrorMessage: jest.fn((error) => error?.message || 'Unknown error'),
}));

const mockValidatePassword = jest.fn();
jest.mock('@/utils/passwordValidation', () => ({
  validatePassword: (password: string) => mockValidatePassword(password),
}));

const mockInvoke = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

const renderForgotPassword = () => {
  return render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );
};

describe('ForgotPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePassword.mockReturnValue({ isValid: true, feedback: [] });
    mockInvoke.mockResolvedValue({ error: null });
  });

  describe('Email Step', () => {
    it('should render email input form initially', () => {
      renderForgotPassword();

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset code/i })).toBeInTheDocument();
    });

    it('should show hero text for forgot password', () => {
      renderForgotPassword();

      expect(screen.getByText(/forgot your password\?/i)).toBeInTheDocument();
    });

    it('should have email input with required attribute', () => {
      renderForgotPassword();

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have link back to sign in', () => {
      renderForgotPassword();

      expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
    });

    it('should update email input value on change', async () => {
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should call send-2fa-code function on form submit', async () => {
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset code/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('send-2fa-code', {
          body: { email: 'test@example.com', type: 'recovery' },
        });
      });
    });

    it('should show loading state during submission', async () => {
      mockInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset code/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
    });

    it('should show success toast and move to verify step on success', async () => {
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      await user.click(screen.getByRole('button', { name: /send reset code/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Code Sent',
          description: 'Please check your email for the reset code',
        });
      });

      // Should now show verify step
      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });
    });

    it('should show error toast on failure', async () => {
      mockInvoke.mockResolvedValue({ error: new Error('Failed to send code') });
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      await user.click(screen.getByRole('button', { name: /send reset code/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to send code',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Verify Step', () => {
    const goToVerifyStep = async () => {
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset code/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      return user;
    };

    it('should show code input and new password input', async () => {
      await goToVerifyStep();

      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    it('should show which email the code was sent to', async () => {
      await goToVerifyStep();

      expect(screen.getByText(/sent to test@example.com/i)).toBeInTheDocument();
    });

    it('should limit code input to 6 digits', async () => {
      const user = await goToVerifyStep();

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '1234567890');

      expect(codeInput).toHaveValue('123456');
    });

    it('should only allow numeric input for code', async () => {
      const user = await goToVerifyStep();

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, 'abc123def');

      expect(codeInput).toHaveValue('123');
    });

    it('should have Back to Email button', async () => {
      await goToVerifyStep();

      expect(screen.getByRole('button', { name: /back to email/i })).toBeInTheDocument();
    });

    it('should go back to email step when Back to Email clicked', async () => {
      const user = await goToVerifyStep();

      await user.click(screen.getByRole('button', { name: /back to email/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send reset code/i })).toBeInTheDocument();
      });
    });

    it('should validate password strength before reset', async () => {
      mockValidatePassword.mockReturnValue({
        isValid: false,
        feedback: ['Password too weak', 'Add special characters'],
      });

      const user = await goToVerifyStep();

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'weak');

      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Weak Password',
          description: 'Password too weak. Add special characters',
          variant: 'destructive',
        });
      });
    });

    it('should call reset-password-with-code function on valid submission', async () => {
      const user = await goToVerifyStep();

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'StrongP@ssw0rd!');

      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('reset-password-with-code', {
          body: {
            email: 'test@example.com',
            code: '123456',
            newPassword: 'StrongP@ssw0rd!',
          },
        });
      });
    });
  });

  describe('Success Step', () => {
    const goToSuccessStep = async () => {
      renderForgotPassword();
      const user = userEvent.setup();

      // Go through email step
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset code/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      // Go through verify step
      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456');

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'StrongP@ssw0rd!');

      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/password reset!/i)).toBeInTheDocument();
      });

      return user;
    };

    it('should show success message', async () => {
      await goToSuccessStep();

      expect(screen.getByText(/password reset!/i)).toBeInTheDocument();
      expect(screen.getByText(/successfully updated/i)).toBeInTheDocument();
    });

    it('should show Return to Sign In button', async () => {
      await goToSuccessStep();

      expect(screen.getByRole('link', { name: /return to sign in/i })).toBeInTheDocument();
    });

    it('should not show Back to sign in link on success step', async () => {
      await goToSuccessStep();

      // The ghost button "Back to sign in" should not be visible
      const backButtons = screen.queryAllByRole('button', { name: /back to sign in/i });
      // Should only have the main "Return to Sign In" button in the success card
      expect(backButtons.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels on email step', () => {
      renderForgotPassword();

      expect(screen.getByRole('form', { name: /password reset request form/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email address/i })).toHaveAttribute('aria-required', 'true');
    });

    it('should indicate loading state to screen readers', async () => {
      mockInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset code/i });
      await user.click(submitButton);

      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });
  });
});
