/**
 * Tests for appointmentStateMachine.ts
 */

import {
  deriveAppointmentState,
  getStateConfig,
  getStatePermissions,
  getAppointmentGroup,
  isVisibleInRecords,
  isVisibleInPayments,
  isValidTransition,
  STATE_CONFIG,
  VALID_TRANSITIONS,
  type AppointmentState,
  type AppointmentStateInput,
} from '../appointmentStateMachine';

describe('appointmentStateMachine.ts', () => {
  describe('deriveAppointmentState', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    describe('CANCELLED state', () => {
      it('should return CANCELLED when status is cancelled', () => {
        const input: AppointmentStateInput = {
          status: 'cancelled',
          payment_status: null,
          appointment_date: futureDate,
          completed_at: null,
        };
        expect(deriveAppointmentState(input)).toBe('CANCELLED');
      });

      it('should return CANCELLED even if appointment has payment', () => {
        const input: AppointmentStateInput = {
          status: 'cancelled',
          payment_status: 'paid',
          appointment_date: pastDate,
          completed_at: '2024-01-01T10:00:00',
        };
        expect(deriveAppointmentState(input)).toBe('CANCELLED');
      });
    });

    describe('UPCOMING state', () => {
      it('should return UPCOMING for future confirmed appointment', () => {
        const input: AppointmentStateInput = {
          status: 'confirmed',
          payment_status: null,
          appointment_date: futureDate,
          completed_at: null,
        };
        expect(deriveAppointmentState(input)).toBe('UPCOMING');
      });

      it('should return UPCOMING for future pending appointment', () => {
        const input: AppointmentStateInput = {
          status: 'pending',
          payment_status: null,
          appointment_date: futureDate,
          completed_at: null,
        };
        expect(deriveAppointmentState(input)).toBe('UPCOMING');
      });
    });

    describe('COMPLETED_DRAFT state', () => {
      it('should return COMPLETED_DRAFT for completed status without finalization', () => {
        const input: AppointmentStateInput = {
          status: 'completed',
          payment_status: null,
          appointment_date: pastDate,
          completed_at: null,
          is_finalized: false,
        };
        expect(deriveAppointmentState(input)).toBe('COMPLETED_DRAFT');
      });

      it('should return COMPLETED_DRAFT for past appointment not finalized', () => {
        const input: AppointmentStateInput = {
          status: 'confirmed',
          payment_status: null,
          appointment_date: pastDate,
          completed_at: null,
          is_finalized: false,
        };
        expect(deriveAppointmentState(input)).toBe('COMPLETED_DRAFT');
      });
    });

    describe('COMPLETED_FINAL_UNPAID state', () => {
      it('should return COMPLETED_FINAL_UNPAID for finalized with pending payment', () => {
        const input: AppointmentStateInput = {
          status: 'completed',
          payment_status: 'pending',
          appointment_date: pastDate,
          completed_at: '2024-01-01T11:00:00',
          is_finalized: true,
        };
        expect(deriveAppointmentState(input)).toBe('COMPLETED_FINAL_UNPAID');
      });

      it('should return COMPLETED_FINAL_UNPAID for finalized with unpaid status', () => {
        const input: AppointmentStateInput = {
          status: 'completed',
          payment_status: 'unpaid',
          appointment_date: pastDate,
          completed_at: '2024-01-01T11:00:00',
        };
        expect(deriveAppointmentState(input)).toBe('COMPLETED_FINAL_UNPAID');
      });

      it('should return COMPLETED_FINAL_UNPAID when amount_due_cents is positive', () => {
        const input: AppointmentStateInput = {
          status: 'completed',
          payment_status: null,
          appointment_date: pastDate,
          completed_at: '2024-01-01T11:00:00',
          amount_due_cents: 5000,
        };
        expect(deriveAppointmentState(input)).toBe('COMPLETED_FINAL_UNPAID');
      });
    });

    describe('COMPLETED_FINAL_PAID state', () => {
      it('should return COMPLETED_FINAL_PAID for finalized with paid status', () => {
        const input: AppointmentStateInput = {
          status: 'completed',
          payment_status: 'paid',
          appointment_date: pastDate,
          completed_at: '2024-01-01T11:00:00',
        };
        expect(deriveAppointmentState(input)).toBe('COMPLETED_FINAL_PAID');
      });

      it('should return COMPLETED_FINAL_UNPAID for finalized with null payment_status', () => {
        const input: AppointmentStateInput = {
          status: 'completed',
          payment_status: null,
          appointment_date: pastDate,
          completed_at: '2024-01-01T11:00:00',
          amount_due_cents: 0,
        };
        expect(deriveAppointmentState(input)).toBe('COMPLETED_FINAL_UNPAID');
      });

      it('should return COMPLETED_FINAL_UNPAID for finalized with undefined payment_status fields', () => {
        const input: AppointmentStateInput = {
          status: 'completed',
          payment_status: null,
          appointment_date: pastDate,
          completed_at: '2024-01-01T11:00:00',
        };
        expect(deriveAppointmentState(input)).toBe('COMPLETED_FINAL_UNPAID');
      });
    });
  });

  describe('STATE_CONFIG', () => {
    it('should have configuration for all states', () => {
      const states: AppointmentState[] = [
        'UPCOMING',
        'COMPLETED_DRAFT',
        'COMPLETED_FINAL_UNPAID',
        'COMPLETED_FINAL_PAID',
        'CANCELLED',
      ];

      states.forEach(state => {
        expect(STATE_CONFIG[state]).toBeDefined();
        expect(STATE_CONFIG[state].label).toBeTruthy();
        expect(STATE_CONFIG[state].description).toBeTruthy();
        expect(STATE_CONFIG[state].badgeVariant).toBeTruthy();
        expect(STATE_CONFIG[state].badgeClassName).toBeTruthy();
      });
    });
  });

  describe('getStateConfig', () => {
    it('should return correct config for UPCOMING', () => {
      const config = getStateConfig('UPCOMING');
      expect(config.label).toBe('Upcoming appointment');
    });

    it('should return correct config for COMPLETED_DRAFT', () => {
      const config = getStateConfig('COMPLETED_DRAFT');
      expect(config.label).toBe('Appointment completed');
      expect(config.description).toBe('Paperwork in progress');
    });

    it('should return correct config for COMPLETED_FINAL_UNPAID', () => {
      const config = getStateConfig('COMPLETED_FINAL_UNPAID');
      expect(config.label).toBe('Payment required');
    });

    it('should return correct config for COMPLETED_FINAL_PAID', () => {
      const config = getStateConfig('COMPLETED_FINAL_PAID');
      expect(config.label).toBe('Appointment completed');
      expect(config.description).toBe('Fully closed');
    });

    it('should return correct config for CANCELLED', () => {
      const config = getStateConfig('CANCELLED');
      expect(config.label).toBe('Appointment cancelled');
    });
  });

  describe('getStatePermissions', () => {
    describe('UPCOMING permissions', () => {
      it('should allow reschedule and cancel', () => {
        const permissions = getStatePermissions('UPCOMING');
        expect(permissions.canReschedule).toBe(true);
        expect(permissions.canCancel).toBe(true);
      });

      it('should not allow pay or download documents', () => {
        const permissions = getStatePermissions('UPCOMING');
        expect(permissions.canPay).toBe(false);
        expect(permissions.canDownloadDocuments).toBe(false);
      });

      it('should not show records or payments', () => {
        const permissions = getStatePermissions('UPCOMING');
        expect(permissions.recordsVisible).toBe(false);
        expect(permissions.paymentsVisible).toBe(false);
        expect(permissions.treatmentSummaryVisible).toBe(false);
      });
    });

    describe('COMPLETED_DRAFT permissions', () => {
      it('should not allow any patient actions', () => {
        const permissions = getStatePermissions('COMPLETED_DRAFT');
        expect(permissions.canReschedule).toBe(false);
        expect(permissions.canCancel).toBe(false);
        expect(permissions.canPay).toBe(false);
        expect(permissions.canDownloadDocuments).toBe(false);
      });

      it('should not show any details', () => {
        const permissions = getStatePermissions('COMPLETED_DRAFT');
        expect(permissions.recordsVisible).toBe(false);
        expect(permissions.paymentsVisible).toBe(false);
      });
    });

    describe('COMPLETED_FINAL_UNPAID permissions', () => {
      it('should allow pay and download documents', () => {
        const permissions = getStatePermissions('COMPLETED_FINAL_UNPAID');
        expect(permissions.canPay).toBe(true);
        expect(permissions.canDownloadDocuments).toBe(true);
      });

      it('should show all details', () => {
        const permissions = getStatePermissions('COMPLETED_FINAL_UNPAID');
        expect(permissions.recordsVisible).toBe(true);
        expect(permissions.paymentsVisible).toBe(true);
        expect(permissions.treatmentSummaryVisible).toBe(true);
      });

      it('should not allow reschedule or cancel', () => {
        const permissions = getStatePermissions('COMPLETED_FINAL_UNPAID');
        expect(permissions.canReschedule).toBe(false);
        expect(permissions.canCancel).toBe(false);
      });
    });

    describe('COMPLETED_FINAL_PAID permissions', () => {
      it('should allow download documents but not pay', () => {
        const permissions = getStatePermissions('COMPLETED_FINAL_PAID');
        expect(permissions.canPay).toBe(false);
        expect(permissions.canDownloadDocuments).toBe(true);
      });

      it('should show all details', () => {
        const permissions = getStatePermissions('COMPLETED_FINAL_PAID');
        expect(permissions.recordsVisible).toBe(true);
        expect(permissions.paymentsVisible).toBe(true);
        expect(permissions.treatmentSummaryVisible).toBe(true);
      });
    });

    describe('CANCELLED permissions', () => {
      it('should not allow any actions', () => {
        const permissions = getStatePermissions('CANCELLED');
        expect(permissions.canReschedule).toBe(false);
        expect(permissions.canCancel).toBe(false);
        expect(permissions.canPay).toBe(false);
        expect(permissions.canDownloadDocuments).toBe(false);
      });

      it('should not show any details', () => {
        const permissions = getStatePermissions('CANCELLED');
        expect(permissions.recordsVisible).toBe(false);
        expect(permissions.paymentsVisible).toBe(false);
        expect(permissions.treatmentSummaryVisible).toBe(false);
      });
    });
  });

  describe('getAppointmentGroup', () => {
    it('should return upcoming for UPCOMING state', () => {
      expect(getAppointmentGroup('UPCOMING')).toBe('upcoming');
    });

    it('should return completed for all completed states', () => {
      expect(getAppointmentGroup('COMPLETED_DRAFT')).toBe('completed');
      expect(getAppointmentGroup('COMPLETED_FINAL_UNPAID')).toBe('completed');
      expect(getAppointmentGroup('COMPLETED_FINAL_PAID')).toBe('completed');
    });

    it('should return cancelled for CANCELLED state', () => {
      expect(getAppointmentGroup('CANCELLED')).toBe('cancelled');
    });
  });

  describe('isVisibleInRecords', () => {
    it('should return false for UPCOMING', () => {
      expect(isVisibleInRecords('UPCOMING')).toBe(false);
    });

    it('should return false for COMPLETED_DRAFT', () => {
      expect(isVisibleInRecords('COMPLETED_DRAFT')).toBe(false);
    });

    it('should return true for COMPLETED_FINAL_UNPAID', () => {
      expect(isVisibleInRecords('COMPLETED_FINAL_UNPAID')).toBe(true);
    });

    it('should return true for COMPLETED_FINAL_PAID', () => {
      expect(isVisibleInRecords('COMPLETED_FINAL_PAID')).toBe(true);
    });

    it('should return false for CANCELLED', () => {
      expect(isVisibleInRecords('CANCELLED')).toBe(false);
    });
  });

  describe('isVisibleInPayments', () => {
    it('should return false for UPCOMING', () => {
      expect(isVisibleInPayments('UPCOMING')).toBe(false);
    });

    it('should return false for COMPLETED_DRAFT', () => {
      expect(isVisibleInPayments('COMPLETED_DRAFT')).toBe(false);
    });

    it('should return true for COMPLETED_FINAL_UNPAID', () => {
      expect(isVisibleInPayments('COMPLETED_FINAL_UNPAID')).toBe(true);
    });

    it('should return true for COMPLETED_FINAL_PAID', () => {
      expect(isVisibleInPayments('COMPLETED_FINAL_PAID')).toBe(true);
    });

    it('should return false for CANCELLED', () => {
      expect(isVisibleInPayments('CANCELLED')).toBe(false);
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('should define valid transitions for UPCOMING', () => {
      expect(VALID_TRANSITIONS.UPCOMING).toContain('COMPLETED_DRAFT');
      expect(VALID_TRANSITIONS.UPCOMING).toContain('CANCELLED');
    });

    it('should define valid transitions for COMPLETED_DRAFT', () => {
      expect(VALID_TRANSITIONS.COMPLETED_DRAFT).toContain('COMPLETED_FINAL_UNPAID');
      expect(VALID_TRANSITIONS.COMPLETED_DRAFT).toContain('COMPLETED_FINAL_PAID');
    });

    it('should define valid transitions for COMPLETED_FINAL_UNPAID', () => {
      expect(VALID_TRANSITIONS.COMPLETED_FINAL_UNPAID).toContain('COMPLETED_FINAL_PAID');
    });

    it('should define COMPLETED_FINAL_PAID as terminal', () => {
      expect(VALID_TRANSITIONS.COMPLETED_FINAL_PAID).toHaveLength(0);
    });

    it('should define CANCELLED as terminal', () => {
      expect(VALID_TRANSITIONS.CANCELLED).toHaveLength(0);
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid UPCOMING to COMPLETED_DRAFT', () => {
      expect(isValidTransition('UPCOMING', 'COMPLETED_DRAFT')).toBe(true);
    });

    it('should return true for valid UPCOMING to CANCELLED', () => {
      expect(isValidTransition('UPCOMING', 'CANCELLED')).toBe(true);
    });

    it('should return true for valid COMPLETED_DRAFT to COMPLETED_FINAL_UNPAID', () => {
      expect(isValidTransition('COMPLETED_DRAFT', 'COMPLETED_FINAL_UNPAID')).toBe(true);
    });

    it('should return true for valid COMPLETED_FINAL_UNPAID to COMPLETED_FINAL_PAID', () => {
      expect(isValidTransition('COMPLETED_FINAL_UNPAID', 'COMPLETED_FINAL_PAID')).toBe(true);
    });

    it('should return false for invalid UPCOMING to COMPLETED_FINAL_PAID', () => {
      expect(isValidTransition('UPCOMING', 'COMPLETED_FINAL_PAID')).toBe(false);
    });

    it('should return false for invalid transition from terminal states', () => {
      expect(isValidTransition('COMPLETED_FINAL_PAID', 'UPCOMING')).toBe(false);
      expect(isValidTransition('CANCELLED', 'UPCOMING')).toBe(false);
    });

    it('should return false for backward transitions', () => {
      expect(isValidTransition('COMPLETED_DRAFT', 'UPCOMING')).toBe(false);
      expect(isValidTransition('COMPLETED_FINAL_PAID', 'COMPLETED_FINAL_UNPAID')).toBe(false);
    });
  });
});
