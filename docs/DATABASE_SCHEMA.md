# Caberu Database Schema Map

> **Project:** Caberu Healthcare Solutions
> **Database:** Supabase (PostgreSQL 17.4)
> **Region:** eu-north-1
> **Generated:** February 13, 2026

---

## Table of Contents

1. [Custom Enums](#custom-enums)
2. [Core Tables](#core-tables)
   - [businesses](#businesses)
   - [profiles](#profiles)
   - [dentists](#dentists)
   - [user_roles](#user_roles)
   - [business_members](#business_members)
   - [user_profile_map](#user_profile_map)
   - [session_business](#session_business)
3. [Appointments & Scheduling](#appointments--scheduling)
   - [appointments](#appointments)
   - [appointment_types](#appointment_types)
   - [appointment_slots](#appointment_slots)
   - [appointment_reminders](#appointment_reminders)
   - [dentist_availability](#dentist_availability)
   - [dentist_date_overrides](#dentist_date_overrides)
   - [dentist_vacation_days](#dentist_vacation_days)
   - [dentist_capacity_settings](#dentist_capacity_settings)
   - [slot_recommendations](#slot_recommendations)
   - [reschedule_suggestions](#reschedule_suggestions)
4. [Services & Treatment](#services--treatment)
   - [business_services](#business_services)
   - [dentist_services](#dentist_services)
   - [treatment_plans](#treatment_plans)
   - [treatment_plan_items](#treatment_plan_items)
   - [treatment_templates](#treatment_templates)
5. [Patient Data](#patient-data)
   - [patient_preferences](#patient_preferences)
   - [patient_allergies](#patient_allergies)
   - [patient_documents](#patient_documents)
   - [patient_tags](#patient_tags)
   - [patient_tag_assignments](#patient_tag_assignments)
   - [medical_records](#medical_records)
   - [imaging_sets](#imaging_sets)
   - [imaging_files](#imaging_files)
6. [Payments & Billing](#payments--billing)
   - [payment_requests](#payment_requests)
   - [payment_items](#payment_items)
   - [payment_reminders](#payment_reminders)
   - [subscription_plans](#subscription_plans)
   - [promo_codes](#promo_codes)
   - [platform_revenue](#platform_revenue)
7. [Communication](#communication)
   - [messages](#messages)
   - [chat_messages](#chat_messages)
   - [communication_logs](#communication_logs)
   - [email_logs](#email_logs)
   - [business_email_templates](#business_email_templates)
   - [notifications](#notifications)
   - [notification_preferences](#notification_preferences)
   - [push_subscriptions](#push_subscriptions)
8. [AI & Voice](#ai--voice)
   - [elevenlabs_agents](#elevenlabs_agents)
   - [ai_knowledge_documents](#ai_knowledge_documents)
   - [phone_usage](#phone_usage)
9. [Security & Compliance](#security--compliance)
   - [business_encryption_keys](#business_encryption_keys)
   - [verification_codes](#verification_codes)
   - [audit_logs](#audit_logs)
   - [super_admin_audit_log](#super_admin_audit_log)
   - [api_rate_limits](#api_rate_limits)
   - [notes](#notes)
10. [GDPR & Consent](#gdpr--consent)
    - [gdpr_requests](#gdpr_requests)
    - [gdpr_export_bundles](#gdpr_export_bundles)
    - [patient_consents](#patient_consents)
    - [practice_consents](#practice_consents)
11. [Platform & Admin](#platform--admin)
    - [feature_flags](#feature_flags)
    - [feature_flag_overrides](#feature_flag_overrides)
    - [feature_flag_changelog](#feature_flag_changelog)
    - [platform_status](#platform_status)
    - [system_errors](#system_errors)
    - [system_errors_archive](#system_errors_archive)
    - [system_health_checks](#system_health_checks)
    - [scheduled_downtimes](#scheduled_downtimes)
    - [dentist_invitations](#dentist_invitations)
    - [tour_completions](#tour_completions)
12. [Database Functions](#database-functions)
13. [Entity Relationship Diagram](#entity-relationship-diagram)

---

## Custom Enums

| Enum Name | Values |
|-----------|--------|
| `app_role` | `admin`, `provider`, `customer`, `staff`, `patient`, `waiter`, `cook`, `host`, `manager`, `super_admin` |
| `appointment_type_category` | `checkup`, `cleaning`, `filling`, `extraction`, `root_canal`, `crown`, `whitening`, `orthodontics`, `emergency`, `consultation`, `other` |
| `imaging_type` | `xray`, `photo`, `scan`, `unknown` |

---

## Core Tables

### businesses
> Central multi-tenant table. Each business is an independent practice on the platform.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `owner_profile_id` | uuid | NO | | FK -> `profiles.id` |
| `name` | text | NO | | |
| `slug` | text | NO | | **Unique** |
| `tagline` | text | YES | | |
| `logo_url` | text | YES | | |
| `business_hours` | jsonb | NO | `'{}'` | |
| `currency` | text | NO | `'USD'` | |
| `specialty_type` | text | NO | `'dentist'` | |
| `template_type` | text | NO | `'healthcare'` | Check: `dentist`, `hairdresser`, `personal_trainer`, `beauty_salon`, `medical`, `generic`, `restaurant`, `custom`, `healthcare` |
| `ai_instructions` | text | YES | | |
| `ai_tone` | text | NO | `'professional'` | |
| `ai_response_length` | text | NO | `'medium'` | |
| `ai_system_behavior` | text | YES | | |
| `ai_greeting` | text | YES | | |
| `ai_personality_traits` | jsonb | YES | `'[]'` | |
| `welcome_message` | text | YES | | |
| `bio` | text | YES | | Business description |
| `phone` | text | YES | | |
| `address` | text | YES | | |
| `show_logo_in_chat` | boolean | NO | `true` | |
| `show_branding_in_emails` | boolean | NO | `true` | |
| `primary_color` | text | YES | `'#0F3D91'` | Hex brand color |
| `secondary_color` | text | YES | `'#66D2D6'` | Hex brand color |
| `custom_features` | jsonb | YES | | |
| `custom_terminology` | jsonb | YES | | |
| `custom_config` | jsonb | YES | | Full custom template config |
| `stripe_account_id` | text | YES | | Stripe Connect ID |
| `stripe_account_status` | text | YES | | `pending`, `active`, `restricted` |
| `stripe_onboarding_completed` | boolean | YES | `false` | |
| `stripe_charges_enabled` | boolean | YES | `false` | |
| `stripe_payouts_enabled` | boolean | YES | `false` | |
| `platform_fee_percentage` | numeric | YES | `2.50` | Caberu's cut (%) |
| `subscription_status` | text | YES | `'inactive'` | `active`, `inactive`, `cancelled`, `trial` |
| `subscription_plan` | text | YES | `'free'` | `free`, `monthly`, `yearly`, `promo` |
| `subscription_ends_at` | timestamptz | YES | | |
| `subscription_started_at` | timestamptz | YES | | |
| `promo_code_used` | text | YES | | |
| `pending_plan_change` | text | YES | | Plan to switch to at period end |
| `pending_plan_change_date` | timestamptz | YES | | |
| `emails_sent_count` | integer | YES | `0` | Marketing emails this billing period |
| `customer_count` | integer | YES | `0` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### profiles
> User profiles for all users (patients, providers, admins). Links to `auth.users`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `user_id` | uuid | YES | | **Unique**, FK -> `auth.users.id` |
| `first_name` | text | YES | | |
| `last_name` | text | YES | | |
| `email` | text | YES | | |
| `phone` | text | YES | | |
| `address` | text | YES | | |
| `date_of_birth` | date | YES | | |
| `medical_history` | text | YES | | |
| `emergency_contact` | text | YES | | |
| `ai_opt_out` | boolean | NO | `false` | |
| `profile_completion_status` | text | NO | `'incomplete'` | |
| `role` | text | YES | | |
| `bio` | text | YES | | |
| `business_id` | uuid | YES | | FK -> `businesses.id` |
| `patient_status` | text | YES | `'active'` | |
| `last_contact_at` | timestamptz | YES | | |
| `next_recall_date` | date | YES | | |
| `is_vip` | boolean | YES | `false` | |
| `onboarding_completed` | boolean | YES | `false` | |
| `profile_picture_url` | text | YES | | |
| `avatar_url` | text | YES | | |
| `import_session_id` | uuid | YES | | |
| `google_calendar_refresh_token` | text | YES | | |
| `google_calendar_connected` | boolean | YES | `false` | |
| `phone_verified` | boolean | YES | `false` | |
| `phone_verified_at` | timestamptz | YES | | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~20

---

### dentists
> Practitioner/provider records. Linked to profiles via `profile_id`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `profile_id` | uuid | NO | | **Unique**, FK -> `profiles.id` |
| `first_name` | text | YES | | |
| `last_name` | text | YES | | |
| `email` | text | YES | | |
| `specialization` | text | YES | | |
| `license_number` | text | YES | | |
| `clinic_address` | text | YES | | |
| `profile_picture_url` | text | YES | | |
| `is_active` | boolean | NO | `true` | |
| `require_appointment_approval` | boolean | YES | `false` | |
| `average_rating` | numeric | NO | `0` | |
| `total_ratings` | integer | NO | `0` | |
| `expertise_score` | numeric | NO | `0` | |
| `communication_score` | numeric | NO | `0` | |
| `wait_time_score` | numeric | NO | `0` | |
| `google_calendar_refresh_token` | text | YES | | |
| `google_calendar_connected` | boolean | YES | `false` | |
| `google_calendar_last_sync` | timestamptz | YES | | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~4

---

### user_roles
> Maps `auth.users` to application roles.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `user_id` | uuid | NO | | FK -> `auth.users.id` |
| `role` | app_role | NO | | Enum: see [Custom Enums](#custom-enums) |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~21

---

### business_members
> Links profiles to businesses with a specific role.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `profile_id` | uuid | NO | | FK -> `profiles.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `role` | text | NO | | Check: `owner`, `admin`, `dentist`, `assistant`, `staff` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~4

---

### user_profile_map
> Quick lookup from `auth.users.id` to `profiles.id`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `user_id` | uuid | NO | | **PK** |
| `profile_id` | uuid | NO | | **Unique** |

**RLS:** Enabled | **Rows:** ~18

---

### session_business
> Tracks which business a user is currently "switched into".

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `user_id` | uuid | NO | | **PK**, FK -> `auth.users.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~8

---

## Appointments & Scheduling

### appointments
> Core appointment records with encrypted sensitive fields.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `appointment_date` | timestamptz | NO | | |
| `status` | text | NO | `'pending'` | |
| `urgency` | text | NO | `'medium'` | |
| `duration_minutes` | integer | YES | `60` | |
| `booking_source` | text | YES | `'manual'` | Check: `ai`, `manual` |
| `service_id` | uuid | YES | | FK -> `business_services.id` |
| `appointment_type_id` | uuid | YES | | FK -> `appointment_types.id` |
| `treatment_plan_id` | uuid | YES | | FK -> `treatment_plans.id` |
| `payment_status` | text | YES | `'pending'` | |
| `payment_intent_id` | text | YES | | |
| `amount_paid_cents` | integer | YES | `0` | |
| `completed_at` | timestamptz | YES | | |
| `reason` | text | YES | `''` | Encrypted (AES-256) |
| `notes` | text | YES | | Encrypted (AES-256) |
| `consultation_notes` | text | YES | | Encrypted (AES-256) |
| `ai_summary` | text | YES | | Encrypted (AES-256) |
| `patient_name` | text | YES | | Encrypted (AES-256) |
| `conversation_transcript` | text | YES | | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~37

---

### appointment_types
> Defines different appointment categories with durations and buffer times.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `name` | text | NO | | |
| `category` | appointment_type_category | NO | | Enum |
| `description` | text | YES | | |
| `default_duration_minutes` | integer | NO | `30` | |
| `buffer_time_after_minutes` | integer | NO | `0` | |
| `color` | text | YES | | |
| `requires_followup` | boolean | YES | `false` | |
| `is_active` | boolean | YES | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### appointment_slots
> Pre-generated time slots for each dentist per day.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `slot_date` | date | NO | | |
| `slot_time` | time | NO | | |
| `is_available` | boolean | YES | `true` | |
| `appointment_id` | uuid | YES | | FK -> `appointments.id` |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~278

---

### appointment_reminders
> Scheduled reminders (24h, 2h, 1h) for upcoming appointments.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `appointment_id` | uuid | NO | | FK -> `appointments.id` |
| `reminder_type` | text | NO | `'24h'` | Check: `24h`, `2h`, `1h` |
| `notification_method` | text | NO | `'email'` | Check: `email`, `sms`, `both` |
| `scheduled_for` | timestamptz | NO | | |
| `status` | text | NO | `'pending'` | Check: `pending`, `sent`, `failed`, `cancelled` |
| `sent_at` | timestamptz | YES | | |
| `error_message` | text | YES | | Encrypted (AES-256) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~19

---

### dentist_availability
> Recurring weekly availability schedule per dentist.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `day_of_week` | integer | NO | | Check: 0-6 (Sun-Sat) |
| `start_time` | time | NO | `'09:00'` | |
| `end_time` | time | NO | `'17:00'` | |
| `break_start_time` | time | YES | | |
| `break_end_time` | time | YES | | |
| `is_available` | boolean | NO | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~28

---

### dentist_date_overrides
> One-off date-specific overrides that take precedence over weekly availability.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `override_date` | date | NO | | |
| `start_time` | time | YES | | |
| `end_time` | time | YES | | |
| `break_start_time` | time | YES | | |
| `break_end_time` | time | YES | | |
| `is_available` | boolean | YES | `true` | |
| `reason` | text | YES | | |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### dentist_vacation_days
> Extended time-off periods for dentists.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `start_date` | date | NO | | |
| `end_date` | date | NO | | |
| `vacation_type` | text | NO | `'vacation'` | |
| `reason` | text | YES | | |
| `is_approved` | boolean | NO | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### dentist_capacity_settings
> Per-dentist capacity limits and buffer configuration.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `max_appointments_per_day` | integer | YES | `16` | |
| `max_appointments_per_hour` | integer | YES | `2` | |
| `emergency_slots_per_day` | integer | YES | `2` | |
| `emergency_slot_release_hours` | integer | YES | `24` | |
| `default_buffer_minutes` | integer | YES | `5` | |
| `buffer_before_lunch_minutes` | integer | YES | `10` | |
| `buffer_after_lunch_minutes` | integer | YES | `10` | |
| `expertise_categories` | appointment_type_category[] | YES | | Array of enum |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### slot_recommendations
> Logs AI-recommended slots shown to patients for learning/optimization.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `recommended_slots` | jsonb | NO | | |
| `selected_slot` | timestamptz | YES | | |
| `was_recommended` | boolean | YES | `false` | |
| `appointment_id` | uuid | YES | | FK -> `appointments.id` |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### reschedule_suggestions
> Tracks auto-rescheduling suggestions and outcomes.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `original_appointment_id` | uuid | NO | | FK -> `appointments.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `reason` | text | YES | | |
| `suggested_slots` | jsonb | NO | | |
| `accepted_slot` | timestamptz | YES | | |
| `accepted_at` | timestamptz | YES | | |
| `was_auto_rescheduled` | boolean | YES | `false` | |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

## Services & Treatment

### business_services
> Catalog of services offered by a business.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` (implicit) |
| `name` | text | NO | | |
| `description` | text | YES | | |
| `price_cents` | integer | NO | `0` | |
| `currency` | text | NO | `'USD'` | |
| `duration_minutes` | integer | YES | `60` | |
| `category` | text | YES | | |
| `image_url` | text | YES | | |
| `requires_upfront_payment` | boolean | NO | `false` | |
| `stripe_price_id` | text | YES | | |
| `is_active` | boolean | NO | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~159

---

### dentist_services
> Junction table: which dentists offer which services, with optional price/duration overrides.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `service_id` | uuid | NO | | FK -> `business_services.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `custom_duration_minutes` | integer | YES | | Override |
| `custom_price_cents` | integer | YES | | Override |
| `is_active` | boolean | NO | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~120

---

### treatment_plans
> Multi-step treatment plans for patients.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | |
| `title` | text | NO | | |
| `description` | text | YES | | |
| `diagnosis` | text | YES | | |
| `status` | text | NO | `'active'` | Check: `draft`, `proposed`, `superseded`, `completed` |
| `priority` | text | NO | `'normal'` | |
| `version` | integer | NO | `1` | |
| `procedures` | text[] | YES | `'{}'` | |
| `treatment_goals` | text[] | YES | `'{}'` | |
| `estimated_cost` | numeric | YES | | |
| `total_estimated_cents` | integer | YES | | |
| `currency` | text | NO | `'USD'` | |
| `estimated_duration_weeks` | integer | YES | | |
| `estimated_duration` | text | YES | | |
| `start_date` | timestamptz | YES | `now()` | |
| `end_date` | timestamptz | YES | | |
| `target_completion_date` | timestamptz | YES | | |
| `notes` | text | YES | | |
| `created_from_appointment_id` | uuid | YES | | FK -> `appointments.id` |
| `created_by_dentist_id` | uuid | YES | | FK -> `dentists.id` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~4

---

### treatment_plan_items
> Line items within a treatment plan.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `treatment_plan_id` | uuid | NO | | FK -> `treatment_plans.id` |
| `name` | text | NO | | |
| `procedure_code` | text | YES | | |
| `tooth` | text | YES | | |
| `qty` | integer | NO | `1` | |
| `unit_price_cents` | integer | NO | `0` | |
| `line_total_cents` | integer | YES | Generated: `qty * unit_price_cents` | |
| `description` | text | YES | | |
| `sort_order` | integer | NO | `0` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### treatment_templates
> Reusable treatment plan templates.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `name` | text | NO | | |
| `description` | text | YES | | |
| `default_items` | jsonb | NO | `'[]'` | |
| `created_by_dentist_id` | uuid | YES | | FK -> `dentists.id` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

## Patient Data

### patient_preferences
> Tracks booking patterns and reliability scores for intelligent scheduling.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `preferred_time_of_day` | text[] | YES | | |
| `preferred_days_of_week` | integer[] | YES | | |
| `preferred_dentist_id` | uuid | YES | | FK -> `dentists.id` |
| `preferred_reminder_hours` | integer | YES | `24` | |
| `total_appointments` | integer | YES | `0` | |
| `completed_appointments` | integer | YES | `0` | |
| `cancelled_appointments` | integer | YES | `0` | |
| `no_show_count` | integer | YES | `0` | |
| `no_show_rate` | numeric | YES | `0.00` | |
| `average_booking_lead_time_days` | integer | YES | | |
| `reliability_score` | numeric | YES | `100.00` | |
| `last_calculated_at` | timestamptz | YES | | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~4

---

### patient_allergies

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `allergy_name` | text | YES | | |
| `severity` | text | NO | `'moderate'` | Check: `mild`, `moderate`, `severe`, `life-threatening` |
| `notes` | text | YES | | |
| `created_by` | uuid | YES | | FK -> `profiles.id` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~2

---

### patient_documents

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `document_type` | text | NO | `'other'` | |
| `title` | text | YES | | |
| `file_name` | text | YES | | |
| `file_path` | text | NO | | |
| `file_size_bytes` | integer | YES | | |
| `mime_type` | text | YES | | |
| `uploaded_by` | uuid | YES | | FK -> `profiles.id` |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### patient_tags

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `name` | text | NO | | |
| `color` | text | NO | `'#3B82F6'` | |
| `description` | text | YES | | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### patient_tag_assignments

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `tag_id` | uuid | NO | | FK -> `patient_tags.id` |
| `assigned_by` | uuid | YES | | FK -> `profiles.id` |
| `assigned_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### medical_records

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | |
| `record_type` | text | NO | `'consultation'` | |
| `title` | text | NO | | |
| `description` | text | YES | | |
| `findings` | text | YES | | |
| `treatment_provided` | text | YES | | |
| `record_date` | timestamptz | NO | `now()` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### imaging_sets
> Groups of images/scans for a patient visit.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `appointment_id` | uuid | YES | | FK -> `appointments.id` |
| `treatment_plan_id` | uuid | YES | | FK -> `treatment_plans.id` |
| `uploaded_by` | uuid | NO | | FK -> `profiles.id` |
| `imaging_type` | imaging_type | YES | `'unknown'` | Enum |
| `notes` | text | YES | | |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~20

---

### imaging_files
> Individual files within an imaging set.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `imaging_set_id` | uuid | NO | | FK -> `imaging_sets.id` |
| `storage_path` | text | NO | | |
| `filename` | text | NO | | |
| `original_filename` | text | YES | | |
| `mime_type` | text | NO | | |
| `size_bytes` | bigint | NO | | |
| `width` | integer | YES | | |
| `height` | integer | YES | | |
| `thumbnail_path` | text | YES | | |
| `metadata` | text | YES | | |
| `created_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~20

---

## Payments & Billing

### payment_requests
> Invoice-style payment requests sent to patients.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `dentist_id` | uuid | NO | | FK -> `dentists.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `appointment_id` | uuid | YES | | FK -> `appointments.id` |
| `amount` | integer | NO | | Check: `> 0` |
| `description` | text | NO | | |
| `patient_email` | text | NO | | |
| `status` | text | NO | `'draft'` | Check: `draft`, `sent`, `pending`, `paid`, `overdue`, `failed`, `cancelled` |
| `stripe_session_id` | text | YES | | |
| `due_date` | timestamptz | YES | | |
| `paid_at` | timestamptz | YES | | |
| `terms_due_in_days` | integer | YES | `14` | |
| `reminder_cadence_days` | integer[] | YES | `{3, 7, 14}` | |
| `channels` | text[] | YES | `{'email'}` | |
| `last_reminder_at` | timestamptz | YES | | |
| `created_by` | uuid | YES | | FK -> `profiles.id` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### payment_items
> Line items on a payment request.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `payment_request_id` | uuid | NO | | FK -> `payment_requests.id` |
| `code` | text | YES | | |
| `description` | text | NO | | |
| `quantity` | integer | NO | `1` | Check: `> 0` |
| `unit_price_cents` | integer | NO | | Check: `>= 0` |
| `tax_cents` | integer | YES | `0` | Check: `>= 0` |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### payment_reminders

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `payment_request_id` | uuid | NO | | FK -> `payment_requests.id` |
| `template_key` | text | NO | | |
| `channel` | text | NO | `'email'` | Check: `email`, `sms`, `push` |
| `status` | text | NO | `'pending'` | Check: `pending`, `sent`, `failed` |
| `sent_at` | timestamptz | YES | | |
| `metadata` | jsonb | YES | `'{}'` | |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### subscription_plans

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `name` | text | NO | | |
| `slug` | text | YES | | **Unique** |
| `price_monthly` | numeric | NO | | |
| `price_yearly` | numeric | NO | | |
| `stripe_price_id_monthly` | text | YES | | |
| `stripe_price_id_yearly` | text | YES | | |
| `stripe_product_id` | text | YES | | |
| `features` | jsonb | NO | `'[]'` | |
| `customer_limit` | integer | NO | `0` | |
| `email_limit_monthly` | integer | YES | | |
| `phone_minutes_daily` | integer | YES | `5` | |
| `is_active` | boolean | NO | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### promo_codes

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `code` | text | NO | | **Unique** |
| `discount_type` | text | NO | | Check: `free`, `percentage`, `fixed_amount` |
| `discount_value` | integer | YES | `0` | |
| `is_active` | boolean | YES | `true` | |
| `max_uses` | integer | YES | | |
| `uses_count` | integer | YES | `0` | |
| `expires_at` | timestamptz | YES | | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~1

---

### platform_revenue
> Tracks Caberu's revenue and costs per business per day.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `revenue_date` | date | NO | `CURRENT_DATE` | |
| `subscription_revenue_cents` | integer | YES | `0` | |
| `overage_revenue_cents` | integer | YES | `0` | |
| `total_revenue_cents` | integer | YES | Generated: sum of above | |
| `voice_cost_cents` | integer | YES | `0` | |
| `twilio_cost_cents` | integer | YES | `0` | |
| `whatsapp_cost_cents` | integer | YES | `0` | |
| `total_cost_cents` | integer | YES | Generated: sum of costs | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

## Communication

### messages
> Direct messages between profiles within a business.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `sender_profile_id` | uuid | NO | | FK -> `profiles.id` |
| `recipient_profile_id` | uuid | NO | | FK -> `profiles.id` |
| `message_text` | text | YES | | Encrypted (AES-256) |
| `is_read` | boolean | NO | `false` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~48

---

### chat_messages
> AI chatbot conversation messages (patient intake).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `session_id` | uuid | NO | | |
| `user_id` | uuid | YES | | FK -> `auth.users.id` |
| `business_id` | uuid | YES | | FK -> `businesses.id` |
| `appointment_id` | uuid | YES | | FK -> `appointments.id` |
| `is_bot` | boolean | NO | `false` | |
| `message_type` | text | NO | `'text'` | |
| `message` | text | YES | | Encrypted (AES-256) |
| `metadata` | text | YES | | Encrypted (AES-256) JSON |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~108

---

### communication_logs

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `channel` | text | NO | | Check: `email`, `sms`, `phone`, `in-app` |
| `direction` | text | NO | | Check: `outbound`, `inbound` |
| `status` | text | NO | `'sent'` | |
| `content` | text | YES | | Encrypted (AES-256) |
| `subject` | text | YES | | Encrypted (AES-256) |
| `sent_by` | uuid | YES | | FK -> `profiles.id` |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### email_logs

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `recipient_email` | text | NO | | |
| `recipient_name` | text | YES | | |
| `email_type` | text | NO | | |
| `subject` | text | YES | | Encrypted (AES-256) |
| `status` | text | YES | `'sent'` | |
| `sent_at` | timestamptz | YES | `now()` | |
| `created_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### business_email_templates

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `template_type` | text | NO | | |
| `subject` | text | NO | | |
| `body_html` | text | NO | | |
| `is_active` | boolean | YES | `true` | |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~1

---

### notifications

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `user_id` | uuid | NO | | FK -> `auth.users.id` |
| `type` | text | NO | `'system'` | |
| `category` | text | NO | `'info'` | |
| `title` | text | NO | | |
| `message` | text | NO | | |
| `action_url` | text | YES | | |
| `metadata` | jsonb | YES | `'{}'` | |
| `expires_at` | timestamptz | YES | | |
| `is_read` | boolean | NO | `false` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~30

---

### notification_preferences

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `user_id` | uuid | NO | | **Unique**, FK -> `auth.users.id` |
| `email_enabled` | boolean | NO | `true` | |
| `sms_enabled` | boolean | NO | `false` | |
| `push_enabled` | boolean | NO | `true` | |
| `in_app_enabled` | boolean | NO | `true` | |
| `appointment_reminders` | boolean | NO | `true` | |
| `prescription_updates` | boolean | NO | `true` | |
| `treatment_plan_updates` | boolean | NO | `true` | |
| `emergency_alerts` | boolean | NO | `true` | |
| `system_notifications` | boolean | NO | `true` | |
| `quiet_hours_start` | text | NO | `'22:00'` | |
| `quiet_hours_end` | text | NO | `'07:00'` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### push_subscriptions

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `user_id` | uuid | NO | | FK -> `auth.users.id` |
| `endpoint` | text | NO | | |
| `p256dh_key` | text | NO | | |
| `auth_key` | text | NO | | |
| `is_active` | boolean | NO | `true` | |
| `user_agent` | text | YES | | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~56

---

## AI & Voice

### elevenlabs_agents
> ElevenLabs voice agent configuration per business.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `agent_id` | text | NO | | **Unique** |
| `agent_name` | text | YES | | |
| `voice_id` | text | YES | | |
| `is_active` | boolean | YES | `true` | |
| `settings` | jsonb | YES | `'{}'` | |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~1

---

### ai_knowledge_documents
> Custom knowledge base documents uploaded per business for AI context.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `file_name` | text | NO | | |
| `file_path` | text | NO | | |
| `file_type` | text | NO | | |
| `content` | text | YES | | |
| `status` | text | YES | `'active'` | Check: `active`, `inactive` |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### phone_usage
> Tracks phone call usage for billing and analytics.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `call_id` | text | YES | | **Unique** |
| `agent_id` | text | YES | | |
| `call_started_at` | timestamptz | YES | | |
| `call_ended_at` | timestamptz | YES | | |
| `duration_seconds` | integer | NO | `0` | |
| `caller_phone` | text | YES | | |
| `call_type` | text | YES | `'inbound'` | |
| `transcript` | jsonb | YES | | |
| `is_billable` | boolean | YES | `true` | |
| `included_in_plan` | boolean | YES | `true` | |
| `cost_cents` | integer | YES | `0` | |
| `metadata` | jsonb | YES | `'{}'` | |
| `created_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~17

---

## Security & Compliance

### business_encryption_keys
> Per-business AES-256 encryption keys for PHI data.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `key_version` | integer | NO | `1` | |
| `encrypted_key` | text | NO | | |
| `is_active` | boolean | NO | `true` | |
| `expires_at` | timestamptz | NO | `now() + 1 year` | |
| `rotated_at` | timestamptz | YES | | |
| `created_by` | uuid | YES | | FK -> `auth.users.id` |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### verification_codes

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `user_id` | uuid | YES | | |
| `email` | text | NO | | **Unique** |
| `code` | text | NO | | |
| `type` | text | YES | `'2fa'` | |
| `expires_at` | timestamptz | NO | | |
| `used` | boolean | NO | `false` | |
| `failed_attempts` | integer | YES | `0` | |
| `lockout_until` | timestamptz | YES | | |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### audit_logs
> GDPR Article 30 processing activity records.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | **PK** |
| `user_id` | uuid | YES | | FK -> `auth.users.id` |
| `action` | text | NO | | Check: `create`, `read`, `update`, `delete`, `export`, `login`, `logout`, `INSERT`, `UPDATE`, `DELETE`, `SELECT`, `phi_access`, `phi_update`, `phi_delete`, `phi_export`, `notification_sent`, `push_notification`, `email_sent`, `appointment_create`, `appointment_update`, `appointment_cancel`, `payment_create`, `payment_update` |
| `table_name` | text | YES | | |
| `record_id` | text | YES | | |
| `changes` | jsonb | YES | | |
| `ip_address` | inet | YES | | |
| `user_agent` | text | YES | | |
| `created_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~277

---

### super_admin_audit_log

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `user_id` | uuid | YES | | FK -> `auth.users.id` |
| `action` | text | NO | | |
| `resource_type` | text | YES | | |
| `resource_id` | text | YES | | |
| `details` | jsonb | YES | | |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### api_rate_limits
> Rate limiting for edge functions. HIPAA/security compliance.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `key` | text | NO | | |
| `count` | integer | YES | `1` | |
| `window_start` | timestamptz | YES | `now()` | |
| `created_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~309

---

### notes
> Clinical notes attached to patients, appointments, or dentists.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `patient_id` | uuid | YES | | FK -> `profiles.id` |
| `dentist_id` | uuid | YES | | FK -> `dentists.id` |
| `appointment_id` | uuid | YES | | FK -> `appointments.id` |
| `business_id` | uuid | YES | | FK -> `businesses.id` |
| `created_by` | uuid | YES | | FK -> `dentists.id` |
| `title` | text | YES | | |
| `content` | text | YES | | |
| `note_type` | text | YES | `'general'` | |
| `is_private` | boolean | YES | `false` | |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~4

---

## GDPR & Consent

### gdpr_requests
> GDPR Article 15-21 request tracking.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | **PK** |
| `user_id` | uuid | NO | | FK -> `auth.users.id` |
| `request_type` | text | NO | | Check: `access`, `export`, `deletion`, `rectification`, `portability` |
| `status` | text | NO | `'pending'` | Check: `pending`, `processing`, `completed`, `rejected` |
| `requested_at` | timestamptz | YES | `now()` | |
| `completed_at` | timestamptz | YES | | |
| `notes` | text | YES | | |
| `processed_by` | uuid | YES | | FK -> `auth.users.id` |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### gdpr_export_bundles
> GDPR Article 20 data portability exports.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | **PK** |
| `user_id` | uuid | NO | | FK -> `auth.users.id` |
| `request_id` | uuid | YES | | FK -> `gdpr_requests.id` |
| `file_path` | text | YES | | |
| `file_size_bytes` | bigint | YES | | |
| `format` | text | YES | `'json'` | Check: `json`, `csv`, `xml` |
| `expires_at` | timestamptz | YES | `now() + 7 days` | |
| `downloaded_at` | timestamptz | YES | | |
| `created_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### patient_consents

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | **PK** |
| `patient_id` | uuid | NO | | FK -> `profiles.id` |
| `practice_id` | uuid | NO | | |
| `health_data_consent` | boolean | NO | | |
| `data_processing_consent` | boolean | NO | | |
| `understand_rights` | boolean | NO | | |
| `consent_date` | timestamptz | NO | | |
| `withdrawn_at` | timestamptz | YES | | |
| `withdrawal_reason` | text | YES | | |
| `ip_address` | text | YES | | |
| `user_agent` | text | YES | | |
| `consent_version` | varchar | YES | `'1.0'` | |
| `created_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### practice_consents

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | **PK** |
| `practice_id` | uuid | NO | | |
| `general_consent` | boolean | NO | | |
| `data_processing_consent` | boolean | NO | | |
| `terms_accepted` | boolean | NO | | |
| `consent_date` | timestamptz | NO | | |
| `ip_address` | text | YES | | |
| `user_agent` | text | YES | | |
| `consent_version` | varchar | YES | `'1.0'` | |
| `created_at` | timestamptz | YES | `now()` | |

**RLS:** Enabled | **Rows:** ~7

---

## Platform & Admin

### feature_flags

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `flag_key` | text | NO | | **Unique** |
| `name` | text | NO | | |
| `description` | text | YES | | |
| `is_enabled` | boolean | NO | `false` | |
| `rollout_percentage` | integer | YES | `100` | Check: 0-100 |
| `category` | text | YES | `'general'` | |
| `metadata` | jsonb | YES | `'{}'` | |
| `created_by` | uuid | YES | | FK -> `auth.users.id` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~1

---

### feature_flag_overrides
> Per-business overrides for feature flags.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `flag_id` | uuid | NO | | FK -> `feature_flags.id` |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `is_enabled` | boolean | NO | | |
| `reason` | text | YES | | |
| `created_by` | uuid | YES | | FK -> `auth.users.id` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### feature_flag_changelog

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `flag_id` | uuid | NO | | FK -> `feature_flags.id` |
| `business_id` | uuid | YES | | FK -> `businesses.id` |
| `action` | text | NO | | |
| `old_value` | jsonb | YES | | |
| `new_value` | jsonb | YES | | |
| `changed_by` | uuid | YES | | FK -> `auth.users.id` |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~3

---

### platform_status

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `overall_status` | text | NO | `'operational'` | Check: `operational`, `degraded`, `partial_outage`, `major_outage`, `maintenance` |
| `status_message` | text | YES | | |
| `show_banner` | boolean | YES | `false` | |
| `banner_message` | text | YES | | |
| `banner_severity` | text | YES | `'info'` | Check: `info`, `warning`, `error`, `critical` |
| `updated_by` | uuid | YES | | FK -> `auth.users.id` |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~1

---

### system_errors

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `error_type` | text | NO | | |
| `error_message` | text | NO | | |
| `stack_trace` | text | YES | | |
| `severity` | text | NO | `'low'` | Check: `low`, `medium`, `high`, `critical` |
| `user_id` | uuid | YES | | FK -> `auth.users.id` |
| `business_id` | uuid | YES | | FK -> `businesses.id` |
| `url` | text | YES | | |
| `user_agent` | text | YES | | |
| `metadata` | jsonb | YES | | |
| `resolved` | boolean | NO | `false` | |
| `resolved_by` | uuid | YES | | FK -> `auth.users.id` |
| `resolved_at` | timestamptz | YES | | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~540

---

### system_errors_archive
> Archive of old system errors for audit. Can be purged periodically.

Same schema as `system_errors`.

**RLS:** Enabled | **Rows:** ~2,455

---

### system_health_checks

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `service_name` | text | NO | | |
| `status` | text | NO | `'healthy'` | |
| `response_time_ms` | integer | YES | | |
| `error_message` | text | YES | | |
| `metadata` | jsonb | YES | `'{}'` | |
| `checked_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### scheduled_downtimes

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `title` | text | NO | | |
| `description` | text | YES | | |
| `reason` | text | YES | | |
| `status` | text | NO | `'scheduled'` | Check: `scheduled`, `in_progress`, `completed`, `cancelled` |
| `severity` | text | NO | `'maintenance'` | Check: `maintenance`, `partial`, `major`, `critical` |
| `affected_services` | text[] | YES | `'{}'` | |
| `scheduled_start` | timestamptz | NO | | |
| `scheduled_end` | timestamptz | NO | | |
| `actual_start` | timestamptz | YES | | |
| `actual_end` | timestamptz | YES | | |
| `notify_users` | boolean | YES | `true` | |
| `is_public` | boolean | YES | `true` | |
| `created_by` | uuid | YES | | FK -> `auth.users.id` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~0

---

### dentist_invitations

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `business_id` | uuid | NO | | FK -> `businesses.id` |
| `inviter_profile_id` | uuid | NO | | FK -> `profiles.id` |
| `invitee_email` | text | NO | | |
| `invitee_profile_id` | uuid | YES | | FK -> `profiles.id` |
| `status` | text | NO | `'pending'` | Check: `pending`, `accepted`, `rejected`, `expired` |
| `invited_at` | timestamptz | NO | `now()` | |
| `responded_at` | timestamptz | YES | | |
| `expires_at` | timestamptz | NO | `now() + 30 days` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~2

---

### tour_completions

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK** |
| `user_id` | uuid | NO | | FK -> `auth.users.id` |
| `tour_type` | text | NO | | |
| `completed_at` | timestamptz | NO | `now()` | |
| `created_at` | timestamptz | NO | `now()` | |

**RLS:** Enabled | **Rows:** ~6

---

## Database Functions

### Auth & Identity

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `handle_new_user` | -- | trigger | DEFINER |
| `assign_default_patient_role` | -- | trigger | DEFINER |
| `assign_provider_role` | -- | void | DEFINER |
| `assign_provider_role_on_dentist` | -- | trigger | DEFINER |
| `populate_dentist_identity` | -- | trigger | DEFINER |
| `sync_dentist_from_profile` | -- | trigger | DEFINER |
| `sync_user_profile_map` | -- | trigger | DEFINER |
| `auto_create_dentist_record` | -- | trigger | DEFINER |
| `auto_create_business_encryption_key` | -- | trigger | DEFINER |

### Access Control

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `has_role` | `_user_id uuid, _role app_role` | boolean | DEFINER |
| `is_super_admin` | -- | boolean | DEFINER |
| `is_dentist` | `_user_id uuid` | boolean | DEFINER |
| `is_business_owner` | `target_business_id uuid` | boolean | DEFINER |
| `is_business_owner` | `_user_id uuid, _business_id uuid` | boolean | DEFINER |
| `is_business_staff` | `_user_id uuid, _business_id uuid` | boolean | DEFINER |
| `is_business_member` | `p_profile_id uuid, p_business_id uuid` | boolean | DEFINER |
| `is_member_of_business` | `target_business_id uuid` | boolean | DEFINER |
| `is_member_of_business_with_role` | `target_business_id uuid, allowed_roles text[]` | boolean | DEFINER |
| `is_user_business_member` | `_user_id uuid` | boolean | DEFINER |
| `is_user_member_of_business` | `_user_id uuid, _business_id uuid` | boolean | DEFINER |
| `is_clinic_patient` | `_profile_id uuid, _business_id uuid` | boolean | DEFINER |
| `is_dentist_patient` | `patient_profile_id uuid` | boolean | DEFINER |
| `is_dentist_patient_norec` | `patient_profile_id uuid` | boolean | DEFINER |
| `dentist_has_patient_access` | `_user_id uuid, _patient_id uuid` | boolean | DEFINER |
| `has_business_access` | `target_business_id uuid` | boolean | DEFINER |
| `has_business_access_via_membership` | `target_business_id uuid` | boolean | DEFINER |
| `can_access_profile` | `target_profile_id uuid` | boolean | DEFINER |
| `can_modify_profile` | `target_profile_id uuid` | boolean | DEFINER |
| `can_view_profile_in_user_business` | `_target_profile_id uuid, _viewer_user_id uuid` | boolean | DEFINER |
| `can_view_profile_in_user_business_norec` | `_target_profile_id uuid, _viewer_user_id uuid` | boolean | DEFINER |
| `fn_can_view_profile` | `target_profile_id uuid` | boolean | DEFINER |
| `is_active_dentist_profile` | `p_profile_id uuid` | boolean | DEFINER |

### Profile & Business Helpers

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `get_my_profile_id` | -- | uuid | DEFINER |
| `get_user_profile_id` | `_user_id uuid` | uuid | DEFINER |
| `viewer_profile_id` | `_viewer_user_id uuid` | uuid | DEFINER |
| `get_current_business_id` | -- | uuid | DEFINER |
| `get_user_business_ids` | -- | SETOF uuid | DEFINER |
| `leave_clinic` | `p_business_id uuid` | jsonb | DEFINER |
| `accept_dentist_invitation` | `p_invitation_id uuid, p_business_id uuid` | jsonb | DEFINER |

### Scheduling & Slots

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `generate_daily_slots` | `p_dentist_id, p_date, p_business_id` | void | DEFINER |
| `generate_appointment_slots_safe` | `p_dentist_id, p_date, p_business_id` | void | DEFINER |
| `regenerate_daily_slots` | `p_dentist_id, p_date, p_business_id` | void | DEFINER |
| `ensure_daily_slots` | `p_dentist_id, p_date` | void | DEFINER |
| `get_available_slots` | `p_dentist_id, p_date, p_service_id, p_business_id, p_slot_interval_minutes` | TABLE(slot_start, slot_end, duration_minutes) | DEFINER |
| `get_dentist_available_slots` | `p_dentist_id, p_date, p_business_id` | TABLE(slot_time, is_available) | DEFINER |
| `get_dentists_for_service` | `p_service_id, p_business_id, p_from_date, p_days_ahead` | TABLE(...) | DEFINER |
| `book_appointment_slot` | `p_dentist_id, p_slot_date, p_slot_time, p_appointment_id` | boolean | DEFINER |
| `book_appointment_slots_for_duration` | `p_dentist_id, p_slot_date, p_start_time, p_duration_minutes, p_appointment_id` | boolean | DEFINER |
| `release_appointment_slot` | `p_appointment_id` | boolean | DEFINER |
| `release_appointment_slots` | `p_appointment_id` | boolean | DEFINER |
| `reschedule_appointment` | `p_appointment_id, p_user_id, p_slot_date, p_slot_time` | boolean | DEFINER |
| `get_dentist_capacity_usage` | `p_dentist_id, p_date, p_business_id` | TABLE(...) | DEFINER |
| `check_affected_appointments_on_availability_change` | `p_dentist_id, p_business_id, p_new_availability` | TABLE(...) | DEFINER |
| `validate_slot_availability` | -- | trigger | INVOKER |
| `trigger_clear_slots_on_vacation` | -- | trigger | INVOKER |

### Appointment Triggers

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `schedule_appointment_reminders` | -- | trigger | DEFINER |
| `cancel_appointment_reminders` | -- | trigger | DEFINER |
| `trigger_update_patient_preferences` | -- | trigger | DEFINER |
| `calculate_patient_preferences` | `p_patient_id, p_business_id` | void | DEFINER |

### Admin & Analytics

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `get_admin_dashboard_stats` | -- | TABLE(...) | DEFINER |
| `get_all_businesses_admin` | -- | TABLE(...) | DEFINER |
| `get_all_users_admin` | `search_query text` | TABLE(...) | DEFINER |
| `get_practice_detail` | `p_business_id uuid` | TABLE(...) | DEFINER |
| `get_system_stats` | -- | TABLE(...) | DEFINER |
| `get_dentist_patients` | `p_dentist_id, p_business_id, p_cursor, p_limit, p_search` | TABLE(...) | DEFINER |
| `log_super_admin_action` | `p_action, p_resource_type, p_resource_id, p_details` | void | DEFINER |

### Billing & Usage

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `check_phone_minutes_available` | `p_business_id` | TABLE(...) | DEFINER |
| `get_daily_phone_usage` | `p_business_id, p_date` | TABLE(...) | DEFINER |
| `increment_email_count` | `business_uuid` | void | DEFINER |
| `increment_promo_usage` | `promo_id` | void | DEFINER |
| `check_rate_limit` | `p_key, p_max_requests, p_window_minutes` | TABLE(exceeded, current_count, reset_at) | DEFINER |
| `cleanup_old_rate_limits` | -- | integer | DEFINER |

### Imaging & Treatment

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `check_imaging_workflow_flags` | `p_appointment_id` | jsonb | DEFINER |
| `get_appointment_imaging_status` | `p_appointment_id` | jsonb | DEFINER |
| `get_treatment_plan_details` | `p_treatment_plan_id` | jsonb | DEFINER |
| `update_imaging_sets_updated_at` | -- | trigger | INVOKER |
| `update_treatment_plan_items_updated_at` | -- | trigger | INVOKER |

### GDPR & Compliance

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `audit_phi_access` | -- | trigger | DEFINER |
| `has_active_consent` | `p_patient_id, p_practice_id` | boolean | DEFINER |
| `has_valid_health_consent` | `p_patient_id, p_practice_id` | boolean | DEFINER |
| `process_gdpr_deletion` | `target_user_id` | jsonb | DEFINER |
| `cleanup_old_audit_logs` | -- | jsonb | DEFINER |

### Feature Flags

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `is_feature_enabled` | `p_flag_key text, p_business_id uuid` | boolean | DEFINER |

### Utility

| Function | Arguments | Returns | Security |
|----------|-----------|---------|----------|
| `update_updated_at_column` | -- | trigger | DEFINER |
| `update_promo_codes_updated_at` | -- | trigger | DEFINER |
| `cleanup_expired_verification_codes` | -- | trigger | DEFINER |
| `rls_auto_enable` | -- | event_trigger | DEFINER |

---

## Entity Relationship Diagram

```
auth.users
  |
  |--1:1--> profiles <--1:1-- dentists
  |           |                    |
  |           |-- business_members |
  |           |        |           |
  |           v        v           |
  |       businesses <-------------+
  |           |                    |
  |           |-- business_services --> dentist_services
  |           |-- appointment_types
  |           |-- appointment_slots
  |           |
  |           v
  |       appointments
  |           |
  |           |-- appointment_reminders
  |           |-- chat_messages
  |           |-- notes
  |           |-- imaging_sets --> imaging_files
  |           |-- payment_requests --> payment_items
  |           |                   +-- payment_reminders
  |           +-- treatment_plans --> treatment_plan_items
  |
  |-- user_roles
  |-- notifications
  |-- push_subscriptions
  |-- session_business
  +-- tour_completions

businesses
  |-- business_encryption_keys (per-business AES-256)
  |-- elevenlabs_agents
  |-- phone_usage
  |-- ai_knowledge_documents
  |-- business_email_templates
  |-- feature_flag_overrides
  |-- platform_revenue
  |-- dentist_availability
  |-- dentist_date_overrides
  |-- dentist_vacation_days
  |-- dentist_capacity_settings
  |-- patient_tags --> patient_tag_assignments
  +-- patient_preferences

profiles (as patients)
  |-- patient_allergies
  |-- patient_documents
  |-- patient_consents
  |-- medical_records
  |-- messages
  +-- communication_logs
```

---

## Summary Stats

| Metric | Value |
|--------|-------|
| **Total tables** | 57 |
| **All RLS enabled** | Yes |
| **Custom enums** | 3 |
| **Database functions** | 76 |
| **Encrypted fields** | 12 (AES-256 via pgp_sym_encrypt) |
| **Total rows (approx)** | ~5,200 |

---

*Fields marked as "Encrypted (AES-256)" are encrypted at rest using per-business keys stored in `business_encryption_keys`.*
