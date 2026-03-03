/**
 * Tests for ForgotPassword page - OTP-based account recovery flow
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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
    mockSignInWithOtp.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ error: null });
  });

  describe('Email Step', () => {
    it('should render email input form initially', () => {
      renderForgotPassword();

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send recovery code/i })).toBeInTheDocument();
    });

    it('should show hero text for account recovery', () => {
      renderForgotPassword();

      expect(screen.getByText(/account recovery/i)).toBeInTheDocument();
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

    it('should call signInWithOtp on form submit', async () => {
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send recovery code/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({ email: 'test@example.com' });
      });
    });

    it('should show success toast and move to code step on success', async () => {
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      await user.click(screen.getByRole('button', { name: /send recovery code/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Code Sent',
          description: 'Please check your email for the 6-digit code',
        });
      });
    });

    it('should show error toast on failure', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: new Error('Failed to send code') });
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      await user.click(screen.getByRole('button', { name: /send recovery code/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to send code',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels on email step', () => {
      renderForgotPassword();

      expect(screen.getByRole('form', { name: /account recovery form/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email address/i })).toHaveAttribute('aria-required', 'true');
    });

    it('should indicate loading state to screen readers', async () => {
      mockSignInWithOtp.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      renderForgotPassword();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send recovery code/i });
      await user.click(submitButton);

      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });
  });
});
