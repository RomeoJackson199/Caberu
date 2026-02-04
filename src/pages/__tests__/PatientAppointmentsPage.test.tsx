import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import PatientAppointmentsPage from '@/pages/PatientAppointmentsPage';
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
      pnav: { care: { appointments: 'My Appointments' } },
      bookAppointment: 'Book Appointment',
      upcoming: 'Upcoming',
      past: 'Past',
      book: 'Book New',
    },
  }),
}));

jest.mock('@/hooks/useBusinessTemplate', () => ({
  useBusinessTemplate: () => ({
    hasFeature: jest.fn().mockReturnValue(true),
    loading: false,
  }),
}));

jest.mock('@/components/patients/AppointmentsTab', () => ({
  AppointmentsTab: ({ user }: any) => (
    <div data-testid="appointments-tab">
      Appointments Tab for {user?.email || 'user'}
    </div>
  ),
}));

jest.mock('@/components/ui/polished-components', () => ({
  SectionHeader: ({ children }: any) => <div>{children}</div>,
  StatCard: ({ title, value, description }: any) => (
    <div data-testid={`stat-${title.toLowerCase()}`}>
      <span>{title}</span>
      <span>{value}</span>
      <span>{description}</span>
    </div>
  ),
  AnimatedBackground: () => <div data-testid="animated-background" />,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('PatientAppointmentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Default mock: authenticated user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'patient@example.com',
        },
      },
    });

    // Mock from() method
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'profile-id' },
            error: null,
          }),
        };
      }
      if (table === 'appointments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                status: 'confirmed',
                appointment_date: new Date(Date.now() + 86400000).toISOString(),
              },
              {
                id: '2',
                status: 'completed',
                appointment_date: new Date(Date.now() - 86400000).toISOString(),
              },
            ],
            error: null,
          }),
        };
      }
      return mockQueryBuilder;
    });
  });

  describe('Rendering', () => {
    it('renders the page header', async () => {
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByText('My Appointments')).toBeInTheDocument();
      });
    });

    it('renders the book appointment button', async () => {
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /book appointment/i })).toBeInTheDocument();
      });
    });

    it('renders AI Assistant button when feature is enabled', async () => {
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ai assistant/i })).toBeInTheDocument();
      });
    });

    it('renders tabs for upcoming, past, and book new', async () => {
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /upcoming/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /past/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /book/i })).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('displays appointment statistics after loading', async () => {
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('stat-upcoming')).toBeInTheDocument();
        expect(screen.getByTestId('stat-completed')).toBeInTheDocument();
        expect(screen.getByTestId('stat-total')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      // Make the auth call hang to show loading state
      (supabase.auth.getUser as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<PatientAppointmentsPage />);

      expect(screen.getByText('My Appointments')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to past tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /past/i })).toBeInTheDocument();
      });

      const pastTab = screen.getByRole('tab', { name: /past/i });
      await user.click(pastTab);

      expect(pastTab).toHaveAttribute('data-state', 'active');
    });

    it('switches to book new tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /book/i })).toBeInTheDocument();
      });

      const bookTab = screen.getByRole('tab', { name: /book/i });
      await user.click(bookTab);

      expect(bookTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Navigation', () => {
    it('navigates to dashboard when book appointment is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /book appointment/i })).toBeInTheDocument();
      });

      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      await user.click(bookButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('navigates to chat when AI Assistant is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ai assistant/i })).toBeInTheDocument();
      });

      const aiButton = screen.getByRole('button', { name: /ai assistant/i });
      await user.click(aiButton);

      expect(mockNavigate).toHaveBeenCalledWith('/chat');
    });
  });

  describe('Loading States', () => {
    it('shows loading message when user is not yet loaded', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByText(/loading appointments/i)).toBeInTheDocument();
      });
    });
  });

  describe('AppointmentsTab Integration', () => {
    it('renders AppointmentsTab component when user is loaded', async () => {
      renderWithRouter(<PatientAppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('appointments-tab')).toBeInTheDocument();
      });
    });
  });
});
