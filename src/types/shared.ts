/**
 * Shared Type Definitions
 *
 * Common types used across the application for better type safety
 * and consistency.
 */

// =============================================================================
// User & Profile Types
// =============================================================================

export type UserRole = 'admin' | 'dentist' | 'patient' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Appointment Types
// =============================================================================

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'pending';

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  business_id: string;
  appointment_date: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Payment Types
// =============================================================================

export type PaymentStatus = 'paid' | 'unpaid' | 'partially-paid' | 'refunded';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Form & Validation Types
// =============================================================================

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
}

export interface FieldValidation {
  value: any;
  error: string | null;
  isValid: boolean;
  isTouched: boolean;
  isValidating: boolean;
}

export interface FormField<T = any> {
  name: keyof T;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRule<T[keyof T]>[];
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// =============================================================================
// UI Component Types
// =============================================================================

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'gradient'
  | 'aqua'
  | 'lilac'
  | 'glass';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'desktop' | 'mobile';

export interface IconProps {
  className?: string;
  size?: number;
}

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning';

// =============================================================================
// Pagination Types
// =============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// =============================================================================
// Date & Time Types
// =============================================================================

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// =============================================================================
// Business Types
// =============================================================================

export interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  profile_id: string;
  role: UserRole;
  joined_at: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Make certain properties of T optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make certain properties of T required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Strict Omit that only allows keys that exist in T
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;

/**
 * Strict Pick that only allows keys that exist in T
 */
export type StrictPick<T, K extends keyof T> = Pick<T, K>;

/**
 * Extract keys of T where the value type matches V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Nullable version of T (T | null)
 */
export type Nullable<T> = T | null;

/**
 * Maybe version of T (T | null | undefined)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Deep Partial - makes all properties and nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Function that returns a Promise
 */
export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;

/**
 * Extract the awaited type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

// =============================================================================
// Error Types
// =============================================================================

export interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  details?: Record<string, any>;
}

export class ApplicationError extends Error {
  code?: string;
  details?: Record<string, any>;

  constructor(message: string, code?: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.details = details;
  }
}

// =============================================================================
// Event Types
// =============================================================================

export interface AppEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
}

export type EventHandler<T = any> = (event: AppEvent<T>) => void | Promise<void>;

// =============================================================================
// Storage Types
// =============================================================================

export interface StorageItem<T = any> {
  key: string;
  value: T;
  expiresAt?: Date;
}

// =============================================================================
// Type Guards
// =============================================================================

export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiSuccess<T> => {
  return response.success === true;
};

export const isApiError = (response: ApiResponse): response is ApiError => {
  return response.success === false;
};

export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

export const isObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isArray = <T = any>(value: unknown): value is T[] => {
  return Array.isArray(value);
};

export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};
