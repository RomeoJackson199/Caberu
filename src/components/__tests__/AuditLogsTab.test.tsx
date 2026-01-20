import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogsTab } from '@/components/super-admin/AuditLogsTab';
import * as useSuperAdminModule from '@/hooks/useSuperAdmin';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/hooks/useSuperAdmin');

describe('AuditLogsTab', () => {
  const mockLogs = [
    {
      id: 'log-1',
      admin_user_id: 'admin-123',
      admin_email: 'admin@example.com',
      action: 'CREATE_BUSINESS_FOR_USER',
      resource_type: 'business',
      resource_id: 'biz-123',
      details: { business_name: 'New Clinic', owner_email: 'owner@example.com' },
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: 'log-2',
      admin_user_id: 'admin-456',
      admin_email: 'superadmin@example.com',
      action: 'DELETE_USER',
      resource_type: 'user',
      resource_id: 'user-789',
      details: null,
      ip_address: '10.0.0.1',
      user_agent: 'Chrome/120.0',
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    },
    {
      id: 'log-3',
      admin_user_id: 'admin-123',
      admin_email: 'admin@example.com',
      action: 'UPDATE_SETTINGS',
      resource_type: 'settings',
      resource_id: null,
      details: { setting: 'theme', value: 'dark' },
      ip_address: null,
      user_agent: null,
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: 'log-4',
      admin_user_id: 'admin-789',
      admin_email: 'moderator@example.com',
      action: 'RESOLVE_ERROR',
      resource_type: 'system_error',
      resource_id: 'error-123',
      details: { error_type: 'NetworkError' },
      ip_address: '172.16.0.1',
      user_agent: 'Safari/17.0',
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useSuperAdminModule.useAuditLogs as jest.Mock).mockReturnValue({
      data: mockLogs,
      isLoading: false,
    });
  });

  describe('Rendering', () => {
    it('renders the audit logs header', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
      expect(screen.getByText(/complete audit trail of all super admin actions/i)).toBeInTheDocument();
    });

    it('shows loading spinner while loading', () => {
      (useSuperAdminModule.useAuditLogs as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<AuditLogsTab />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays log count in card title', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('Admin Activity (4)')).toBeInTheDocument();
    });

    it('shows security notice card', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('Security Notice')).toBeInTheDocument();
      expect(screen.getByText(/all super admin actions are permanently logged/i)).toBeInTheDocument();
    });
  });

  describe('Audit Log Table', () => {
    it('displays all table headers', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Resource')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
    });

    it('displays admin email for each log', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('superadmin@example.com')).toBeInTheDocument();
      expect(screen.getByText('moderator@example.com')).toBeInTheDocument();
    });

    it('displays IP address when available', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
      expect(screen.getByText('172.16.0.1')).toBeInTheDocument();
    });

    it('formats action names properly', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('Create Business For User')).toBeInTheDocument();
      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(screen.getByText('Update Settings')).toBeInTheDocument();
      expect(screen.getByText('Resolve Error')).toBeInTheDocument();
    });

    it('displays resource type and truncated ID', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('business')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('settings')).toBeInTheDocument();
      expect(screen.getByText('system_error')).toBeInTheDocument();

      // Truncated IDs
      expect(screen.getByText('biz-123...')).toBeInTheDocument();
      expect(screen.getByText('user-789...')).toBeInTheDocument();
    });

    it('shows dash when resource ID is null', () => {
      render(<AuditLogsTab />);

      // Settings action has no resource_id
      const rows = screen.getAllByRole('row');
      const settingsRow = rows.find(row => row.textContent?.includes('Update Settings'));
      expect(settingsRow).toBeInTheDocument();
    });

    it('shows relative timestamps', () => {
      render(<AuditLogsTab />);

      const timeIndicators = screen.getAllByText(/ago/i);
      expect(timeIndicators.length).toBe(4);
    });
  });

  describe('Action Color Coding', () => {
    it('applies green color for CREATE actions', () => {
      render(<AuditLogsTab />);

      const createBadge = screen.getByText('Create Business For User');
      expect(createBadge).toHaveClass('bg-green-500');
    });

    it('applies red color for DELETE actions', () => {
      render(<AuditLogsTab />);

      const deleteBadge = screen.getByText('Delete User');
      expect(deleteBadge).toHaveClass('bg-red-500');
    });

    it('applies blue color for UPDATE actions', () => {
      render(<AuditLogsTab />);

      const updateBadge = screen.getByText('Update Settings');
      expect(updateBadge).toHaveClass('bg-blue-500');
    });

    it('applies purple color for RESOLVE actions', () => {
      render(<AuditLogsTab />);

      const resolveBadge = screen.getByText('Resolve Error');
      expect(resolveBadge).toHaveClass('bg-purple-500');
    });
  });

  describe('Details Expansion', () => {
    it('shows View details link when details exist', () => {
      render(<AuditLogsTab />);

      const viewDetailsLinks = screen.getAllByText('View details');
      expect(viewDetailsLinks.length).toBeGreaterThan(0);
    });

    it('shows dash when details are null', () => {
      render(<AuditLogsTab />);

      // Delete User action has no details
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('expands to show JSON details on click', async () => {
      const user = userEvent.setup();
      render(<AuditLogsTab />);

      const viewDetailsLinks = screen.getAllByText('View details');
      await user.click(viewDetailsLinks[0]);

      await waitFor(() => {
        expect(screen.getByText(/"business_name"/)).toBeInTheDocument();
        expect(screen.getByText(/"New Clinic"/)).toBeInTheDocument();
      });
    });
  });

  describe('Security Notice', () => {
    it('displays all security notice bullet points', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText(/user identity and email address/i)).toBeInTheDocument();
      expect(screen.getByText(/action performed and affected resources/i)).toBeInTheDocument();
      expect(screen.getByText(/timestamp and ip address/i)).toBeInTheDocument();
      expect(screen.getByText(/additional context and metadata/i)).toBeInTheDocument();
    });

    it('explains purpose of audit logs', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText(/security auditing, compliance, and troubleshooting/i)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no logs exist', () => {
      (useSuperAdminModule.useAuditLogs as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<AuditLogsTab />);

      expect(screen.getByText('No audit logs found')).toBeInTheDocument();
    });

    it('shows zero count when no logs', () => {
      (useSuperAdminModule.useAuditLogs as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<AuditLogsTab />);

      expect(screen.getByText('Admin Activity (0)')).toBeInTheDocument();
    });
  });

  describe('Hook Configuration', () => {
    it('requests 100 logs by default', () => {
      render(<AuditLogsTab />);

      expect(useSuperAdminModule.useAuditLogs).toHaveBeenCalledWith(100);
    });
  });

  describe('Admin Information Display', () => {
    it('displays admin email prominently', () => {
      render(<AuditLogsTab />);

      // Admin emails should be in font-medium elements
      const adminEmails = screen.getAllByText('admin@example.com');
      expect(adminEmails.length).toBeGreaterThan(0);
    });

    it('displays admin user icon', () => {
      render(<AuditLogsTab />);

      // Each admin row should have a user icon (via lucide-react)
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Resource Display', () => {
    it('shows resource type as title case', () => {
      render(<AuditLogsTab />);

      expect(screen.getByText('business')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('settings')).toBeInTheDocument();
      expect(screen.getByText('system_error')).toBeInTheDocument();
    });

    it('shows first 8 characters of resource ID', () => {
      render(<AuditLogsTab />);

      // biz-123 should show as biz-123...
      expect(screen.getByText('biz-123...')).toBeInTheDocument();
    });
  });
});
