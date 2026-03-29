-- NUCLEAR RESET MIGRATION
-- This will completely destroy and recreate the database
-- WARNING: ALL DATA WILL BE LOST FOREVER

-- Drop all tables in the correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.appointment_follow_ups CASCADE;
DROP TABLE IF EXISTS public.patient_notes CASCADE;
DROP TABLE IF EXISTS public.medical_records CASCADE;
DROP TABLE IF EXISTS public.treatment_procedures CASCADE;
DROP TABLE IF EXISTS public.treatment_plans CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.sms_notifications CASCADE;
DROP TABLE IF EXISTS public.patient_symptom_summaries CASCADE;
DROP TABLE IF EXISTS public.dentist_vacation_days CASCADE;
DROP TABLE IF EXISTS public.dentist_ratings CASCADE;
DROP TABLE IF EXISTS public.dentist_availability CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.appointment_slots CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.dentist_schedules CASCADE;
DROP TABLE IF EXISTS public.urgency_assessments CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.dentists CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.generate_daily_slots() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_user() CASCADE;

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Drop all sequences
DROP SEQUENCE IF EXISTS public.profiles_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.dentists_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.appointments_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.urgency_assessments_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.dentist_schedules_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.chat_messages_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.appointment_slots_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.calendar_events_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.dentist_availability_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.dentist_ratings_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.dentist_vacation_days_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.patient_symptom_summaries_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.sms_notifications_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.reviews_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.prescriptions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.treatment_plans_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.treatment_procedures_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.medical_records_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.patient_notes_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.appointment_follow_ups_id_seq CASCADE;

-- Drop all types
DROP TYPE IF EXISTS public.appointment_status CASCADE;
DROP TYPE IF EXISTS public.urgency_level CASCADE;
DROP TYPE IF EXISTS public.dentist_role CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;
DROP TYPE IF EXISTS public.review_rating CASCADE;
DROP TYPE IF EXISTS public.prescription_status CASCADE;
DROP TYPE IF EXISTS public.treatment_status CASCADE;
DROP TYPE IF EXISTS public.procedure_type CASCADE;

-- Now recreate everything from scratch (this will be done by subsequent migrations)
-- The database is now completely empty and ready for fresh creation