import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessesTab } from '@/components/super-admin/BusinessesTab';
import * as useSuperAdminModule from '@/hooks/useSuperAdmin';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/hooks/useSuperAdmin');
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { business_id: 'new-123' }, error: null }),
    },
  },
}));

describe('BusinessesTab', () => {
  const mockBusinesses = [
    {
      id: 'biz-1',
      name: 'Smith Dental Clinic',
      slug: 'smith-dental',
      owner_email: 'smith@example.com',
      owner_name: 'John Smith',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      total_members: 5,
      total_appointments: 120,
      active_appointments: 8,
      total_patients: 250,
      custom_config: null,
      is_active: true,
    },
    {
      id: 'biz-2',
      name: 'Jones Medical Center',
      slug: 'jones-medical',
      owner_email: 'jones@example.com',
      owner_name: 'Jane Jones',
      created_at: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
      total_members: 12,
      total_appointments: 450,
      active_appointments: 25,
      total_patients: 800,
      custom_config: null,
      is_active: true,
    },
    {
      id: 'biz-3',
      name: 'Inactive Practice',
      slug: 'inactive-practice',
      owner_email: 'inactive@example.com',
      owner_name: 'Bob Brown',
      created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
      total_members: 2,
      total_appointments: 50,
      active_appointments: 0,
      total_patients: 30,
      custom_config: null,
      is_active: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useSuperAdminModule.useAllBusinesses as jest.Mock).mockReturnValue({
      data: mockBusinesses,
      isLoading: false,
    });

    (useSuperAdminModule.useCreateBusinessForUser as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ business_id: 'new-123' }),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('renders the business management header', () => {
      render(<BusinessesTab />);

      expect(screen.getByText('Business Management')).toBeInTheDocument();
      expect(screen.getByText(/view and manage all businesses on the platform/i)).toBeInTheDocument();
    });

    it('shows loading spinner while loading', () => {
      (useSuperAdminModule.useAllBusinesses as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<BusinessesTab />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays business count in card title', () => {
      render(<BusinessesTab />);

      expect(screen.getByText('All Businesses (3)')).toBeInTheDocument();
    });

    it('renders create business button', () => {
      render(<BusinessesTab />);

      expect(screen.getByRole('button', { name: /create business/i })).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<BusinessesTab />);

      expect(screen.getByPlaceholderText(/search by name, email, or slug/i)).toBeInTheDocument();
    });
  });

  describe('Business Table', () => {
    it('displays all table headers', () => {
      render(<BusinessesTab />);

      expect(screen.getByText('Business')).toBeInTheDocument();
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Patients')).toBeInTheDocument();
      expect(screen.getByText('Appointments')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });

    it('displays business data correctly', () => {
      render(<BusinessesTab />);

      // Check first business
      expect(screen.getByText('Smith Dental Clinic')).toBeInTheDocument();
      expect(screen.getByText('/smith-dental')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('smith@example.com')).toBeInTheDocument();

      // Check members count
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('250')).toBeInTheDocument();
    });

    it('shows active status badge for active businesses', () => {
      render(<BusinessesTab />);

      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBe(2);
    });

    it('shows inactive status badge for inactive businesses', () => {
      render(<BusinessesTab />);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('displays appointment statistics', () => {
      render(<BusinessesTab />);

      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('8 active')).toBeInTheDocument();
    });

    it('shows relative creation time', () => {
      render(<BusinessesTab />);

      // Check for relative time indicators (e.g., "1 day ago")
      const timeIndicators = screen.getAllByText(/ago/i);
      expect(timeIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('filters businesses by name', async () => {
      const user = userEvent.setup();
      render(<BusinessesTab />);

      const searchInput = screen.getByPlaceholderText(/search by name, email, or slug/i);
      await user.type(searchInput, 'Smith');

      await waitFor(() => {
        expect(screen.getByText('Smith Dental Clinic')).toBeInTheDocument();
        expect(screen.queryByText('Jones Medical Center')).not.toBeInTheDocument();
      });
    });

    it('filters businesses by email', async () => {
      const user = userEvent.setup();
      render(<BusinessesTab />);

      const searchInput = screen.getByPlaceholderText(/search by name, email, or slug/i);
      await user.type(searchInput, 'jones@');

      await waitFor(() => {
        expect(screen.queryByText('Smith Dental Clinic')).not.toBeInTheDocument();
        expect(screen.getByText('Jones Medical Center')).toBeInTheDocument();
      });
    });

    it('filters businesses by slug', async () => {
      const user = userEvent.setup();
      render(<BusinessesTab />);

      const searchInput = screen.getByPlaceholderText(/search by name, email, or slug/i);
      await user.type(searchInput, 'inactive-practice');

      await waitFor(() => {
        expect(screen.queryByText('Smith Dental Clinic')).not.toBeInTheDocument();
        expect(screen.getByText('Inactive Practice')).toBeInTheDocument();
      });
    });

    it('shows empty state when no businesses match search', async () => {
      const user = userEvent.setup();
      render(<BusinessesTab />);

      const searchInput = screen.getByPlaceholderText(/search by name, email, or slug/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/no businesses found matching your search/i)).toBeInTheDocument();
      });
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      render(<BusinessesTab />);

      const searchInput = screen.getByPlaceholderText(/search by name, email, or slug/i);
      await user.type(searchInput, 'SMITH');

      await waitFor(() => {
        expect(screen.getByText('Smith Dental Clinic')).toBeInTheDocument();
      });
    });
  });

  describe('Create Business Dialog', () => {
    it('opens create business dialog on button click', async () => {
      const user = userEvent.setup();
      render(<BusinessesTab />);

      await user.click(screen.getByRole('button', { name: /create business/i }));

      await waitFor(() => {
        expect(screen.getByText('Create Business for User')).toBeInTheDocument();
      });
    });

    it('shows form fields in dialog', async () => {
      const user = userEvent.setup();
      render(<BusinessesTab />);

      await user.click(screen.getByRole('button', { name: /create business/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/owner first name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/owner last name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/owner email/i)).toBeInTheDocument();
      });
    });

    it('closes dialog on cancel', async () => {
      const user = userEvent.setup();
      render(<BusinessesTab />);

      await user.click(screen.getByRole('button', { name: /create business/i }));

      await waitFor(() => {
        expect(screen.getByText('Create Business for User')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText('Create Business for User')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no businesses exist', () => {
      (useSuperAdminModule.useAllBusinesses as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<BusinessesTab />);

      expect(screen.getByText('No businesses found')).toBeInTheDocument();
    });

    it('shows correct count when no businesses', () => {
      (useSuperAdminModule.useAllBusinesses as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<BusinessesTab />);

      expect(screen.getByText('All Businesses (0)')).toBeInTheDocument();
    });
  });

  describe('Business Row Display', () => {
    it('displays business slug with forward slash prefix', () => {
      render(<BusinessesTab />);

      expect(screen.getByText('/smith-dental')).toBeInTheDocument();
      expect(screen.getByText('/jones-medical')).toBeInTheDocument();
    });

    it('shows owner information with email below name', () => {
      render(<BusinessesTab />);

      const smithOwner = screen.getByText('John Smith');
      expect(smithOwner).toBeInTheDocument();

      const smithEmail = screen.getByText('smith@example.com');
      expect(smithEmail).toBeInTheDocument();
    });
  });
});
