/**
 * Chat Widget Constants
 *
 * Widget codes used by the AI to trigger specific interactive widgets
 */

export const WIDGET_CODES: Record<string, string> = {
  '12345': 'booking-ready',
};

/**
 * Known dentist names for recommendation extraction
 */
export const DENTIST_NAMES = [
  'Virginie Pauwels',
  'Emeline Hubin',
  'Firdaws Benhsain',
  'Justine Peters',
  'Anne-Sophie Haas'
];

/**
 * Language display names
 */
export const LANGUAGE_NAMES = {
  en: 'English',
  fr: 'French',
  nl: 'Dutch'
} as const;
