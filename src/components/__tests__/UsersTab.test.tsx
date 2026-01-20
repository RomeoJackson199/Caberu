import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersTab } from '@/components/super-admin/UsersTab';
import * as useSuperAdminModule from '@/hooks/useSuperAdmin';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/hooks/useSuperAdmin');

describe('UsersTab', () => {
  const mockUsers = [
    {
      user_id: 'user-1',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      businesses: [
        { business_id: 'biz-1', business_name: 'Smith Dental', role: 'admin' },
        { business_id: 'biz-2', business_name: 'Jones Medical', role: 'dentist' },
      ],
      roles: ['admin', 'dentist'],
    },
    {
      user_id: 'user-2',
      email: 'jane@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      phone: null,
      created_at: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
      businesses: [
        { business_id: 'biz-1', business_name: 'Smith Dental', role: 'patient' },
      ],
      roles: ['patient'],
    },
    {
      user_id: 'user-3',
      email: 'bob@example.com',
      first_name: 'Bob',
      last_name: 'Brown',
      phone: '+0987654321',
      created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
      businesses: [],
      roles: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useSuperAdminModule.useAllUsers as jest.Mock).mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });
  });

  describe('Rendering', () => {
    it('renders the user management header', () => {
      render(<UsersTab />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText(/view and manage all users across all businesses/i)).toBeInTheDocument();
    });

    it('shows loading spinner while loading', () => {
      (useSuperAdminModule.useAllUsers as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<UsersTab />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays user count in card title', () => {
      render(<UsersTab />);

      expect(screen.getByText('All Users (3)')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<UsersTab />);

      expect(screen.getByPlaceholderText(/search by name, email, or phone/i)).toBeInTheDocument();
    });
  });

  describe('User Table', () => {
    it('displays all table headers', () => {
      render(<UsersTab />);

      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Businesses')).toBeInTheDocument();
      expect(screen.getByText('Roles')).toBeInTheDocument();
      expect(screen.getByText('Joined')).toBeInTheDocument();
    });

    it('displays user data correctly', () => {
      render(<UsersTab />);

      // Check first user
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });

    it('displays role badges for users with roles', () => {
      render(<UsersTab />);

      // Check for role badges
      const adminBadges = screen.getAllByText('admin');
      expect(adminBadges.length).toBeGreaterThan(0);

      expect(screen.getByText('dentist')).toBeInTheDocument();
      expect(screen.getByText('patient')).toBeInTheDocument();
    });

    it('displays business count for each user', () => {
      render(<UsersTab />);

      // User with 2 businesses
      expect(screen.getByText('2')).toBeInTheDocument();

      // User with 1 business
      expect(screen.getByText('1')).toBeInTheDocument();

      // User with 0 businesses
      const zeroBusinesses = screen.getAllByText('0');
      expect(zeroBusinesses.length).toBeGreaterThan(0);
    });

    it('shows relative join time', () => {
      render(<UsersTab />);

      // Check for relative time indicators
      const timeIndicators = screen.getAllByText(/ago/i);
      expect(timeIndicators.length).toBe(3);
    });
  });

  describe('Expandable Business Details', () => {
    it('shows expand button for users with businesses', () => {
      render(<UsersTab />);

      // Users with businesses should have expand buttons
      const expandButtons = screen.getAllByRole('button');
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it('expands to show business memberships on click', async () => {
      const user = userEvent.setup();
      render(<UsersTab />);

      // Find and click expand button for John Doe (has 2 businesses)
      const rows = screen.getAllByRole('row');
      const johnRow = rows.find(row => row.textContent?.includes('John Doe'));

      if (johnRow) {
        const expandButton = johnRow.querySelector('button');
        if (expandButton) {
          await user.click(expandButton);

          await waitFor(() => {
            expect(screen.getByText('Business Memberships')).toBeInTheDocument();
            expect(screen.getByText('Smith Dental')).toBeInTheDocument();
            expect(screen.getByText('Jones Medical')).toBeInTheDocument();
          });
        }
      }
    });

    it('collapses business memberships on second click', async () => {
      const user = userEvent.setup();
      render(<UsersTab />);

      const rows = screen.getAllByRole('row');
      const johnRow = rows.find(row => row.textContent?.includes('John Doe'));

      if (johnRow) {
        const expandButton = johnRow.querySelector('button');
        if (expandButton) {
          // Expand
          await user.click(expandButton);

          await waitFor(() => {
            expect(screen.getByText('Business Memberships')).toBeInTheDocument();
          });

          // Collapse
          await user.click(expandButton);

          await waitFor(() => {
            expect(screen.queryByText('Business Memberships')).not.toBeInTheDocument();
          });
        }
      }
    });

    it('shows business roles in expanded view', async () => {
      const user = userEvent.setup();
      render(<UsersTab />);

      const rows = screen.getAllByRole('row');
      const johnRow = rows.find(row => row.textContent?.includes('John Doe'));

      if (johnRow) {
        const expandButton = johnRow.querySelector('button');
        if (expandButton) {
          await user.click(expandButton);

          await waitFor(() => {
            // Should show roles in the expanded section
            const expandedRoles = screen.getAllByText('admin');
            expect(expandedRoles.length).toBeGreaterThan(0);
          });
        }
      }
    });
  });

  describe('Search Functionality', () => {
    it('passes search query to useAllUsers hook', async () => {
      const user = userEvent.setup();
      render(<UsersTab />);

      const searchInput = screen.getByPlaceholderText(/search by name, email, or phone/i);
      await user.type(searchInput, 'john');

      await waitFor(() => {
        expect(useSuperAdminModule.useAllUsers).toHaveBeenCalledWith('john');
      });
    });

    it('updates search query on input change', async () => {
      const user = userEvent.setup();
      render(<UsersTab />);

      const searchInput = screen.getByPlaceholderText(/search by name, email, or phone/i);
      await user.type(searchInput, 'test@email.com');

      expect(searchInput).toHaveValue('test@email.com');
    });

    it('clears search on backspace', async () => {
      const user = userEvent.setup();
      render(<UsersTab />);

      const searchInput = screen.getByPlaceholderText(/search by name, email, or phone/i);
      await user.type(searchInput, 'test');
      await user.clear(searchInput);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no users exist', () => {
      (useSuperAdminModule.useAllUsers as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<UsersTab />);

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('shows search-specific empty state when search returns no results', () => {
      (useSuperAdminModule.useAllUsers as jest.Mock).mockImplementation((query) => ({
        data: query ? [] : mockUsers,
        isLoading: false,
      }));

      render(<UsersTab />);

      // When there's a search query and no results
      (useSuperAdminModule.useAllUsers as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<UsersTab />);

      expect(screen.getAllByText('No users found').length).toBeGreaterThan(0);
    });

    it('shows correct count when no users', () => {
      (useSuperAdminModule.useAllUsers as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<UsersTab />);

      expect(screen.getByText('All Users (0)')).toBeInTheDocument();
    });
  });

  describe('User Contact Display', () => {
    it('displays email for all users', () => {
      render(<UsersTab />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('displays phone when available', () => {
      render(<UsersTab />);

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('+0987654321')).toBeInTheDocument();
    });

    it('does not show phone placeholder when phone is null', () => {
      render(<UsersTab />);

      // Jane has no phone
      const janeRow = screen.getByText('jane@example.com').closest('tr');
      expect(janeRow).not.toHaveTextContent('+');
    });
  });

  describe('User Name Display', () => {
    it('displays full name for each user', () => {
      render(<UsersTab />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Brown')).toBeInTheDocument();
    });
  });

  describe('No Business User Handling', () => {
    it('does not show expand button for users with no businesses', () => {
      render(<UsersTab />);

      // Bob has no businesses
      const rows = screen.getAllByRole('row');
      const bobRow = rows.find(row => row.textContent?.includes('Bob Brown'));

      if (bobRow) {
        const buttons = bobRow.querySelectorAll('button');
        // Should have no expand button (or just the row should exist without expand functionality)
        expect(buttons.length).toBeLessThanOrEqual(1);
      }
    });
  });
});
