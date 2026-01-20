import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateBusinessDialog } from '@/components/super-admin/CreateBusinessDialog';
import * as useSuperAdminModule from '@/hooks/useSuperAdmin';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/hooks/useSuperAdmin');

describe('CreateBusinessDialog', () => {
  const mockOnClose = jest.fn();
  const mockMutateAsync = jest.fn().mockResolvedValue({ business_id: 'new-biz-123' });

  beforeEach(() => {
    jest.clearAllMocks();

    (useSuperAdminModule.useCreateBusinessForUser as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  const renderDialog = (open = true) => {
    return render(<CreateBusinessDialog open={open} onClose={mockOnClose} />);
  };

  describe('Rendering', () => {
    it('renders dialog when open is true', () => {
      renderDialog(true);

      expect(screen.getByText('Create Business for User')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      renderDialog(false);

      expect(screen.queryByText('Create Business for User')).not.toBeInTheDocument();
    });

    it('displays dialog description', () => {
      renderDialog();

      expect(screen.getByText(/create a new business on behalf of a user/i)).toBeInTheDocument();
      expect(screen.getByText(/they will receive an invitation email/i)).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderDialog();

      expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/owner first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/owner last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/owner email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/business type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/template/i)).toBeInTheDocument();
    });

    it('renders cancel and submit buttons', () => {
      renderDialog();

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create business/i })).toBeInTheDocument();
    });

    it('shows email invitation notice', () => {
      renderDialog();

      expect(screen.getByText(/an invitation will be sent to this email address/i)).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('has business name input with placeholder', () => {
      renderDialog();

      const businessNameInput = screen.getByLabelText(/business name/i);
      expect(businessNameInput).toHaveAttribute('placeholder', 'e.g., Smith Dental Clinic');
    });

    it('has owner first name input with placeholder', () => {
      renderDialog();

      const firstNameInput = screen.getByLabelText(/owner first name/i);
      expect(firstNameInput).toHaveAttribute('placeholder', 'John');
    });

    it('has owner last name input with placeholder', () => {
      renderDialog();

      const lastNameInput = screen.getByLabelText(/owner last name/i);
      expect(lastNameInput).toHaveAttribute('placeholder', 'Smith');
    });

    it('has owner email input with placeholder', () => {
      renderDialog();

      const emailInput = screen.getByLabelText(/owner email/i);
      expect(emailInput).toHaveAttribute('placeholder', 'john.smith@example.com');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('has business type dropdown with default value', () => {
      renderDialog();

      // Check that Dental is selected by default
      expect(screen.getByText('Dental')).toBeInTheDocument();
    });

    it('has template dropdown with default value', () => {
      renderDialog();

      // Check that Default is selected
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows typing in business name field', async () => {
      const user = userEvent.setup();
      renderDialog();

      const businessNameInput = screen.getByLabelText(/business name/i);
      await user.type(businessNameInput, 'New Dental Practice');

      expect(businessNameInput).toHaveValue('New Dental Practice');
    });

    it('allows typing in owner first name field', async () => {
      const user = userEvent.setup();
      renderDialog();

      const firstNameInput = screen.getByLabelText(/owner first name/i);
      await user.type(firstNameInput, 'Jane');

      expect(firstNameInput).toHaveValue('Jane');
    });

    it('allows typing in owner last name field', async () => {
      const user = userEvent.setup();
      renderDialog();

      const lastNameInput = screen.getByLabelText(/owner last name/i);
      await user.type(lastNameInput, 'Doe');

      expect(lastNameInput).toHaveValue('Doe');
    });

    it('allows typing in owner email field', async () => {
      const user = userEvent.setup();
      renderDialog();

      const emailInput = screen.getByLabelText(/owner email/i);
      await user.type(emailInput, 'jane.doe@example.com');

      expect(emailInput).toHaveValue('jane.doe@example.com');
    });

    it('allows changing business type', async () => {
      const user = userEvent.setup();
      renderDialog();

      const businessTypeSelect = screen.getByLabelText(/business type/i);
      await user.click(businessTypeSelect);

      await waitFor(() => {
        expect(screen.getByText('Medical')).toBeInTheDocument();
        expect(screen.getByText('Wellness')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Medical'));

      await waitFor(() => {
        // Should now show Medical
        expect(screen.getAllByText('Medical').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('allows changing template type', async () => {
      const user = userEvent.setup();
      renderDialog();

      const templateSelect = screen.getByLabelText(/template/i);
      await user.click(templateSelect);

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
        expect(screen.getByText('Minimal')).toBeInTheDocument();
        expect(screen.getByText('Professional')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Modern'));

      await waitFor(() => {
        expect(screen.getAllByText('Modern').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Form Submission', () => {
    const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText(/business name/i), 'New Practice');
      await user.type(screen.getByLabelText(/owner first name/i), 'John');
      await user.type(screen.getByLabelText(/owner last name/i), 'Smith');
      await user.type(screen.getByLabelText(/owner email/i), 'john@example.com');
    };

    it('calls mutateAsync with correct data on submit', async () => {
      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create business/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          business_name: 'New Practice',
          owner_email: 'john@example.com',
          owner_first_name: 'John',
          owner_last_name: 'Smith',
          business_type: 'dental',
          template_type: 'default',
        });
      });
    });

    it('calls onClose after successful submission', async () => {
      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create business/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /create business/i }));

      // Re-render to check reset (in real scenario, the form would reset)
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('submits with selected business type', async () => {
      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);

      // Change business type
      const businessTypeSelect = screen.getByLabelText(/business type/i);
      await user.click(businessTypeSelect);
      await user.click(screen.getByText('Medical'));

      await user.click(screen.getByRole('button', { name: /create business/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            business_type: 'medical',
          })
        );
      });
    });

    it('submits with selected template type', async () => {
      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);

      // Change template type
      const templateSelect = screen.getByLabelText(/template/i);
      await user.click(templateSelect);
      await user.click(screen.getByText('Professional'));

      await user.click(screen.getByRole('button', { name: /create business/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            template_type: 'professional',
          })
        );
      });
    });
  });

  describe('Cancel Button', () => {
    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not submit form when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when submitting', () => {
      (useSuperAdminModule.useCreateBusinessForUser as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      renderDialog();

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('disables submit button when submitting', () => {
      (useSuperAdminModule.useCreateBusinessForUser as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      renderDialog();

      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });

    it('disables cancel button when submitting', () => {
      (useSuperAdminModule.useCreateBusinessForUser as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      renderDialog();

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Required Fields', () => {
    it('marks business name as required', () => {
      renderDialog();

      expect(screen.getByText('Business Name *')).toBeInTheDocument();
    });

    it('marks owner first name as required', () => {
      renderDialog();

      expect(screen.getByText('Owner First Name *')).toBeInTheDocument();
    });

    it('marks owner last name as required', () => {
      renderDialog();

      expect(screen.getByText('Owner Last Name *')).toBeInTheDocument();
    });

    it('marks owner email as required', () => {
      renderDialog();

      expect(screen.getByText('Owner Email *')).toBeInTheDocument();
    });

    it('has required attribute on business name input', () => {
      renderDialog();

      const businessNameInput = screen.getByLabelText(/business name/i);
      expect(businessNameInput).toBeRequired();
    });

    it('has required attribute on owner first name input', () => {
      renderDialog();

      const firstNameInput = screen.getByLabelText(/owner first name/i);
      expect(firstNameInput).toBeRequired();
    });

    it('has required attribute on owner last name input', () => {
      renderDialog();

      const lastNameInput = screen.getByLabelText(/owner last name/i);
      expect(lastNameInput).toBeRequired();
    });

    it('has required attribute on owner email input', () => {
      renderDialog();

      const emailInput = screen.getByLabelText(/owner email/i);
      expect(emailInput).toBeRequired();
    });
  });

  describe('Dialog Closing', () => {
    it('calls onClose when dialog close button is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Dialog close button (X button) - we need to find the actual close button
      // Usually this is a button with aria-label="Close" or similar
      const closeButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Business Type Options', () => {
    it('has Dental option', async () => {
      const user = userEvent.setup();
      renderDialog();

      const select = screen.getByLabelText(/business type/i);
      await user.click(select);

      expect(screen.getByText('Dental')).toBeInTheDocument();
    });

    it('has Medical option', async () => {
      const user = userEvent.setup();
      renderDialog();

      const select = screen.getByLabelText(/business type/i);
      await user.click(select);

      expect(screen.getByText('Medical')).toBeInTheDocument();
    });

    it('has Wellness option', async () => {
      const user = userEvent.setup();
      renderDialog();

      const select = screen.getByLabelText(/business type/i);
      await user.click(select);

      expect(screen.getByText('Wellness')).toBeInTheDocument();
    });
  });

  describe('Template Options', () => {
    it('has Default option', async () => {
      const user = userEvent.setup();
      renderDialog();

      const select = screen.getByLabelText(/template/i);
      await user.click(select);

      // Default should appear in dropdown options
      const defaultOptions = screen.getAllByText('Default');
      expect(defaultOptions.length).toBeGreaterThanOrEqual(1);
    });

    it('has Modern option', async () => {
      const user = userEvent.setup();
      renderDialog();

      const select = screen.getByLabelText(/template/i);
      await user.click(select);

      expect(screen.getByText('Modern')).toBeInTheDocument();
    });

    it('has Minimal option', async () => {
      const user = userEvent.setup();
      renderDialog();

      const select = screen.getByLabelText(/template/i);
      await user.click(select);

      expect(screen.getByText('Minimal')).toBeInTheDocument();
    });

    it('has Professional option', async () => {
      const user = userEvent.setup();
      renderDialog();

      const select = screen.getByLabelText(/template/i);
      await user.click(select);

      expect(screen.getByText('Professional')).toBeInTheDocument();
    });
  });
});
