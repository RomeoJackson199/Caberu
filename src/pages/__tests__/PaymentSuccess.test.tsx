/**
 * Tests for PaymentSuccess page - Payment completion handling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PaymentSuccess from '../PaymentSuccess';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock('sonner', () => ({
  toast: mockToast,
}));

const mockInvoke = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

const renderPaymentSuccess = (searchParams = '') => {
  return render(
    <MemoryRouter initialEntries={[`/payment-success${searchParams}`]}>
      <Routes>
        <Route path="/payment-success" element={<PaymentSuccess />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('PaymentSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
    mockInvoke.mockResolvedValue({ data: { slug: 'test-clinic' }, error: null });
    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Regular Payment Success', () => {
    it('should render success message', () => {
      renderPaymentSuccess('?session_id=test-session-123');

      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
    });

    it('should show success icon', () => {
      renderPaymentSuccess('?session_id=test-session-123');

      const successIcon = document.querySelector('.text-green-500');
      expect(successIcon).toBeInTheDocument();
    });

    it('should display truncated transaction ID', () => {
      renderPaymentSuccess('?session_id=test-session-id-12345678');

      expect(screen.getByText(/transaction id:/i)).toBeInTheDocument();
      expect(screen.getByText(/test-session-id-1234/)).toBeInTheDocument();
    });

    it('should show Close Window button for non-business payments', () => {
      renderPaymentSuccess('?session_id=test-session-123');

      expect(screen.getByRole('button', { name: /close window/i })).toBeInTheDocument();
    });

    it('should call update-payment-status for regular payments', async () => {
      renderPaymentSuccess('?session_id=test-session-123');

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('update-payment-status', {
          body: { session_id: 'test-session-123' },
        });
      });
    });

    it('should handle update-payment-status error gracefully', async () => {
      const { logger } = await import('@/lib/logger');
      mockInvoke.mockResolvedValue({ error: new Error('Update failed') });

      renderPaymentSuccess('?session_id=test-session-123');

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Error updating payment status:',
          expect.any(Error)
        );
      });
    });
  });

  describe('Business Payment Success', () => {
    const businessData = {
      name: 'Test Clinic',
      slug: 'test-clinic',
    };

    beforeEach(() => {
      sessionStorage.setItem('pending_business_data', JSON.stringify(businessData));
    });

    it('should show processing state initially for business type', async () => {
      mockInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      renderPaymentSuccess('?session_id=test-session-123&type=business');

      expect(screen.getByText(/setting up your business/i)).toBeInTheDocument();
    });

    it('should show loading spinner during processing', () => {
      mockInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      renderPaymentSuccess('?session_id=test-session-123&type=business');

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should call complete-business-setup with correct data', async () => {
      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('complete-business-setup', {
          body: {
            session_id: 'test-session-123',
            business_data: businessData,
            promo_code_id: null,
          },
        });
      });
    });

    it('should include promo code if used', async () => {
      const promoCode = { id: 'promo-123', code: 'FREE50' };
      sessionStorage.setItem('promo_code_used', JSON.stringify(promoCode));

      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('complete-business-setup', {
          body: {
            session_id: 'test-session-123',
            business_data: businessData,
            promo_code_id: 'promo-123',
          },
        });
      });
    });

    it('should clear session storage after successful business creation', async () => {
      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(sessionStorage.getItem('pending_business_data')).toBeNull();
        expect(sessionStorage.getItem('promo_code_used')).toBeNull();
      });
    });

    it('should clear tour completed from localStorage', async () => {
      localStorage.setItem('tour_completed_dentist', 'true');

      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(localStorage.getItem('tour_completed_dentist')).toBeNull();
      });
    });

    it('should show success toast with business URL', async () => {
      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it('should copy business URL to clipboard', async () => {
      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('/test-clinic')
        );
      });
    });

    it('should navigate to dentist portal after delay', async () => {
      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });

      // Advance timer past the navigation delay
      jest.advanceTimersByTime(4000);

      expect(mockNavigate).toHaveBeenCalledWith('/dentist-portal');
    });

    it('should show special message for promo code users', async () => {
      renderPaymentSuccess('?session_id=test-session-123&type=business&promo=true');

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringContaining('FREE with promo code')
        );
      });
    });

    it('should show error toast when business data is missing', async () => {
      sessionStorage.removeItem('pending_business_data');

      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Business data not found');
      });
    });

    it('should show error toast when business data is invalid JSON', async () => {
      sessionStorage.setItem('pending_business_data', 'invalid-json');

      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Invalid business data format');
      });
    });

    it('should handle complete-business-setup error', async () => {
      mockInvoke.mockResolvedValue({ error: new Error('Setup failed') });

      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Setup failed');
      });
    });

    it('should handle error in response data', async () => {
      mockInvoke.mockResolvedValue({ data: { error: 'Business creation failed' } });

      renderPaymentSuccess('?session_id=test-session-123&type=business');

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Business creation failed');
      });
    });
  });

  describe('Without Session ID', () => {
    it('should still render success page', () => {
      renderPaymentSuccess('');

      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
    });

    it('should not show transaction ID when session_id is missing', () => {
      renderPaymentSuccess('');

      expect(screen.queryByText(/transaction id:/i)).not.toBeInTheDocument();
    });

    it('should not call update-payment-status without session ID', async () => {
      renderPaymentSuccess('');

      // Wait a bit to ensure no calls were made
      await new Promise((resolve) => setTimeout(resolve, 100));
      jest.advanceTimersByTime(100);

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });
});
