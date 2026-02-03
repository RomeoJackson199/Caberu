/**
 * Tests for appointmentUtils.ts utility functions
 */

import {
  getStatusConfig,
  getUrgencyConfig,
  getStatusClasses,
  getUrgencyClasses,
  canCompleteAppointment,
  canCancelAppointment,
  canRescheduleAppointment,
  isValidAppointmentStatus,
  isValidUrgencyLevel,
  sortAppointmentsByPriority,
  calculateEventPositions,
  getOverlappingEventStyle,
  APPOINTMENT_STATUS_CONFIG,
  URGENCY_CONFIG,
  type AppointmentStatus,
  type UrgencyLevel,
  type CalendarEvent,
  type PositionedEvent,
} from '../appointmentUtils';

// Mock timezone utilities
jest.mock('../timezone', () => ({
  utcToClinicTime: jest.fn((date: string) => new Date(date)),
  formatClinicTime: jest.fn((date: string, format: string) => {
    const d = new Date(date);
    return d.toLocaleString();
  }),
}));

describe('appointmentUtils.ts', () => {
  describe('APPOINTMENT_STATUS_CONFIG', () => {
    it('should have all required status configurations', () => {
      expect(APPOINTMENT_STATUS_CONFIG).toHaveProperty('pending');
      expect(APPOINTMENT_STATUS_CONFIG).toHaveProperty('confirmed');
      expect(APPOINTMENT_STATUS_CONFIG).toHaveProperty('completed');
      expect(APPOINTMENT_STATUS_CONFIG).toHaveProperty('cancelled');
    });

    it('should have correct properties for each status', () => {
      Object.values(APPOINTMENT_STATUS_CONFIG).forEach(config => {
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('bgColor');
        expect(config).toHaveProperty('textColor');
        expect(config).toHaveProperty('borderColor');
        expect(config).toHaveProperty('canComplete');
        expect(config).toHaveProperty('canCancel');
        expect(config).toHaveProperty('canReschedule');
      });
    });
  });

  describe('URGENCY_CONFIG', () => {
    it('should have all required urgency configurations', () => {
      expect(URGENCY_CONFIG).toHaveProperty('low');
      expect(URGENCY_CONFIG).toHaveProperty('medium');
      expect(URGENCY_CONFIG).toHaveProperty('high');
    });

    it('should have correct priority order', () => {
      expect(URGENCY_CONFIG.low.priority).toBe(1);
      expect(URGENCY_CONFIG.medium.priority).toBe(2);
      expect(URGENCY_CONFIG.high.priority).toBe(3);
    });
  });

  describe('getStatusConfig', () => {
    it('should return correct config for valid status', () => {
      const config = getStatusConfig('pending');
      expect(config.label).toBe('Pending');
      expect(config.canComplete).toBe(true);
    });

    it('should return correct config for confirmed status', () => {
      const config = getStatusConfig('confirmed');
      expect(config.label).toBe('Confirmed');
      expect(config.canComplete).toBe(true);
    });

    it('should return correct config for completed status', () => {
      const config = getStatusConfig('completed');
      expect(config.label).toBe('Completed');
      expect(config.canComplete).toBe(false);
      expect(config.canCancel).toBe(false);
    });

    it('should return correct config for cancelled status', () => {
      const config = getStatusConfig('cancelled');
      expect(config.label).toBe('Cancelled');
      expect(config.canReschedule).toBe(true);
    });

    it('should return pending config for invalid status', () => {
      const config = getStatusConfig('invalid');
      expect(config.label).toBe('Pending');
    });
  });

  describe('getUrgencyConfig', () => {
    it('should return correct config for low urgency', () => {
      const config = getUrgencyConfig('low');
      expect(config.label).toBe('Low Priority');
      expect(config.priority).toBe(1);
    });

    it('should return correct config for medium urgency', () => {
      const config = getUrgencyConfig('medium');
      expect(config.label).toBe('Medium Priority');
      expect(config.priority).toBe(2);
    });

    it('should return correct config for high urgency', () => {
      const config = getUrgencyConfig('high');
      expect(config.label).toBe('High Priority');
      expect(config.priority).toBe(3);
    });

    it('should return medium config for invalid urgency', () => {
      const config = getUrgencyConfig('invalid');
      expect(config.label).toBe('Medium Priority');
    });
  });

  describe('getStatusClasses', () => {
    it('should return combined CSS classes for status', () => {
      const classes = getStatusClasses('pending');
      expect(classes).toContain('bg-warning-100');
      expect(classes).toContain('text-warning-800');
      expect(classes).toContain('border-warning-300');
    });

    it('should handle all status types', () => {
      const statuses: AppointmentStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];
      statuses.forEach(status => {
        const classes = getStatusClasses(status);
        expect(classes).toBeTruthy();
        expect(classes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getUrgencyClasses', () => {
    it('should return combined CSS classes for urgency', () => {
      const classes = getUrgencyClasses('high');
      expect(classes).toContain('bg-danger-100');
      expect(classes).toContain('text-danger-800');
      expect(classes).toContain('border-danger-300');
    });

    it('should handle all urgency levels', () => {
      const levels: UrgencyLevel[] = ['low', 'medium', 'high'];
      levels.forEach(level => {
        const classes = getUrgencyClasses(level);
        expect(classes).toBeTruthy();
        expect(classes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('canCompleteAppointment', () => {
    it('should return true for pending appointments', () => {
      expect(canCompleteAppointment('pending')).toBe(true);
    });

    it('should return true for confirmed appointments', () => {
      expect(canCompleteAppointment('confirmed')).toBe(true);
    });

    it('should return false for completed appointments', () => {
      expect(canCompleteAppointment('completed')).toBe(false);
    });

    it('should return false for cancelled appointments', () => {
      expect(canCompleteAppointment('cancelled')).toBe(false);
    });
  });

  describe('canCancelAppointment', () => {
    it('should return true for pending appointments', () => {
      expect(canCancelAppointment('pending')).toBe(true);
    });

    it('should return true for confirmed appointments', () => {
      expect(canCancelAppointment('confirmed')).toBe(true);
    });

    it('should return false for completed appointments', () => {
      expect(canCancelAppointment('completed')).toBe(false);
    });

    it('should return false for cancelled appointments', () => {
      expect(canCancelAppointment('cancelled')).toBe(false);
    });
  });

  describe('canRescheduleAppointment', () => {
    it('should return true for pending appointments', () => {
      expect(canRescheduleAppointment('pending')).toBe(true);
    });

    it('should return true for confirmed appointments', () => {
      expect(canRescheduleAppointment('confirmed')).toBe(true);
    });

    it('should return false for completed appointments', () => {
      expect(canRescheduleAppointment('completed')).toBe(false);
    });

    it('should return true for cancelled appointments', () => {
      expect(canRescheduleAppointment('cancelled')).toBe(true);
    });
  });

  describe('isValidAppointmentStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isValidAppointmentStatus('pending')).toBe(true);
      expect(isValidAppointmentStatus('confirmed')).toBe(true);
      expect(isValidAppointmentStatus('completed')).toBe(true);
      expect(isValidAppointmentStatus('cancelled')).toBe(true);
    });

    it('should return false for invalid statuses', () => {
      expect(isValidAppointmentStatus('invalid')).toBe(false);
      expect(isValidAppointmentStatus('')).toBe(false);
      expect(isValidAppointmentStatus('scheduled')).toBe(false);
    });
  });

  describe('isValidUrgencyLevel', () => {
    it('should return true for valid urgency levels', () => {
      expect(isValidUrgencyLevel('low')).toBe(true);
      expect(isValidUrgencyLevel('medium')).toBe(true);
      expect(isValidUrgencyLevel('high')).toBe(true);
    });

    it('should return false for invalid urgency levels', () => {
      expect(isValidUrgencyLevel('invalid')).toBe(false);
      expect(isValidUrgencyLevel('')).toBe(false);
      expect(isValidUrgencyLevel('emergency')).toBe(false);
    });
  });

  describe('sortAppointmentsByPriority', () => {
    it('should sort appointments by urgency (high to low)', () => {
      const appointments = [
        { id: '1', urgency: 'low', appointment_date: '2024-01-01T10:00:00' },
        { id: '2', urgency: 'high', appointment_date: '2024-01-01T10:00:00' },
        { id: '3', urgency: 'medium', appointment_date: '2024-01-01T10:00:00' },
      ];

      const sorted = sortAppointmentsByPriority(appointments);

      expect(sorted[0].urgency).toBe('high');
      expect(sorted[1].urgency).toBe('medium');
      expect(sorted[2].urgency).toBe('low');
    });

    it('should sort by date when urgency is equal', () => {
      const appointments = [
        { id: '1', urgency: 'medium', appointment_date: '2024-01-02T10:00:00' },
        { id: '2', urgency: 'medium', appointment_date: '2024-01-01T10:00:00' },
      ];

      const sorted = sortAppointmentsByPriority(appointments);

      expect(sorted[0].id).toBe('2'); // Earlier date first
      expect(sorted[1].id).toBe('1');
    });

    it('should handle empty array', () => {
      const sorted = sortAppointmentsByPriority([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single appointment', () => {
      const appointments = [{ id: '1', urgency: 'high', appointment_date: '2024-01-01T10:00:00' }];
      const sorted = sortAppointmentsByPriority(appointments);
      expect(sorted).toHaveLength(1);
    });
  });

  describe('calculateEventPositions', () => {
    it('should return empty array for no events', () => {
      const result = calculateEventPositions([]);
      expect(result).toEqual([]);
    });

    it('should assign single column for non-overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          id: '1',
          appointment_date: '2024-01-01T09:00:00',
          duration_minutes: 30,
          status: 'confirmed',
        },
        {
          id: '2',
          appointment_date: '2024-01-01T10:00:00',
          duration_minutes: 30,
          status: 'confirmed',
        },
      ];

      const positioned = calculateEventPositions(events);

      expect(positioned).toHaveLength(2);
      positioned.forEach(event => {
        expect(event.column).toBe(0);
        expect(event.totalColumns).toBe(1);
      });
    });

    it('should assign multiple columns for overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          id: '1',
          appointment_date: '2024-01-01T09:00:00',
          duration_minutes: 60,
          status: 'confirmed',
        },
        {
          id: '2',
          appointment_date: '2024-01-01T09:30:00',
          duration_minutes: 30,
          status: 'confirmed',
        },
      ];

      const positioned = calculateEventPositions(events);

      expect(positioned).toHaveLength(2);
      expect(positioned[0].column).toBe(0);
      expect(positioned[1].column).toBe(1);
      expect(positioned[0].totalColumns).toBe(2);
      expect(positioned[1].totalColumns).toBe(2);
    });

    it('should handle three overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          id: '1',
          appointment_date: '2024-01-01T09:00:00',
          duration_minutes: 90,
          status: 'confirmed',
        },
        {
          id: '2',
          appointment_date: '2024-01-01T09:30:00',
          duration_minutes: 60,
          status: 'confirmed',
        },
        {
          id: '3',
          appointment_date: '2024-01-01T10:00:00',
          duration_minutes: 30,
          status: 'confirmed',
        },
      ];

      const positioned = calculateEventPositions(events);

      expect(positioned).toHaveLength(3);
      // All three overlap at some point
      expect(Math.max(...positioned.map(e => e.totalColumns))).toBeGreaterThanOrEqual(2);
    });

    it('should use default duration when not specified', () => {
      const events: CalendarEvent[] = [
        {
          id: '1',
          appointment_date: '2024-01-01T09:00:00',
          status: 'confirmed',
        },
      ];

      const positioned = calculateEventPositions(events);
      expect(positioned).toHaveLength(1);
      expect(positioned[0].totalColumns).toBe(1);
    });
  });

  describe('getOverlappingEventStyle', () => {
    it('should calculate correct style for single column event', () => {
      const event: PositionedEvent = {
        id: '1',
        appointment_date: '2024-01-01T09:00:00',
        duration_minutes: 30,
        status: 'confirmed',
        column: 0,
        totalColumns: 1,
      };

      const style = getOverlappingEventStyle(event, 7, 60);

      expect(style.position).toBe('absolute');
      expect(style.top).toBe('120px'); // (9-7) * 60 = 120
      expect(style.height).toBe('30px'); // 0.5 * 60 = 30
      expect(style.left).toBe('2%'); // horizontalPadding
      expect(style.width).toBe('95%'); // 96% - 1%
    });

    it('should calculate correct style for second column event', () => {
      const event: PositionedEvent = {
        id: '1',
        appointment_date: '2024-01-01T10:00:00',
        duration_minutes: 60,
        status: 'confirmed',
        column: 1,
        totalColumns: 2,
      };

      const style = getOverlappingEventStyle(event, 8, 60);

      expect(style.position).toBe('absolute');
      expect(style.left).toBe('50%'); // 2 + (1 * 48) = 50
      expect(style.zIndex).toBe(11); // 10 + 1
    });

    it('should respect minimum height', () => {
      const event: PositionedEvent = {
        id: '1',
        appointment_date: '2024-01-01T09:00:00',
        duration_minutes: 5, // Very short
        status: 'confirmed',
        column: 0,
        totalColumns: 1,
      };

      const style = getOverlappingEventStyle(event, 7, 60, 30); // minHeight = 30

      expect(style.height).toBe('30px'); // Should use minHeight
    });

    it('should handle custom horizontal padding', () => {
      const event: PositionedEvent = {
        id: '1',
        appointment_date: '2024-01-01T09:00:00',
        duration_minutes: 30,
        status: 'confirmed',
        column: 0,
        totalColumns: 1,
      };

      const style = getOverlappingEventStyle(event, 7, 60, 20, 5); // horizontalPadding = 5

      expect(style.left).toBe('5%');
    });
  });
});
