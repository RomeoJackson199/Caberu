-- Disable all Row Level Security and remove all security policies
-- This migration removes all database security restrictions

-- Disable RLS on all tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.urgency_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_vacation_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_symptom_summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_procedures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_follow_ups DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies (this will remove all security restrictions)
-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Dentists policies
DROP POLICY IF EXISTS "Dentists can view own profile" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can update own profile" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can insert own profile" ON public.dentists;
DROP POLICY IF EXISTS "Patients can view dentist profiles" ON public.dentists;

-- Appointments policies
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;

-- Urgency assessments policies
DROP POLICY IF EXISTS "Users can view own urgency assessments" ON public.urgency_assessments;
DROP POLICY IF EXISTS "Users can create own urgency assessments" ON public.urgency_assessments;
DROP POLICY IF EXISTS "Users can update own urgency assessments" ON public.urgency_assessments;

-- Dentist schedules policies
DROP POLICY IF EXISTS "Dentists can view own schedules" ON public.dentist_schedules;
DROP POLICY IF EXISTS "Dentists can create own schedules" ON public.dentist_schedules;
DROP POLICY IF EXISTS "Dentists can update own schedules" ON public.dentist_schedules;
DROP POLICY IF EXISTS "Patients can view dentist schedules" ON public.dentist_schedules;

-- Chat messages policies
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update own chat messages" ON public.chat_messages;

-- Appointment slots policies
DROP POLICY IF EXISTS "Users can view appointment slots" ON public.appointment_slots;
DROP POLICY IF EXISTS "Users can create appointment slots" ON public.appointment_slots;
DROP POLICY IF EXISTS "Users can update appointment slots" ON public.appointment_slots;

-- Calendar events policies
DROP POLICY IF EXISTS "Users can view calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can create calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update calendar events" ON public.calendar_events;

-- Dentist availability policies
DROP POLICY IF EXISTS "Dentists can view own availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Dentists can create own availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Dentists can update own availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Patients can view dentist availability" ON public.dentist_availability;

-- Dentist ratings policies
DROP POLICY IF EXISTS "Users can view dentist ratings" ON public.dentist_ratings;
DROP POLICY IF EXISTS "Users can create dentist ratings" ON public.dentist_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.dentist_ratings;

-- Dentist vacation days policies
DROP POLICY IF EXISTS "Dentists can view own vacation days" ON public.dentist_vacation_days;
DROP POLICY IF EXISTS "Dentists can create own vacation days" ON public.dentist_vacation_days;
DROP POLICY IF EXISTS "Dentists can update own vacation days" ON public.dentist_vacation_days;

-- Patient symptom summaries policies
DROP POLICY IF EXISTS "Users can view own symptom summaries" ON public.patient_symptom_summaries;
DROP POLICY IF EXISTS "Users can create own symptom summaries" ON public.patient_symptom_summaries;
DROP POLICY IF EXISTS "Users can update own symptom summaries" ON public.patient_symptom_summaries;

-- SMS notifications policies
DROP POLICY IF EXISTS "Users can view own SMS notifications" ON public.sms_notifications;
DROP POLICY IF EXISTS "Users can create own SMS notifications" ON public.sms_notifications;
DROP POLICY IF EXISTS "Users can update own SMS notifications" ON public.sms_notifications;

-- Reviews policies
DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;

-- Prescriptions policies
DROP POLICY IF EXISTS "Patients can create their own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Patients can update their own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Patients can delete their own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Patients can view their own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Dentists can view prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Dentists can create prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Dentists can update prescriptions" ON public.prescriptions;

-- Treatment plans policies
DROP POLICY IF EXISTS "Patients can create their own treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Patients can update their own treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Patients can delete their own treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Patients can view their own treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Dentists can view treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Dentists can create treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Dentists can update treatment plans" ON public.treatment_plans;

-- Treatment procedures policies
DROP POLICY IF EXISTS "Users can view treatment procedures" ON public.treatment_procedures;
DROP POLICY IF EXISTS "Users can create treatment procedures" ON public.treatment_procedures;
DROP POLICY IF EXISTS "Users can update treatment procedures" ON public.treatment_procedures;

-- Medical records policies
DROP POLICY IF EXISTS "Patients can create their own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Patients can update their own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Patients can delete their own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Patients can view their own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Dentists can view medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Dentists can create medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Dentists can update medical records" ON public.medical_records;

-- Patient notes policies
DROP POLICY IF EXISTS "Patients can create their own notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Patients can update their own notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Patients can delete their own notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Patients can view their own notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Dentists can view patient notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Dentists can create patient notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Dentists can update patient notes" ON public.patient_notes;

-- Appointment follow ups policies
DROP POLICY IF EXISTS "Users can view appointment follow ups" ON public.appointment_follow_ups;
DROP POLICY IF EXISTS "Users can create appointment follow ups" ON public.appointment_follow_ups;
DROP POLICY IF EXISTS "Users can update appointment follow ups" ON public.appointment_follow_ups;

-- Grant all permissions to all users (optional - for maximum access)
-- This grants full access to all tables for all authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;