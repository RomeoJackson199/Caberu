// Admin Dashboard Types

export interface AdminOverviewStats {
  total_businesses: number;
  total_users: number;
  appointments_this_month: number;
  active_errors: number;
  mrr_cents: number;
}

export interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  owner_profile_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  member_count: number;
  appointment_count: number;
  phone_call_count: number;
  created_at: string;
}

export interface AdminBusinessDetail {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  currency: string | null;
  specialty_type: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean | null;
  owner_profile_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AdminUser {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  business_id: string | null;
  business_name: string | null;
  roles: string[];
  created_at: string;
  updated_at: string | null;
}

export interface AdminAppointment {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  dentist_id: string | null;
  dentist_name: string | null;
  business_id: string | null;
  business_name: string | null;
  appointment_date: string | null;
  status: string | null;
  booking_source: string | null;
  duration_minutes: number | null;
  reason: string | null;
  notes: string | null;
  ai_summary: string | null;
  created_at: string;
}

export interface AdminPhoneCall {
  id: string;
  business_id: string | null;
  business_name: string | null;
  call_id: string | null;
  call_type: string | null;
  caller_phone: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  duration_seconds: number | null;
  cost_cents: number | null;
  is_billable: boolean | null;
  transcript: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminChatMessage {
  id: string;
  session_id: string | null;
  business_id: string | null;
  business_name: string | null;
  is_bot: boolean | null;
  message: string | null;
  message_type: string | null;
  created_at: string;
}

export interface AdminMessage {
  id: string;
  business_id: string | null;
  business_name: string | null;
  sender_name: string | null;
  recipient_name: string | null;
  message_text: string | null;
  is_read: boolean | null;
  created_at: string;
}

export interface AdminSystemError {
  id: string;
  error_type: string;
  error_message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stack_trace: string | null;
  url: string | null;
  user_id: string | null;
  business_id: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface AdminGdprRequest {
  id: string;
  user_id: string | null;
  request_type: string | null;
  status: string | null;
  requested_at: string | null;
  processed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface AdminGdprExportBundle {
  id: string;
  request_id: string | null;
  user_id: string | null;
  format: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  downloaded_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AdminAuditLogEntry {
  id: string;
  user_id: string | null;
  action: string | null;
  table_name: string | null;
  record_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminFeatureFlag {
  id: string;
  flag_key: string;
  name: string | null;
  description: string | null;
  category: string | null;
  is_enabled: boolean;
  rollout_percentage: number | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AdminFeatureFlagOverride {
  id: string;
  flag_id: string | null;
  business_id: string | null;
  business_name: string | null;
  is_enabled: boolean;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AdminFeatureFlagChangelogEntry {
  id: string;
  flag_id: string | null;
  action: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_by: string | null;
  created_at: string;
}

export interface AdminPromoCode {
  id: string;
  code: string;
  discount_type: string | null;
  discount_value: number | null;
  max_uses: number | null;
  uses_count: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface AdminSubscriptionPlan {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  customer_limit: number | null;
  email_limit_monthly: number | null;
  phone_minutes_daily: number | null;
  features: Record<string, unknown> | null;
  stripe_product_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminEncryptionKeyStatus {
  id: string;
  business_id: string | null;
  key_version: number | null;
  is_active: boolean | null;
  created_at: string;
  rotated_at: string | null;
  expires_at: string | null;
  created_by: string | null;
}

export interface AdminSuperAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminElevenLabsAgent {
  id: string;
  business_id: string | null;
  business_name: string | null;
  agent_id: string | null;
  agent_name: string | null;
  voice_id: string | null;
  settings: Record<string, unknown> | null;
  is_active: boolean | null;
  created_at: string;
}

export interface AdminEmailLog {
  id: string;
  business_id: string | null;
  business_name: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  subject: string | null;
  email_type: string | null;
  status: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface AdminPatientConsent {
  id: string;
  patient_id: string | null;
  practice_id: string | null;
  consent_date: string | null;
  health_data_consent: boolean | null;
  data_processing_consent: boolean | null;
  understand_rights: boolean | null;
  consent_version: string | null;
  withdrawn_at: string | null;
  created_at: string;
}

export interface AdminPracticeConsent {
  id: string;
  practice_id: string | null;
  consent_date: string | null;
  general_consent: boolean | null;
  data_processing_consent: boolean | null;
  terms_accepted: boolean | null;
  consent_version: string | null;
  created_at: string;
}

// Pricing tiers for MRR calculation
export const PRICING_TIERS: Record<string, number> = {
  starter: 24900,      // €249/month in cents
  professional: 49900,  // €499/month in cents
  enterprise: 99900,   // €999/month in cents
};

export const COST_STRUCTURE = {
  elevenlabs_voice_per_minute: 10,   // €0.10 in cents
  elevenlabs_text_per_message: 4,    // €0.04 in cents
  twilio_belgium_inbound_per_minute: 0.8, // €0.008 in cents
  phone_number_monthly: 2300,        // €23/month in cents
  whatsapp_service_message: 0,       // Free
};
