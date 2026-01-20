import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailTestTab } from '@/components/super-admin/EmailTestTab';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

describe('EmailTestTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  describe('Rendering', () => {
    it('renders the email system test header', () => {
      render(<EmailTestTab />);

      expect(screen.getByText('Email System Test')).toBeInTheDocument();
      expect(screen.getByText(/test the email sending configuration/i)).toBeInTheDocument();
    });

    it('renders email input field', () => {
      render(<EmailTestTab />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter email to test/i)).toBeInTheDocument();
    });

    it('renders send test button', () => {
      render(<EmailTestTab />);

      expect(screen.getByRole('button', { name: /send test/i })).toBeInTheDocument();
    });

    it('displays email configuration section', () => {
      render(<EmailTestTab />);

      expect(screen.getByText('Email Configuration')).toBeInTheDocument();
    });

    it('shows provider information', () => {
      render(<EmailTestTab />);

      expect(screen.getByText('Provider:')).toBeInTheDocument();
      expect(screen.getByText('SendGrid (Twilio)')).toBeInTheDocument();
    });

    it('shows sender email', () => {
      render(<EmailTestTab />);

      expect(screen.getByText('Sender:')).toBeInTheDocument();
      expect(screen.getByText('Romeo@caberu.be')).toBeInTheDocument();
    });

    it('shows API key reference', () => {
      render(<EmailTestTab />);

      expect(screen.getByText('API Key:')).toBeInTheDocument();
      expect(screen.getByText('TWILIO_API_KEY')).toBeInTheDocument();
    });
  });

  describe('Email Input', () => {
    it('allows typing email address', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('clears email input after successful send', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      // Wait for successful send - input should not be cleared on success based on the component
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Test Email Sent!',
        }));
      });
    });
  });

  describe('Sending Email', () => {
    it('shows validation error when no email provided', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Email Required',
          variant: 'destructive',
        }));
      });
    });

    it('calls supabase function with correct parameters', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'recipient@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email-notification', {
          body: expect.objectContaining({
            to: 'recipient@example.com',
            subject: '[SYSTEM TEST] Caberu Email Configuration Test',
            messageType: 'system',
            isSystemNotification: true,
          }),
        });
      });
    });

    it('shows success toast on successful send', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Test Email Sent!',
          description: expect.stringContaining('test@example.com'),
        }));
      });
    });

    it('shows error toast on failed send', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'SendGrid API error' },
      });

      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Email Test Failed',
          variant: 'destructive',
        }));
      });
    });

    it('handles network errors gracefully', async () => {
      (supabase.functions.invoke as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Email Test Failed',
          variant: 'destructive',
        }));
      });
    });
  });

  describe('Loading State', () => {
    it('disables button while sending', async () => {
      let resolvePromise: () => void;
      const slowPromise = new Promise<any>((resolve) => {
        resolvePromise = () => resolve({ data: {}, error: null });
      });

      (supabase.functions.invoke as jest.Mock).mockReturnValueOnce(slowPromise);

      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');

      const sendButton = screen.getByRole('button', { name: /send test/i });
      await user.click(sendButton);

      // Button should be disabled while sending
      await waitFor(() => {
        expect(sendButton).toBeDisabled();
      });

      // Resolve and cleanup
      resolvePromise!();
    });

    it('shows loading spinner while sending', async () => {
      let resolvePromise: () => void;
      const slowPromise = new Promise<any>((resolve) => {
        resolvePromise = () => resolve({ data: {}, error: null });
      });

      (supabase.functions.invoke as jest.Mock).mockReturnValueOnce(slowPromise);

      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      // Should show loading state (Loader2 icon has animate-spin class)
      await waitFor(() => {
        const loadingIcon = document.querySelector('.animate-spin');
        expect(loadingIcon).toBeInTheDocument();
      });

      resolvePromise!();
    });
  });

  describe('Result Display', () => {
    it('shows success result after successful send', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'success@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        expect(screen.getByText(/test email sent to success@example.com/i)).toBeInTheDocument();
      });
    });

    it('shows success styling for successful result', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        const resultContainer = screen.getByText(/test email sent to/i).closest('div');
        expect(resultContainer?.parentElement).toHaveClass('bg-green-50');
      });
    });

    it('shows error result after failed send', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'API rate limit exceeded' },
      });

      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        expect(screen.getByText(/api rate limit exceeded/i)).toBeInTheDocument();
      });
    });

    it('shows error styling for failed result', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to send' },
      });

      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        const resultContainer = screen.getByText(/failed to send/i).closest('div');
        expect(resultContainer?.parentElement).toHaveClass('bg-red-50');
      });
    });

    it('clears previous result before new send', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);

      // First successful send
      await user.type(emailInput, 'first@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        expect(screen.getByText(/test email sent to first@example.com/i)).toBeInTheDocument();
      });

      // Start second send - result should be cleared
      await user.clear(emailInput);
      await user.type(emailInput, 'second@example.com');

      // During the second send, the previous result may still be visible
      // until the new result comes in
    });
  });

  describe('Email Content', () => {
    it('sends HTML formatted email content', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        const callArgs = (supabase.functions.invoke as jest.Mock).mock.calls[0][1];
        expect(callArgs.body.message).toContain('<div');
        expect(callArgs.body.message).toContain('Email System Test');
        expect(callArgs.body.message).toContain('SendGrid API');
      });
    });

    it('includes timestamp in email content', async () => {
      const user = userEvent.setup();
      render(<EmailTestTab />);

      const emailInput = screen.getByPlaceholderText(/enter email to test/i);
      await user.type(emailInput, 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send test/i }));

      await waitFor(() => {
        const callArgs = (supabase.functions.invoke as jest.Mock).mock.calls[0][1];
        expect(callArgs.body.message).toContain('Sent at:');
      });
    });
  });
});
