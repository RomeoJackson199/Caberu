/**
 * Tests for PaymentCancelled page - Payment cancellation handling
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PaymentCancelled from '../PaymentCancelled';

// Mock useLanguage hook
const mockTranslations = {
  paymentCancelled: 'Payment Cancelled',
  paymentCancelledMessage: 'Your payment was cancelled. No charges have been made.',
  closeWindow: 'Close Window',
};

jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: mockTranslations }),
}));

// Mock window.close
const mockWindowClose = jest.fn();
const originalClose = window.close;

const renderPaymentCancelled = () => {
  return render(
    <MemoryRouter>
      <PaymentCancelled />
    </MemoryRouter>
  );
};

describe('PaymentCancelled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.close = mockWindowClose;
  });

  afterEach(() => {
    window.close = originalClose;
  });

  describe('Rendering', () => {
    it('should render payment cancelled message', () => {
      renderPaymentCancelled();

      expect(screen.getByText('Payment Cancelled')).toBeInTheDocument();
    });

    it('should show cancellation explanation', () => {
      renderPaymentCancelled();

      expect(screen.getByText('Your payment was cancelled. No charges have been made.')).toBeInTheDocument();
    });

    it('should show cancel icon with red color', () => {
      renderPaymentCancelled();

      const icon = document.querySelector('.text-red-500');
      expect(icon).toBeInTheDocument();
    });

    it('should render Close Window button', () => {
      renderPaymentCancelled();

      expect(screen.getByRole('button', { name: 'Close Window' })).toBeInTheDocument();
    });

    it('should have full-width button', () => {
      renderPaymentCancelled();

      const button = screen.getByRole('button', { name: 'Close Window' });
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Interactions', () => {
    it('should call window.close when Close Window button is clicked', () => {
      renderPaymentCancelled();

      const closeButton = screen.getByRole('button', { name: 'Close Window' });
      fireEvent.click(closeButton);

      expect(mockWindowClose).toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('should be centered on the page', () => {
      renderPaymentCancelled();

      const container = document.querySelector('.min-h-screen');
      expect(container).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should have card with max width', () => {
      renderPaymentCancelled();

      const card = document.querySelector('.max-w-md');
      expect(card).toBeInTheDocument();
    });

    it('should have text centered in card', () => {
      renderPaymentCancelled();

      const card = document.querySelector('.text-center');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderPaymentCancelled();

      // Card title should be present
      const title = screen.getByText('Payment Cancelled');
      expect(title).toBeInTheDocument();
    });

    it('should have button with text content for screen readers', () => {
      renderPaymentCancelled();

      const button = screen.getByRole('button', { name: 'Close Window' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have red colored title', () => {
      renderPaymentCancelled();

      const title = screen.getByText('Payment Cancelled');
      expect(title).toHaveClass('text-red-600');
    });

    it('should have muted foreground for description', () => {
      renderPaymentCancelled();

      const description = screen.getByText('Your payment was cancelled. No charges have been made.');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  describe('Internationalization', () => {
    it('should use translated payment cancelled text', () => {
      renderPaymentCancelled();

      expect(screen.getByText(mockTranslations.paymentCancelled)).toBeInTheDocument();
    });

    it('should use translated message text', () => {
      renderPaymentCancelled();

      expect(screen.getByText(mockTranslations.paymentCancelledMessage)).toBeInTheDocument();
    });

    it('should use translated button text', () => {
      renderPaymentCancelled();

      expect(screen.getByText(mockTranslations.closeWindow)).toBeInTheDocument();
    });
  });
});
