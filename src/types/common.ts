// Common types to replace 'any' usage throughout the application
import type { ChangeEvent, FormEvent, FocusEvent, MouseEvent } from 'react';

export interface ApiResponse<T = unknown> {
  data: T;
  error?: string;
  message?: string;
  status: number;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface FormData {
  [key: string]: string | number | boolean | File | undefined;
}

export interface User {
  id: string;
  email: string;
  role: 'patient' | 'dentist' | 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  language: 'en' | 'es' | 'fr' | 'de';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  ai_opt_out: boolean;
}

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'pending';
  reason?: string;
  notes?: string;
  urgency_level: 'low' | 'normal' | 'high' | 'urgent' | 'medium' | 'emergency';
  created_at: string;
  updated_at: string;
}

export interface Dentist {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  clinic_address?: string;
  clinic_street_address?: string;
  clinic_house_number?: string;
  clinic_city?: string;
  clinic_postal_code?: string;
  clinic_country?: string;
  languages?: string[];
  bio?: string;
  experience_years?: number;
  education?: string;
  certifications?: string[];
  availability?: AvailabilitySchedule;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySchedule {
  id: string;
  dentist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  last_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AiResponse {
  message: string;
  suggestions?: string[];
  actions?: AiAction[];
  metadata?: Record<string, unknown>;
}

export interface AiAction {
  type: 'book_appointment' | 'view_profile' | 'contact_support' | 'emergency_booking';
  label: string;
  data?: Record<string, unknown>;
}

export interface AnalyticsData {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  revenue: number;
  patient_satisfaction: number;
  average_wait_time: number;
  period: 'day' | 'week' | 'month' | 'year';
  date_range: {
    start: string;
    end: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  category?: 'info' | 'warning' | 'success' | 'error' | 'urgent';
  priority?: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  appointment_reminders: boolean;
  prescription_updates: boolean;
  treatment_plan_updates: boolean;
  emergency_alerts: boolean;
  system_notifications: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  template_key: string;
  title_template: string;
  message_template: string;
  type: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileUpload {
  id: string;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  url: string;
  uploaded_at: string;
}

export interface SearchResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormErrors {
  [key: string]: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  data?: unknown;
}

export interface ModalState {
  isOpen: boolean;
  data?: unknown;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

export interface LanguageConfig {
  code: string;
  name: string;
  flag?: string;
  direction: 'ltr' | 'rtl';
}

export interface PwaConfig {
  name: string;
  short_name: string;
  description: string;
  theme_color: string;
  background_color: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
}

// Event handlers
export type EventHandler<T = Event> = (event: T) => void;
export type ClickHandler = EventHandler<MouseEvent>;
export type ChangeHandler = EventHandler<ChangeEvent<HTMLInputElement>>;
export type SubmitHandler = EventHandler<FormEvent<HTMLFormElement>>;

// Component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  onClick?: ClickHandler;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: ChangeHandler;
  onBlur?: EventHandler<FocusEvent>;
  onFocus?: EventHandler<FocusEvent>;
  error?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends BaseComponentProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  error?: string;
}

// API types
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type WithRequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};