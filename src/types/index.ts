/**
 * Central barrel file for all type exports
 * Import types from here instead of individual files
 * 
 * NOTE: Due to overlapping definitions, we selectively export from each module
 */

// Patient types are the canonical source for healthcare entities
export * from './patient';

// Appointment types with extended definitions
export type {
  AppointmentProfile,
  AppointmentWithProfile,
  AppointmentListItem,
  BaseAppointmentListProps,
  DentistAppointmentListProps,
  OptimizedAppointmentListProps,
  AppointmentTab,
  AppointmentFilters,
} from './appointment';

// Chat types
export type { ChatMessage } from './chat';

// Common types (selective exports to avoid conflicts)
export type {
  ErrorResponse,
  FormData,
  UserPreferences,
  AiResponse,
  AiAction,
  AnalyticsData,
  Notification,
  NotificationPreferences,
  NotificationTemplate,
  FileUpload,
  SearchResult,
  FilterParams,
  ValidationError,
  FormErrors,
  LoadingState,
  ModalState,
  ToastMessage,
  ThemeConfig,
  LanguageConfig,
  PwaConfig,
  ClickHandler,
  ChangeHandler,
  SubmitHandler,
  BaseComponentProps,
  ButtonProps,
  InputProps,
  SelectOption,
  SelectProps,
  ApiConfig,
  ApiRequestConfig,
  Optional,
  WithRequiredKeys,
  AvailabilitySchedule,
  Conversation,
} from './common';

// Dental types (selective exports to avoid conflicts with patient.ts)
export type {
  TreatmentProcedure,
  MedicalRecord,
  AppointmentFollowUp,
  EnhancedPatient,
  AppointmentWithSummary,
  DentistProfile,
  DentistRecommendation,
  NewPrescriptionForm,
  NewTreatmentPlanForm,
  NewMedicalRecordForm,
  NewPatientNoteForm,
  NewFollowUpForm,
} from './dental';

// Shared types (selective exports to avoid conflicts)
export type {
  UserRole,
  PaymentStatus,
  Payment,
  ValidationRule,
  FieldValidation,
  FormField,
  ApiSuccess,
  ButtonVariant,
  ButtonSize,
  IconProps,
  ToastVariant,
  PaginatedResponse,
  TimeSlot,
  DateRange,
  Business,
  BusinessMember,
  PartialBy,
  RequiredBy,
  StrictOmit,
  StrictPick,
  KeysOfType,
  Nullable,
  Maybe,
  AsyncFunction,
  ErrorInfo,
  AppEvent,
  StorageItem,
} from './shared';

export {
  isApiSuccess,
  isApiError,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isDefined,
  ApplicationError,
} from './shared';

// Super admin types
export * from './super-admin';

// Validation types
export * from './validation';
