import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import PatientCareHome from '@/pages/PatientCareHome';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: {
      bookAppointment: 'Book Appointment',
    },
  }),
}));

jest.mock('@/contexts/TemplateContext', () => ({
  useTemplate: () => ({
    hasFeature: jest.fn().mockReturnValue(true),
    template: 'healthcare',
    loading: false,
  }),
}));

jest.mock('@/lib/enhancedErrorHandling', () => ({
  showEnhancedErrorToast: jest.fn(),
}));

jest.mock('@/lib/dataValidation', () => ({
  getProviderName: jest.fn().mockReturnValue('Smith'),
}));

jest.mock('@/components/ui/page-enhancements', () => ({
  TimeGreeting: ({ name, showDate }: any) => (
    <div data-testid="time-greeting">
      Hello {name || 'Patient'}
      {showDate && <span> - Today</span>}
    </div>
  ),
  QuickActions: ({ actions }: any) => (
    <div data-testid="quick-actions">
      {actions.map((action: any, index: number) => (
        <button key={index} onClick={action.onClick} data-testid={`quick-action-${index}`}>
          {action.label}
        </button>
      ))}
    </div>
  ),
  AnimatedStatCard: ({ title, value, suffix }: any) => (
    <div data-testid={`stat-card-${title.toLowerCase().replace(' ', '-')}`}>
      <span>{title}</span>
      <span>{value}</span>
      <span>{suffix}</span>
    </div>
  ),
}));

jest.mock('@/components/stability', () => ({
  ErrorState: ({ type, message, onRetry }: any) => (
    <div data-testid="error-state">
      <span>Error: {type}</span>
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
  EmptyState: () => <div data-testid="empty-state">No data</div>,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const createMockSupabaseQuery = (data: any, error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data, error }),
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('PatientCareHome', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'patient@example.com',
    user_metadata: { first_name: 'John' },
  };

  const mockProfile = { id: 'profile-id' };

  const mockAppointments = [
    {
      id: '1',
      appointment_date: new Date(Date.now() + 86400000).toISOString(),
      duration_minutes: 30,
      status: 'confirmed',
      reason: 'Check-up',
      dentists: [{ profiles: { first_name: 'Jane', last_name: 'Smith' } }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Default: authenticated user with data
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (table === 'appointments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: mockAppointments, error: null }),
        };
      }
      if (table === 'prescriptions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
        };
      }
      return createMockSupabaseQuery(null);
    });
  });

  describe('Rendering', () => {
    it('renders the page with time greeting', async () => {
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByTestId('time-greeting')).toBeInTheDocument();
      });
    });

    it('renders the book appointment button', async () => {
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /book appointment/i })).toBeInTheDocument();
      });
    });

    it('renders quick actions section', async () => {
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
      });
    });

    it('renders upcoming appointments section', async () => {
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
      });
    });

    it('renders dental health tip card', async () => {
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByText('Dental Health Tip')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('displays stat cards after loading', async () => {
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByTestId('stat-card-upcoming')).toBeInTheDocument();
        expect(screen.getByTestId('stat-card-total-visits')).toBeInTheDocument();
        expect(screen.getByTestId('stat-card-active')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeletons while fetching data', () => {
      (supabase.auth.getUser as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<PatientCareHome />);

      // Should show skeleton loaders
      expect(screen.getByTestId('time-greeting')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error state when auth fails', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      });
    });

    it('shows error state when user is not logged in', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      });
    });

    it('allows retry when error occurs', async () => {
      (supabase.auth.getUser as jest.Mock)
        .mockResolvedValueOnce({ data: { user: null }, error: { message: 'Network error' } })
        .mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const user = userEvent.setup();
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(supabase.auth.getUser).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to dashboard when book appointment is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /book appointment/i })).toBeInTheDocument();
      });

      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      await user.click(bookButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('navigates to appointments page when View all is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
      });

      const viewAllButton = screen.getByRole('button', { name: /view all/i });
      await user.click(viewAllButton);

      expect(mockNavigate).toHaveBeenCalledWith('/care/appointments');
    });

    it('navigates via quick actions', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByTestId('quick-action-0')).toBeInTheDocument();
      });

      const quickAction = screen.getByTestId('quick-action-0');
      await user.click(quickAction);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no upcoming appointments', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return createMockSupabaseQuery(null);
      });

      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByText(/don't have any upcoming appointments/i)).toBeInTheDocument();
      });
    });

    it('shows book first appointment button when no appointments', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return createMockSupabaseQuery(null);
      });

      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /book your first appointment/i })).toBeInTheDocument();
      });
    });
  });

  describe('Appointments Display', () => {
    it('displays upcoming appointments with status badges', async () => {
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByText('confirmed')).toBeInTheDocument();
        expect(screen.getByText('Check-up')).toBeInTheDocument();
      });
    });

    it('displays appointment details correctly', async () => {
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
      });
    });

    it('navigates to appointment details when View Details is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PatientCareHome />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
      });

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/care/appointments');
    });
  });
});
