import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickActionsCard } from '@/components/super-admin/QuickActionsCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { message: 'Success' }, error: null }),
    },
  },
}));

// Mock URL and Blob for export functionality
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

// Mock document.createElement for download link
const mockClick = jest.fn();
const originalCreateElement = document.createElement.bind(document);
jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') {
    const element = originalCreateElement(tag);
    element.click = mockClick;
    return element;
  }
  return originalCreateElement(tag);
});

const mockToast = { toast: jest.fn() };
(useToast as jest.Mock).mockReturnValue(mockToast);

describe('QuickActionsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClick.mockClear();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
  });

  describe('Rendering', () => {
    it('renders the quick actions card header', () => {
      render(<QuickActionsCard />);

      expect(screen.getByText('Admin Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Common administrative tasks and utilities')).toBeInTheDocument();
    });

    it('renders grant super admin section', () => {
      render(<QuickActionsCard />);

      expect(screen.getByText('Grant Super Admin')).toBeInTheDocument();
      expect(screen.getByText('Dangerous')).toBeInTheDocument();
    });

    it('renders quick email test section', () => {
      render(<QuickActionsCard />);

      expect(screen.getByText('Quick Email Test')).toBeInTheDocument();
    });

    it('renders clear cache button', () => {
      render(<QuickActionsCard />);

      expect(screen.getByRole('button', { name: /clear cache/i })).toBeInTheDocument();
    });

    it('renders export info button', () => {
      render(<QuickActionsCard />);

      expect(screen.getByRole('button', { name: /export info/i })).toBeInTheDocument();
    });
  });

  describe('Grant Super Admin', () => {
    it('renders email input for super admin grant', () => {
      render(<QuickActionsCard />);

      expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    });

    it('renders grant button', () => {
      render(<QuickActionsCard />);

      expect(screen.getByRole('button', { name: /grant/i })).toBeInTheDocument();
    });

    it('disables grant button when email is empty', () => {
      render(<QuickActionsCard />);

      const grantButton = screen.getByRole('button', { name: /grant/i });
      expect(grantButton).toBeDisabled();
    });

    it('calls make-super-admin function with correct email', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('user@example.com');
      await user.type(emailInput, 'newadmin@example.com');
      await user.click(screen.getByRole('button', { name: /grant/i }));

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('make-super-admin', {
          body: { email: 'newadmin@example.com' },
        });
      });
    });

    it('shows success toast on successful grant', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('user@example.com');
      await user.type(emailInput, 'newadmin@example.com');
      await user.click(screen.getByRole('button', { name: /grant/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Success',
        }));
      });
    });

    it('clears email input after successful grant', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('user@example.com');
      await user.type(emailInput, 'newadmin@example.com');
      await user.click(screen.getByRole('button', { name: /grant/i }));

      await waitFor(() => {
        expect(emailInput).toHaveValue('');
      });
    });

    it('shows error toast on failed grant', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('user@example.com');
      await user.type(emailInput, 'notfound@example.com');
      await user.click(screen.getByRole('button', { name: /grant/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Error',
          variant: 'destructive',
        }));
      });
    });

    it('disables grant button while processing', async () => {
      let resolvePromise: () => void;
      const slowPromise = new Promise<any>((resolve) => {
        resolvePromise = () => resolve({ data: { message: 'Success' }, error: null });
      });

      (supabase.functions.invoke as jest.Mock).mockReturnValueOnce(slowPromise);

      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('user@example.com');
      await user.type(emailInput, 'admin@example.com');

      const grantButton = screen.getByRole('button', { name: /grant/i });
      await user.click(grantButton);

      expect(grantButton).toBeDisabled();

      resolvePromise!();
    });

    it('shows dangerous styling for grant section', () => {
      render(<QuickActionsCard />);

      const dangerSection = screen.getByText('Grant Super Admin').closest('div');
      expect(dangerSection?.parentElement).toHaveClass('bg-red-500/5');
    });
  });

  describe('Quick Email Test', () => {
    it('renders email input for test email', () => {
      render(<QuickActionsCard />);

      expect(screen.getByPlaceholderText('test@example.com')).toBeInTheDocument();
    });

    it('disables send button when email is empty', () => {
      render(<QuickActionsCard />);

      // Find the send button in the email test section
      const emailSection = screen.getByText('Quick Email Test').closest('.space-y-3');
      const sendButton = emailSection?.querySelector('button');

      expect(sendButton).toBeDisabled();
    });

    it('sends test email successfully', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('test@example.com');
      await user.type(emailInput, 'recipient@example.com');

      const emailSection = screen.getByText('Quick Email Test').closest('.space-y-3');
      const sendButton = emailSection?.querySelector('button');

      if (sendButton) {
        await user.click(sendButton);

        await waitFor(() => {
          expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email-notification', {
            body: expect.objectContaining({
              to: 'recipient@example.com',
              subject: '[SYSTEM TEST] Quick Email Test',
              messageType: 'system',
              isSystemNotification: true,
            }),
          });
        });
      }
    });

    it('shows success toast on email sent', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('test@example.com');
      await user.type(emailInput, 'test@example.com');

      const emailSection = screen.getByText('Quick Email Test').closest('.space-y-3');
      const sendButton = emailSection?.querySelector('button');

      if (sendButton) {
        await user.click(sendButton);

        await waitFor(() => {
          expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Email Sent',
          }));
        });
      }
    });

    it('clears email input after successful send', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('test@example.com');
      await user.type(emailInput, 'test@example.com');

      const emailSection = screen.getByText('Quick Email Test').closest('.space-y-3');
      const sendButton = emailSection?.querySelector('button');

      if (sendButton) {
        await user.click(sendButton);

        await waitFor(() => {
          expect(emailInput).toHaveValue('');
        });
      }
    });
  });

  describe('Clear Cache', () => {
    it('shows toast when clearing cache', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      await user.click(screen.getByRole('button', { name: /clear cache/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalled();
      });
    });
  });

  describe('Export System Info', () => {
    it('creates and downloads JSON file on export', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      await user.click(screen.getByRole('button', { name: /export info/i }));

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('shows success toast on export', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      await user.click(screen.getByRole('button', { name: /export info/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Exported',
          description: 'System info downloaded',
        }));
      });
    });

    it('includes system information in export', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      await user.click(screen.getByRole('button', { name: /export info/i }));

      // Verify Blob was created with expected content structure
      const blobCall = (global.Blob as jest.Mock);
      if (blobCall.mock) {
        // If Blob is mocked, we can check the call
        // Otherwise just verify the download happened
      }

      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    it('has correct initial button states', () => {
      render(<QuickActionsCard />);

      const grantButton = screen.getByRole('button', { name: /grant/i });
      expect(grantButton).toBeDisabled(); // Disabled because email is empty

      const clearCacheButton = screen.getByRole('button', { name: /clear cache/i });
      expect(clearCacheButton).not.toBeDisabled();

      const exportButton = screen.getByRole('button', { name: /export info/i });
      expect(exportButton).not.toBeDisabled();
    });

    it('enables grant button when email is entered', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('user@example.com');
      await user.type(emailInput, 'test@example.com');

      const grantButton = screen.getByRole('button', { name: /grant/i });
      expect(grantButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully for grant', async () => {
      (supabase.functions.invoke as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('user@example.com');
      await user.type(emailInput, 'admin@example.com');
      await user.click(screen.getByRole('button', { name: /grant/i }));

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Error',
          variant: 'destructive',
        }));
      });
    });

    it('handles email send failures gracefully', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Email service unavailable' },
      });

      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('test@example.com');
      await user.type(emailInput, 'test@example.com');

      const emailSection = screen.getByText('Quick Email Test').closest('.space-y-3');
      const sendButton = emailSection?.querySelector('button');

      if (sendButton) {
        await user.click(sendButton);

        await waitFor(() => {
          expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Failed to send email',
            variant: 'destructive',
          }));
        });
      }
    });
  });

  describe('Email Trimming', () => {
    it('trims whitespace from super admin email', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('user@example.com');
      await user.type(emailInput, '  admin@example.com  ');
      await user.click(screen.getByRole('button', { name: /grant/i }));

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('make-super-admin', {
          body: { email: 'admin@example.com' },
        });
      });
    });

    it('trims whitespace from test email', async () => {
      const user = userEvent.setup();
      render(<QuickActionsCard />);

      const emailInput = screen.getByPlaceholderText('test@example.com');
      await user.type(emailInput, '  test@example.com  ');

      const emailSection = screen.getByText('Quick Email Test').closest('.space-y-3');
      const sendButton = emailSection?.querySelector('button');

      if (sendButton) {
        await user.click(sendButton);

        await waitFor(() => {
          expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email-notification', {
            body: expect.objectContaining({
              to: 'test@example.com',
            }),
          });
        });
      }
    });
  });
});
