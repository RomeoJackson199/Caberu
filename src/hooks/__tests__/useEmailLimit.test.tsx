import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EmailLimitProvider, useEmailLimit, dispatchEmailLimitError, handleEmailError } from '@/hooks/useEmailLimit';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/components/subscription/EmailLimitDialog', () => ({
  EmailLimitDialog: ({ isOpen, onClose, onUpgrade, emailsSent, emailLimit }: any) => (
    isOpen ? (
      <div data-testid="email-limit-dialog">
        <div>Email Limit Dialog</div>
        <div>Sent: {emailsSent}</div>
        <div>Limit: {emailLimit}</div>
        <button onClick={onClose}>Close</button>
        <button onClick={onUpgrade}>Upgrade</button>
      </div>
    ) : null
  ),
}));

// Wrapper component for tests
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <EmailLimitProvider>{children}</EmailLimitProvider>
  </BrowserRouter>
);

describe('useEmailLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should provide checkEmailError and showEmailLimitPopup functions', () => {
      const { result } = renderHook(() => useEmailLimit(), { wrapper: Wrapper });

      expect(typeof result.current.checkEmailError).toBe('function');
      expect(typeof result.current.showEmailLimitPopup).toBe('function');
    });

    it('should work without provider (fallback mode)', () => {
      const { result } = renderHook(() => useEmailLimit());

      expect(typeof result.current.checkEmailError).toBe('function');
      expect(typeof result.current.showEmailLimitPopup).toBe('function');
    });
  });

  describe('EmailLimitProvider', () => {
    it('should render children correctly', () => {
      render(
        <Wrapper>
          <div data-testid="child">Test Child</div>
        </Wrapper>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should not show dialog initially', () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      expect(screen.queryByTestId('email-limit-dialog')).not.toBeInTheDocument();
    });

    it('should show dialog when email limit event is dispatched', async () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      act(() => {
        dispatchEmailLimitError(150, 200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
        expect(screen.getByText('Sent: 150')).toBeInTheDocument();
        expect(screen.getByText('Limit: 200')).toBeInTheDocument();
      });
    });

    it('should handle close dialog action', async () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      act(() => {
        dispatchEmailLimitError(150, 200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      act(() => {
        closeButton.click();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('email-limit-dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle upgrade action and navigate to billing', async () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      act(() => {
        dispatchEmailLimitError(150, 200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
      });

      const upgradeButton = screen.getByText('Upgrade');
      act(() => {
        upgradeButton.click();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dentist/settings?tab=billing');
        expect(screen.queryByTestId('email-limit-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('showEmailLimitPopup', () => {
    it('should show dialog with custom values', async () => {
      const TestComponent = () => {
        const { showEmailLimitPopup } = useEmailLimit();
        return (
          <button onClick={() => showEmailLimitPopup(180, 250)}>
            Show Dialog
          </button>
        );
      };

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      const button = screen.getByText('Show Dialog');
      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
        expect(screen.getByText('Sent: 180')).toBeInTheDocument();
        expect(screen.getByText('Limit: 250')).toBeInTheDocument();
      });
    });

    it('should update existing dialog values', async () => {
      const TestComponent = () => {
        const { showEmailLimitPopup } = useEmailLimit();
        return (
          <>
            <button onClick={() => showEmailLimitPopup(100, 200)}>Show First</button>
            <button onClick={() => showEmailLimitPopup(150, 200)}>Update</button>
          </>
        );
      };

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      act(() => {
        screen.getByText('Show First').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Sent: 100')).toBeInTheDocument();
      });

      act(() => {
        screen.getByText('Update').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Sent: 150')).toBeInTheDocument();
      });
    });

    it('should use default values when not provided', async () => {
      const TestComponent = () => {
        const { showEmailLimitPopup } = useEmailLimit();
        return (
          <button onClick={() => showEmailLimitPopup()}>Show Dialog</button>
        );
      };

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      const button = screen.getByText('Show Dialog');
      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
        expect(screen.getByText('Sent: 0')).toBeInTheDocument();
        expect(screen.getByText('Limit: 2000')).toBeInTheDocument();
      });
    });
  });

  describe('handleEmailError', () => {
    it('should detect email limit error with counts', () => {
      const error = { message: 'Email limit exceeded (150/200)' };
      const result = handleEmailError(error);

      expect(result).toBe(true);
    });

    it('should detect email limit error without counts', () => {
      const error = { message: 'Email limit exceeded' };
      const result = handleEmailError(error);

      expect(result).toBe(true);
    });

    it('should return false for non-email-limit errors', () => {
      const error = { message: 'Some other error' };
      const result = handleEmailError(error);

      expect(result).toBe(false);
    });

    it('should handle string errors', () => {
      const error = 'Email limit exceeded (100/150)';
      const result = handleEmailError(error);

      expect(result).toBe(true);
    });

    it('should handle error with error property', () => {
      const error = { error: 'Email limit exceeded (100/150)' };
      const result = handleEmailError(error);

      expect(result).toBe(true);
    });

    it('should handle null/undefined errors', () => {
      expect(handleEmailError(null)).toBe(false);
      expect(handleEmailError(undefined)).toBe(false);
    });

    it('should extract email counts from error message', () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      const error = { message: 'Email limit exceeded (180/250)' };
      handleEmailError(error);

      waitFor(() => {
        expect(screen.getByText('Sent: 180')).toBeInTheDocument();
        expect(screen.getByText('Limit: 250')).toBeInTheDocument();
      });
    });

    it('should use default counts when not in message', () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      const error = { message: 'Email limit exceeded' };
      handleEmailError(error);

      waitFor(() => {
        expect(screen.getByText('Sent: 0')).toBeInTheDocument();
        expect(screen.getByText('Limit: 0')).toBeInTheDocument();
      });
    });
  });

  describe('checkEmailError', () => {
    it('should check and return true for email limit errors', () => {
      const TestComponent = () => {
        const { checkEmailError } = useEmailLimit();
        const error = { message: 'Email limit exceeded (100/150)' };
        const isEmailError = checkEmailError(error);
        return <div>{isEmailError ? 'Email Error' : 'Other Error'}</div>;
      };

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      expect(screen.getByText('Email Error')).toBeInTheDocument();
    });

    it('should check and return false for non-email errors', () => {
      const TestComponent = () => {
        const { checkEmailError } = useEmailLimit();
        const error = { message: 'Network error' };
        const isEmailError = checkEmailError(error);
        return <div>{isEmailError ? 'Email Error' : 'Other Error'}</div>;
      };

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      expect(screen.getByText('Other Error')).toBeInTheDocument();
    });
  });

  describe('dispatchEmailLimitError', () => {
    it('should dispatch custom event with email data', async () => {
      const eventListener = jest.fn();
      window.addEventListener('email-limit-exceeded', eventListener);

      dispatchEmailLimitError(120, 180);

      await waitFor(() => {
        expect(eventListener).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { emailsSent: 120, emailLimit: 180 },
          })
        );
      });

      window.removeEventListener('email-limit-exceeded', eventListener);
    });

    it('should trigger dialog in provider', async () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      dispatchEmailLimitError(200, 300);

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
        expect(screen.getByText('Sent: 200')).toBeInTheDocument();
        expect(screen.getByText('Limit: 300')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid consecutive error dispatches', async () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      act(() => {
        dispatchEmailLimitError(100, 200);
        dispatchEmailLimitError(150, 200);
        dispatchEmailLimitError(180, 200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
        // Should show the last values
        expect(screen.getByText('Sent: 180')).toBeInTheDocument();
      });
    });

    it('should handle zero values', async () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      act(() => {
        dispatchEmailLimitError(0, 0);
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
        expect(screen.getByText('Sent: 0')).toBeInTheDocument();
        expect(screen.getByText('Limit: 0')).toBeInTheDocument();
      });
    });

    it('should handle negative values', async () => {
      render(
        <Wrapper>
          <div>Content</div>
        </Wrapper>
      );

      act(() => {
        dispatchEmailLimitError(-10, 100);
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-limit-dialog')).toBeInTheDocument();
        expect(screen.getByText('Sent: -10')).toBeInTheDocument();
      });
    });
  });
});
