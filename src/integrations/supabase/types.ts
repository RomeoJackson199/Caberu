export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_knowledge_documents: {
        Row: {
          business_id: string
          content: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          content?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          content?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          count: number | null
          created_at: string | null
          id: string
          key: string
          window_start: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          id?: string
          key: string
          window_start?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          id?: string
          key?: string
          window_start?: string | null
        }
        Relationships: []
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          created_at: string
          error_message: string | null
          id: string
          notification_method: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_method?: string
          reminder_type?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_method?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_slots: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string | null
          dentist_id: string
          id: string
          is_available: boolean | null
          slot_date: string
          slot_time: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          dentist_id: string
          id?: string
          is_available?: boolean | null
          slot_date: string
          slot_time: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          dentist_id?: string
          id?: string
          is_available?: boolean | null
          slot_date?: string
          slot_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_slots_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          buffer_time_after_minutes: number
          business_id: string
          category: Database["public"]["Enums"]["appointment_type_category"]
          color: string | null
          created_at: string
          default_duration_minutes: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_followup: boolean | null
          updated_at: string
        }
        Insert: {
          buffer_time_after_minutes?: number
          business_id: string
          category: Database["public"]["Enums"]["appointment_type_category"]
          color?: string | null
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_followup?: boolean | null
          updated_at?: string
        }
        Update: {
          buffer_time_after_minutes?: number
          business_id?: string
          category?: Database["public"]["Enums"]["appointment_type_category"]
          color?: string | null
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_followup?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          ai_summary: string | null
          amount_paid_cents: number | null
          appointment_date: string
          appointment_type_id: string | null
          booking_source: string | null
          business_id: string
          completed_at: string | null
          consultation_notes: string | null
          conversation_transcript: Json | null
          created_at: string
          dentist_id: string
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string
          patient_name: string | null
          payment_intent_id: string | null
          payment_status: string | null
          reason: string
          service_id: string | null
          status: string
          treatment_plan_id: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          ai_summary?: string | null
          amount_paid_cents?: number | null
          appointment_date: string
          appointment_type_id?: string | null
          booking_source?: string | null
          business_id: string
          completed_at?: string | null
          consultation_notes?: string | null
          conversation_transcript?: Json | null
          created_at?: string
          dentist_id: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          patient_name?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          reason?: string
          service_id?: string | null
          status?: string
          treatment_plan_id?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          ai_summary?: string | null
          amount_paid_cents?: number | null
          appointment_date?: string
          appointment_type_id?: string | null
          booking_source?: string | null
          business_id?: string
          completed_at?: string | null
          consultation_notes?: string | null
          conversation_transcript?: Json | null
          created_at?: string
          dentist_id?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          patient_name?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          reason?: string
          service_id?: string | null
          status?: string
          treatment_plan_id?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "business_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "secure_treatment_plans_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_email_templates: {
        Row: {
          body_html: string
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          subject: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_email_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_email_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          profile_id: string
          role: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          profile_id: string
          role: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      business_services: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_cents: number
          requires_upfront_payment: boolean
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_cents?: number
          requires_upfront_payment?: boolean
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_cents?: number
          requires_upfront_payment?: boolean
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          ai_greeting: string | null
          ai_instructions: string | null
          ai_personality_traits: Json | null
          ai_response_length: string
          ai_system_behavior: string | null
          ai_tone: string
          bio: string | null
          business_hours: Json
          created_at: string
          currency: string
          custom_config: Json | null
          custom_features: Json | null
          custom_terminology: Json | null
          customer_count: number | null
          emails_sent_count: number | null
          id: string
          logo_url: string | null
          name: string
          owner_profile_id: string
          pending_plan_change: string | null
          pending_plan_change_date: string | null
          phone: string | null
          platform_fee_percentage: number | null
          promo_code_used: string | null
          show_branding_in_emails: boolean
          show_logo_in_chat: boolean
          slug: string
          specialty_type: string
          stripe_account_id: string | null
          stripe_account_status: string | null
          stripe_charges_enabled: boolean | null
          stripe_onboarding_completed: boolean | null
          stripe_payouts_enabled: boolean | null
          subscription_ends_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          tagline: string | null
          template_type: string
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          address?: string | null
          ai_greeting?: string | null
          ai_instructions?: string | null
          ai_personality_traits?: Json | null
          ai_response_length?: string
          ai_system_behavior?: string | null
          ai_tone?: string
          bio?: string | null
          business_hours?: Json
          created_at?: string
          currency?: string
          custom_config?: Json | null
          custom_features?: Json | null
          custom_terminology?: Json | null
          customer_count?: number | null
          emails_sent_count?: number | null
          id?: string
          logo_url?: string | null
          name: string
          owner_profile_id: string
          pending_plan_change?: string | null
          pending_plan_change_date?: string | null
          phone?: string | null
          platform_fee_percentage?: number | null
          promo_code_used?: string | null
          show_branding_in_emails?: boolean
          show_logo_in_chat?: boolean
          slug: string
          specialty_type?: string
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          tagline?: string | null
          template_type?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          address?: string | null
          ai_greeting?: string | null
          ai_instructions?: string | null
          ai_personality_traits?: Json | null
          ai_response_length?: string
          ai_system_behavior?: string | null
          ai_tone?: string
          bio?: string | null
          business_hours?: Json
          created_at?: string
          currency?: string
          custom_config?: Json | null
          custom_features?: Json | null
          custom_terminology?: Json | null
          customer_count?: number | null
          emails_sent_count?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_profile_id?: string
          pending_plan_change?: string | null
          pending_plan_change_date?: string | null
          phone?: string | null
          platform_fee_percentage?: number | null
          promo_code_used?: string | null
          show_branding_in_emails?: boolean
          show_logo_in_chat?: boolean
          slug?: string
          specialty_type?: string
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          tagline?: string | null
          template_type?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          is_bot: boolean
          message: string
          message_type: string
          metadata: Json | null
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_bot?: boolean
          message: string
          message_type?: string
          metadata?: Json | null
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_bot?: boolean
          message?: string
          message_type?: string
          metadata?: Json | null
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          business_id: string
          channel: string
          content: string | null
          created_at: string
          direction: string
          id: string
          patient_id: string
          sent_by: string | null
          status: string
          subject: string | null
        }
        Insert: {
          business_id: string
          channel: string
          content?: string | null
          created_at?: string
          direction: string
          id?: string
          patient_id: string
          sent_by?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          business_id?: string
          channel?: string
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          patient_id?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dentist_availability: {
        Row: {
          break_end_time: string | null
          break_start_time: string | null
          business_id: string
          created_at: string
          day_of_week: number
          dentist_id: string
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          business_id: string
          created_at?: string
          day_of_week: number
          dentist_id: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          business_id?: string
          created_at?: string
          day_of_week?: number
          dentist_id?: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentist_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_availability_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_availability_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      dentist_capacity_settings: {
        Row: {
          buffer_after_lunch_minutes: number | null
          buffer_before_lunch_minutes: number | null
          business_id: string
          created_at: string
          default_buffer_minutes: number | null
          dentist_id: string
          emergency_slot_release_hours: number | null
          emergency_slots_per_day: number | null
          expertise_categories:
            | Database["public"]["Enums"]["appointment_type_category"][]
            | null
          id: string
          max_appointments_per_day: number | null
          max_appointments_per_hour: number | null
          updated_at: string
        }
        Insert: {
          buffer_after_lunch_minutes?: number | null
          buffer_before_lunch_minutes?: number | null
          business_id: string
          created_at?: string
          default_buffer_minutes?: number | null
          dentist_id: string
          emergency_slot_release_hours?: number | null
          emergency_slots_per_day?: number | null
          expertise_categories?:
            | Database["public"]["Enums"]["appointment_type_category"][]
            | null
          id?: string
          max_appointments_per_day?: number | null
          max_appointments_per_hour?: number | null
          updated_at?: string
        }
        Update: {
          buffer_after_lunch_minutes?: number | null
          buffer_before_lunch_minutes?: number | null
          business_id?: string
          created_at?: string
          default_buffer_minutes?: number | null
          dentist_id?: string
          emergency_slot_release_hours?: number | null
          emergency_slots_per_day?: number | null
          expertise_categories?:
            | Database["public"]["Enums"]["appointment_type_category"][]
            | null
          id?: string
          max_appointments_per_day?: number | null
          max_appointments_per_hour?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentist_capacity_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_capacity_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_capacity_settings_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_capacity_settings_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      dentist_invitations: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string
          id: string
          invited_at: string
          invitee_email: string
          invitee_profile_id: string | null
          inviter_profile_id: string
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invitee_email: string
          invitee_profile_id?: string | null
          inviter_profile_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invitee_email?: string
          invitee_profile_id?: string | null
          inviter_profile_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentist_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_invitations_invitee_profile_id_fkey"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_invitations_invitee_profile_id_fkey"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_invitations_inviter_profile_id_fkey"
            columns: ["inviter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_invitations_inviter_profile_id_fkey"
            columns: ["inviter_profile_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dentist_vacation_days: {
        Row: {
          business_id: string
          created_at: string
          dentist_id: string
          end_date: string
          id: string
          is_approved: boolean
          reason: string | null
          start_date: string
          updated_at: string
          vacation_type: string
        }
        Insert: {
          business_id: string
          created_at?: string
          dentist_id: string
          end_date: string
          id?: string
          is_approved?: boolean
          reason?: string | null
          start_date: string
          updated_at?: string
          vacation_type?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          dentist_id?: string
          end_date?: string
          id?: string
          is_approved?: boolean
          reason?: string | null
          start_date?: string
          updated_at?: string
          vacation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentist_vacation_days_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_vacation_days_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_vacation_days_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_vacation_days_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      dentists: {
        Row: {
          average_rating: number
          clinic_address: string | null
          communication_score: number
          created_at: string
          email: string | null
          expertise_score: number
          first_name: string | null
          google_calendar_connected: boolean | null
          google_calendar_last_sync: string | null
          google_calendar_refresh_token: string | null
          id: string
          is_active: boolean
          last_name: string | null
          license_number: string | null
          profile_id: string
          profile_picture_url: string | null
          require_appointment_approval: boolean | null
          specialization: string | null
          total_ratings: number
          updated_at: string
          wait_time_score: number
        }
        Insert: {
          average_rating?: number
          clinic_address?: string | null
          communication_score?: number
          created_at?: string
          email?: string | null
          expertise_score?: number
          first_name?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_last_sync?: string | null
          google_calendar_refresh_token?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          license_number?: string | null
          profile_id: string
          profile_picture_url?: string | null
          require_appointment_approval?: boolean | null
          specialization?: string | null
          total_ratings?: number
          updated_at?: string
          wait_time_score?: number
        }
        Update: {
          average_rating?: number
          clinic_address?: string | null
          communication_score?: number
          created_at?: string
          email?: string | null
          expertise_score?: number
          first_name?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_last_sync?: string | null
          google_calendar_refresh_token?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          license_number?: string | null
          profile_id?: string
          profile_picture_url?: string | null
          require_appointment_approval?: boolean | null
          specialization?: string | null
          total_ratings?: number
          updated_at?: string
          wait_time_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "dentists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      elevenlabs_agents: {
        Row: {
          agent_id: string
          agent_name: string | null
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          settings: Json | null
          updated_at: string | null
          voice_id: string | null
        }
        Insert: {
          agent_id: string
          agent_name?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          settings?: Json | null
          updated_at?: string | null
          voice_id?: string | null
        }
        Update: {
          agent_id?: string
          agent_name?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          settings?: Json | null
          updated_at?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elevenlabs_agents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elevenlabs_agents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          business_id: string
          created_at: string | null
          email_type: string
          id: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          email_type: string
          id?: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          email_type?: string
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_export_bundles: {
        Row: {
          created_at: string | null
          downloaded_at: string | null
          expires_at: string | null
          file_path: string | null
          file_size_bytes: number | null
          format: string | null
          id: string
          request_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          downloaded_at?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          request_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          downloaded_at?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_export_bundles_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "gdpr_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          processed_by: string | null
          request_type: string
          requested_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          request_type: string
          requested_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          request_type?: string
          requested_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      imaging_files: {
        Row: {
          created_at: string | null
          filename: string
          height: number | null
          id: string
          imaging_set_id: string
          metadata: Json | null
          mime_type: string
          original_filename: string | null
          size_bytes: number
          storage_path: string
          thumbnail_path: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          filename: string
          height?: number | null
          id?: string
          imaging_set_id: string
          metadata?: Json | null
          mime_type: string
          original_filename?: string | null
          size_bytes: number
          storage_path: string
          thumbnail_path?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          filename?: string
          height?: number | null
          id?: string
          imaging_set_id?: string
          metadata?: Json | null
          mime_type?: string
          original_filename?: string | null
          size_bytes?: number
          storage_path?: string
          thumbnail_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imaging_files_imaging_set_id_fkey"
            columns: ["imaging_set_id"]
            isOneToOne: false
            referencedRelation: "imaging_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      imaging_sets: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string | null
          id: string
          imaging_type: Database["public"]["Enums"]["imaging_type"] | null
          notes: string | null
          patient_id: string
          treatment_plan_id: string | null
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          imaging_type?: Database["public"]["Enums"]["imaging_type"] | null
          notes?: string | null
          patient_id: string
          treatment_plan_id?: string | null
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          imaging_type?: Database["public"]["Enums"]["imaging_type"] | null
          notes?: string | null
          patient_id?: string
          treatment_plan_id?: string | null
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "imaging_sets_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_sets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_sets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_sets_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_sets_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_sets_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "secure_treatment_plans_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_sets_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_sets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_sets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          business_id: string
          created_at: string
          dentist_id: string
          description: string | null
          findings: string | null
          findings_encrypted: string | null
          id: string
          patient_id: string
          record_date: string
          record_type: string
          title: string
          treatment_provided: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          dentist_id: string
          description?: string | null
          findings?: string | null
          findings_encrypted?: string | null
          id?: string
          patient_id: string
          record_date?: string
          record_type?: string
          title: string
          treatment_provided?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          dentist_id?: string
          description?: string | null
          findings?: string | null
          findings_encrypted?: string | null
          id?: string
          patient_id?: string
          record_date?: string
          record_type?: string
          title?: string
          treatment_provided?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          recipient_profile_id: string
          sender_profile_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          recipient_profile_id: string
          sender_profile_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          recipient_profile_id?: string
          sender_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          appointment_id: string | null
          content: string
          content_encrypted: string | null
          created_at: string | null
          created_by: string | null
          dentist_id: string | null
          id: string
          is_private: boolean | null
          note_type: string | null
          patient_id: string | null
          title: string | null
          title_encrypted: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          content: string
          content_encrypted?: string | null
          created_at?: string | null
          created_by?: string | null
          dentist_id?: string | null
          id?: string
          is_private?: boolean | null
          note_type?: string | null
          patient_id?: string | null
          title?: string | null
          title_encrypted?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          content?: string
          content_encrypted?: string | null
          created_at?: string | null
          created_by?: string | null
          dentist_id?: string | null
          id?: string
          is_private?: boolean | null
          note_type?: string | null
          patient_id?: string | null
          title?: string | null
          title_encrypted?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          appointment_reminders: boolean
          created_at: string
          email_enabled: boolean
          emergency_alerts: boolean
          id: string
          in_app_enabled: boolean
          prescription_updates: boolean
          push_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          sms_enabled: boolean
          system_notifications: boolean
          treatment_plan_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_reminders?: boolean
          created_at?: string
          email_enabled?: boolean
          emergency_alerts?: boolean
          id?: string
          in_app_enabled?: boolean
          prescription_updates?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          sms_enabled?: boolean
          system_notifications?: boolean
          treatment_plan_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_reminders?: boolean
          created_at?: string
          email_enabled?: boolean
          emergency_alerts?: boolean
          id?: string
          in_app_enabled?: boolean
          prescription_updates?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          sms_enabled?: boolean
          system_notifications?: boolean
          treatment_plan_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_allergies: {
        Row: {
          allergy_name: string
          allergy_name_encrypted: string | null
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          notes_encrypted: string | null
          patient_id: string
          severity: string
          updated_at: string
        }
        Insert: {
          allergy_name: string
          allergy_name_encrypted?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          notes_encrypted?: string | null
          patient_id: string
          severity?: string
          updated_at?: string
        }
        Update: {
          allergy_name?: string
          allergy_name_encrypted?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          notes_encrypted?: string | null
          patient_id?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_allergies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_allergies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_allergies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_allergies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          consent_date: string
          consent_version: string | null
          created_at: string | null
          data_processing_consent: boolean
          health_data_consent: boolean
          id: string
          ip_address: string | null
          patient_id: string
          practice_id: string
          understand_rights: boolean
          user_agent: string | null
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_date: string
          consent_version?: string | null
          created_at?: string | null
          data_processing_consent: boolean
          health_data_consent: boolean
          id?: string
          ip_address?: string | null
          patient_id: string
          practice_id: string
          understand_rights: boolean
          user_agent?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_date?: string
          consent_version?: string | null
          created_at?: string | null
          data_processing_consent?: boolean
          health_data_consent?: boolean
          id?: string
          ip_address?: string | null
          patient_id?: string
          practice_id?: string
          understand_rights?: boolean
          user_agent?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          business_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          patient_id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          document_type?: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          patient_id: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          patient_id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_preferences: {
        Row: {
          average_booking_lead_time_days: number | null
          business_id: string
          cancelled_appointments: number | null
          completed_appointments: number | null
          created_at: string
          id: string
          last_calculated_at: string | null
          no_show_count: number | null
          no_show_rate: number | null
          patient_id: string
          preferred_days_of_week: number[] | null
          preferred_dentist_id: string | null
          preferred_reminder_hours: number | null
          preferred_time_of_day: string[] | null
          reliability_score: number | null
          total_appointments: number | null
          updated_at: string
        }
        Insert: {
          average_booking_lead_time_days?: number | null
          business_id: string
          cancelled_appointments?: number | null
          completed_appointments?: number | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          no_show_count?: number | null
          no_show_rate?: number | null
          patient_id: string
          preferred_days_of_week?: number[] | null
          preferred_dentist_id?: string | null
          preferred_reminder_hours?: number | null
          preferred_time_of_day?: string[] | null
          reliability_score?: number | null
          total_appointments?: number | null
          updated_at?: string
        }
        Update: {
          average_booking_lead_time_days?: number | null
          business_id?: string
          cancelled_appointments?: number | null
          completed_appointments?: number | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          no_show_count?: number | null
          no_show_rate?: number | null
          patient_id?: string
          preferred_days_of_week?: number[] | null
          preferred_dentist_id?: string | null
          preferred_reminder_hours?: number | null
          preferred_time_of_day?: string[] | null
          reliability_score?: number | null
          total_appointments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_preferences_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_preferences_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_preferences_preferred_dentist_id_fkey"
            columns: ["preferred_dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_preferences_preferred_dentist_id_fkey"
            columns: ["preferred_dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_tag_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          patient_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          patient_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          patient_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_tag_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_tag_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_tag_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_tag_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "patient_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_tags: {
        Row: {
          business_id: string
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_tags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_tags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_items: {
        Row: {
          code: string | null
          created_at: string
          description: string
          id: string
          payment_request_id: string
          quantity: number
          tax_cents: number | null
          unit_price_cents: number
        }
        Insert: {
          code?: string | null
          created_at?: string
          description: string
          id?: string
          payment_request_id: string
          quantity?: number
          tax_cents?: number | null
          unit_price_cents: number
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string
          id?: string
          payment_request_id?: string
          quantity?: number
          tax_cents?: number | null
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_items_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          channel: string
          created_at: string
          id: string
          metadata: Json | null
          payment_request_id: string
          sent_at: string | null
          status: string
          template_key: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_request_id: string
          sent_at?: string | null
          status?: string
          template_key: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_request_id?: string
          sent_at?: string | null
          status?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          appointment_id: string | null
          business_id: string
          channels: string[] | null
          created_at: string
          created_by: string | null
          dentist_id: string
          description: string
          due_date: string | null
          id: string
          last_reminder_at: string | null
          paid_at: string | null
          patient_email: string
          patient_id: string
          reminder_cadence_days: number[] | null
          status: string
          stripe_session_id: string | null
          terms_due_in_days: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          business_id: string
          channels?: string[] | null
          created_at?: string
          created_by?: string | null
          dentist_id: string
          description: string
          due_date?: string | null
          id?: string
          last_reminder_at?: string | null
          paid_at?: string | null
          patient_email: string
          patient_id: string
          reminder_cadence_days?: number[] | null
          status?: string
          stripe_session_id?: string | null
          terms_due_in_days?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          business_id?: string
          channels?: string[] | null
          created_at?: string
          created_by?: string | null
          dentist_id?: string
          description?: string
          due_date?: string | null
          id?: string
          last_reminder_at?: string | null
          paid_at?: string | null
          patient_email?: string
          patient_id?: string
          reminder_cadence_days?: number[] | null
          status?: string
          stripe_session_id?: string | null
          terms_due_in_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_usage: {
        Row: {
          agent_id: string | null
          business_id: string
          call_ended_at: string | null
          call_id: string | null
          call_started_at: string | null
          call_type: string | null
          caller_phone: string | null
          cost_cents: number | null
          created_at: string | null
          duration_seconds: number
          id: string
          included_in_plan: boolean | null
          is_billable: boolean | null
          metadata: Json | null
          transcript: Json | null
        }
        Insert: {
          agent_id?: string | null
          business_id: string
          call_ended_at?: string | null
          call_id?: string | null
          call_started_at?: string | null
          call_type?: string | null
          caller_phone?: string | null
          cost_cents?: number | null
          created_at?: string | null
          duration_seconds?: number
          id?: string
          included_in_plan?: boolean | null
          is_billable?: boolean | null
          metadata?: Json | null
          transcript?: Json | null
        }
        Update: {
          agent_id?: string | null
          business_id?: string
          call_ended_at?: string | null
          call_id?: string | null
          call_started_at?: string | null
          call_type?: string | null
          caller_phone?: string | null
          cost_cents?: number | null
          created_at?: string | null
          duration_seconds?: number
          id?: string
          included_in_plan?: boolean | null
          is_billable?: boolean | null
          metadata?: Json | null
          transcript?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_consents: {
        Row: {
          consent_date: string
          consent_version: string | null
          created_at: string | null
          data_processing_consent: boolean
          general_consent: boolean
          id: string
          ip_address: string | null
          practice_id: string
          terms_accepted: boolean
          user_agent: string | null
        }
        Insert: {
          consent_date: string
          consent_version?: string | null
          created_at?: string | null
          data_processing_consent: boolean
          general_consent: boolean
          id?: string
          ip_address?: string | null
          practice_id: string
          terms_accepted: boolean
          user_agent?: string | null
        }
        Update: {
          consent_date?: string
          consent_version?: string | null
          created_at?: string | null
          data_processing_consent?: boolean
          general_consent?: boolean
          id?: string
          ip_address?: string | null
          practice_id?: string
          terms_accepted?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          address_encrypted: string | null
          ai_opt_out: boolean
          avatar_url: string | null
          bio: string | null
          business_id: string | null
          created_at: string
          date_of_birth: string | null
          date_of_birth_encrypted: string | null
          email: string | null
          emergency_contact: string | null
          emergency_contact_encrypted: string | null
          first_name: string | null
          first_name_encrypted: string | null
          google_calendar_connected: boolean | null
          google_calendar_refresh_token: string | null
          id: string
          import_session_id: string | null
          is_vip: boolean | null
          last_contact_at: string | null
          last_name: string | null
          last_name_encrypted: string | null
          medical_history: string | null
          medical_history_encrypted: string | null
          next_recall_date: string | null
          onboarding_completed: boolean | null
          patient_status: string | null
          phone: string | null
          phone_encrypted: string | null
          profile_completion_status: string
          profile_picture_url: string | null
          role: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          address_encrypted?: string | null
          ai_opt_out?: boolean
          avatar_url?: string | null
          bio?: string | null
          business_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_birth_encrypted?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_encrypted?: string | null
          first_name?: string | null
          first_name_encrypted?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_refresh_token?: string | null
          id?: string
          import_session_id?: string | null
          is_vip?: boolean | null
          last_contact_at?: string | null
          last_name?: string | null
          last_name_encrypted?: string | null
          medical_history?: string | null
          medical_history_encrypted?: string | null
          next_recall_date?: string | null
          onboarding_completed?: boolean | null
          patient_status?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          profile_completion_status?: string
          profile_picture_url?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          address_encrypted?: string | null
          ai_opt_out?: boolean
          avatar_url?: string | null
          bio?: string | null
          business_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_birth_encrypted?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_encrypted?: string | null
          first_name?: string | null
          first_name_encrypted?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_refresh_token?: string | null
          id?: string
          import_session_id?: string | null
          is_vip?: boolean | null
          last_contact_at?: string | null
          last_name?: string | null
          last_name_encrypted?: string | null
          medical_history?: string | null
          medical_history_encrypted?: string | null
          next_recall_date?: string | null
          onboarding_completed?: boolean | null
          patient_status?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          profile_completion_status?: string
          profile_picture_url?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          uses_count?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reschedule_suggestions: {
        Row: {
          accepted_at: string | null
          accepted_slot: string | null
          business_id: string
          created_at: string
          id: string
          original_appointment_id: string
          reason: string | null
          suggested_slots: Json
          was_auto_rescheduled: boolean | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_slot?: string | null
          business_id: string
          created_at?: string
          id?: string
          original_appointment_id: string
          reason?: string | null
          suggested_slots: Json
          was_auto_rescheduled?: boolean | null
        }
        Update: {
          accepted_at?: string | null
          accepted_slot?: string | null
          business_id?: string
          created_at?: string
          id?: string
          original_appointment_id?: string
          reason?: string | null
          suggested_slots?: Json
          was_auto_rescheduled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_suggestions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_suggestions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_suggestions_original_appointment_id_fkey"
            columns: ["original_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      session_business: {
        Row: {
          business_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_business_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_business_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_recommendations: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string
          dentist_id: string
          id: string
          patient_id: string
          recommended_slots: Json
          selected_slot: string | null
          was_recommended: boolean | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string
          dentist_id: string
          id?: string
          patient_id: string
          recommended_slots: Json
          selected_slot?: string | null
          was_recommended?: boolean | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string
          dentist_id?: string
          id?: string
          patient_id?: string
          recommended_slots?: Json
          selected_slot?: string | null
          was_recommended?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "slot_recommendations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_recommendations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_recommendations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_recommendations_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_recommendations_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_recommendations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_recommendations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          customer_limit: number
          email_limit_monthly: number | null
          features: Json
          id: string
          is_active: boolean
          name: string
          phone_minutes_daily: number | null
          price_monthly: number
          price_yearly: number
          slug: string | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_limit?: number
          email_limit_monthly?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          phone_minutes_daily?: number | null
          price_monthly: number
          price_yearly: number
          slug?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_limit?: number
          email_limit_monthly?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          phone_minutes_daily?: number | null
          price_monthly?: number
          price_yearly?: number
          slug?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          dentist_id: string
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dentist_id: string
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dentist_id?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          business_id: string | null
          created_at: string
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          stack_trace: string | null
          updated_at: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_errors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_errors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
        ]
      }
      system_errors_archive: {
        Row: {
          business_id: string | null
          created_at: string
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          stack_trace: string | null
          updated_at: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tour_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          tour_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          tour_type: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          tour_type?: string
          user_id?: string
        }
        Relationships: []
      }
      treatment_plan_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          line_total_cents: number | null
          name: string
          procedure_code: string | null
          qty: number
          sort_order: number
          tooth: string | null
          treatment_plan_id: string
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          line_total_cents?: number | null
          name: string
          procedure_code?: string | null
          qty?: number
          sort_order?: number
          tooth?: string | null
          treatment_plan_id: string
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          line_total_cents?: number | null
          name?: string
          procedure_code?: string | null
          qty?: number
          sort_order?: number
          tooth?: string | null
          treatment_plan_id?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_items_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "secure_treatment_plans_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_items_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          business_id: string
          created_at: string
          created_by_dentist_id: string | null
          created_from_appointment_id: string | null
          currency: string
          dentist_id: string
          description: string | null
          description_encrypted: string | null
          diagnosis: string | null
          diagnosis_encrypted: string | null
          end_date: string | null
          estimated_cost: number | null
          estimated_duration: string | null
          estimated_duration_weeks: number | null
          id: string
          notes: string | null
          patient_id: string
          priority: string
          procedures: string[] | null
          start_date: string | null
          status: string
          target_completion_date: string | null
          title: string
          total_estimated_cents: number | null
          treatment_goals: string[] | null
          updated_at: string
          version: number
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by_dentist_id?: string | null
          created_from_appointment_id?: string | null
          currency?: string
          dentist_id: string
          description?: string | null
          description_encrypted?: string | null
          diagnosis?: string | null
          diagnosis_encrypted?: string | null
          end_date?: string | null
          estimated_cost?: number | null
          estimated_duration?: string | null
          estimated_duration_weeks?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          priority?: string
          procedures?: string[] | null
          start_date?: string | null
          status?: string
          target_completion_date?: string | null
          title: string
          total_estimated_cents?: number | null
          treatment_goals?: string[] | null
          updated_at?: string
          version?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by_dentist_id?: string | null
          created_from_appointment_id?: string | null
          currency?: string
          dentist_id?: string
          description?: string | null
          description_encrypted?: string | null
          diagnosis?: string | null
          diagnosis_encrypted?: string | null
          end_date?: string | null
          estimated_cost?: number | null
          estimated_duration?: string | null
          estimated_duration_weeks?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: string
          procedures?: string[] | null
          start_date?: string | null
          status?: string
          target_completion_date?: string | null
          title?: string
          total_estimated_cents?: number | null
          treatment_goals?: string[] | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_created_by_dentist_id_fkey"
            columns: ["created_by_dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_created_by_dentist_id_fkey"
            columns: ["created_by_dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_created_from_appointment_id_fkey"
            columns: ["created_from_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_templates: {
        Row: {
          business_id: string
          created_at: string
          created_by_dentist_id: string | null
          default_items: Json
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by_dentist_id?: string | null
          default_items?: Json
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by_dentist_id?: string | null
          default_items?: Json
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_templates_created_by_dentist_id_fkey"
            columns: ["created_by_dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_templates_created_by_dentist_id_fkey"
            columns: ["created_by_dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile_map: {
        Row: {
          profile_id: string
          user_id: string
        }
        Insert: {
          profile_id: string
          user_id: string
        }
        Update: {
          profile_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          failed_attempts: number | null
          id: string
          lockout_until: string | null
          type: string | null
          used: boolean
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          failed_attempts?: number | null
          id?: string
          lockout_until?: string | null
          type?: string | null
          used?: boolean
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          failed_attempts?: number | null
          id?: string
          lockout_until?: string | null
          type?: string | null
          used?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      providers: {
        Row: {
          average_rating: number | null
          communication_score: number | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          license_number: string | null
          profile_id: string | null
          specialization: string | null
          total_ratings: number | null
          updated_at: string | null
          wait_time_score: number | null
        }
        Insert: {
          average_rating?: number | null
          communication_score?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          license_number?: string | null
          profile_id?: string | null
          specialization?: string | null
          total_ratings?: number | null
          updated_at?: string | null
          wait_time_score?: number | null
        }
        Update: {
          average_rating?: number | null
          communication_score?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          license_number?: string | null
          profile_id?: string | null
          specialization?: string | null
          total_ratings?: number | null
          updated_at?: string | null
          wait_time_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dentists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      public_businesses_view: {
        Row: {
          custom_config: Json | null
          id: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
          tagline: string | null
          template_type: string | null
        }
        Insert: {
          custom_config?: Json | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          tagline?: string | null
          template_type?: string | null
        }
        Update: {
          custom_config?: Json | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          tagline?: string | null
          template_type?: string | null
        }
        Relationships: []
      }
      secure_profiles_view: {
        Row: {
          address: string | null
          ai_opt_out: boolean | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          medical_history: string | null
          phone: string | null
          profile_picture_url: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          ai_opt_out?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          medical_history?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          ai_opt_out?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          medical_history?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      secure_treatment_plans_view: {
        Row: {
          business_id: string | null
          created_at: string | null
          dentist_id: string | null
          description: string | null
          diagnosis: string | null
          estimated_cost: number | null
          estimated_duration: string | null
          id: string | null
          notes: string | null
          patient_id: string | null
          priority: string | null
          procedures: string[] | null
          start_date: string | null
          status: string | null
          target_completion_date: string | null
          title: string | null
          treatment_goals: string[] | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          dentist_id?: string | null
          description?: never
          diagnosis?: never
          estimated_cost?: number | null
          estimated_duration?: string | null
          id?: string | null
          notes?: string | null
          patient_id?: string | null
          priority?: string | null
          procedures?: string[] | null
          start_date?: string | null
          status?: string | null
          target_completion_date?: string | null
          title?: string | null
          treatment_goals?: string[] | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          dentist_id?: string | null
          description?: never
          diagnosis?: never
          estimated_cost?: number | null
          estimated_duration?: string | null
          id?: string | null
          notes?: string | null
          patient_id?: string | null
          priority?: string | null
          procedures?: string[] | null
          start_date?: string | null
          status?: string | null
          target_completion_date?: string | null
          title?: string | null
          treatment_goals?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "secure_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_dentist_invitation: {
        Args: { p_business_id: string; p_invitation_id: string }
        Returns: Json
      }
      assign_provider_role: { Args: never; Returns: undefined }
      book_appointment_slot:
        | {
            Args: {
              p_appointment_id: string
              p_dentist_id: string
              p_slot_date: string
              p_slot_time: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_appointment_id: string
              p_dentist_id: string
              p_slot_date: string
              p_slot_time: string
            }
            Returns: boolean
          }
      book_appointment_slots_for_duration: {
        Args: {
          p_appointment_id: string
          p_dentist_id: string
          p_duration_minutes: number
          p_slot_date: string
          p_start_time: string
        }
        Returns: boolean
      }
      calculate_patient_preferences: {
        Args: { p_business_id: string; p_patient_id: string }
        Returns: undefined
      }
      can_access_profile: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      can_modify_profile: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      can_view_profile_in_user_business: {
        Args: { _target_profile_id: string; _viewer_user_id: string }
        Returns: boolean
      }
      can_view_profile_in_user_business_norec: {
        Args: { _target_profile_id: string; _viewer_user_id: string }
        Returns: boolean
      }
      check_imaging_workflow_flags: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      check_phone_minutes_available: {
        Args: { p_business_id: string }
        Returns: {
          can_make_call: boolean
          daily_limit_seconds: number
          plan_tier: string
          remaining_seconds: number
          used_seconds: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: {
          current_count: number
          exceeded: boolean
          reset_at: string
        }[]
      }
      clean_encrypted_display: { Args: { input_text: string }; Returns: string }
      cleanup_old_audit_logs: { Args: never; Returns: Json }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      dentist_has_patient_access: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      ensure_daily_slots: {
        Args: { p_date: string; p_dentist_id: string }
        Returns: undefined
      }
      fn_can_view_profile: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      generate_appointment_slots_safe: {
        Args: { p_business_id?: string; p_date: string; p_dentist_id: string }
        Returns: undefined
      }
      generate_daily_slots: {
        Args: { p_business_id: string; p_date: string; p_dentist_id: string }
        Returns: undefined
      }
      get_all_businesses_admin: {
        Args: never
        Returns: {
          appointments_count: number
          created_at: string
          id: string
          members_count: number
          name: string
          owner_email: string
          patients_count: number
          slug: string
        }[]
      }
      get_all_users_admin: {
        Args: { search_query?: string }
        Returns: {
          businesses: Json
          email: string
          first_name: string
          last_name: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      get_appointment_imaging_status: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      get_current_business_id: { Args: never; Returns: string }
      get_daily_phone_usage: {
        Args: { p_business_id: string; p_date?: string }
        Returns: {
          included_seconds: number
          overage_cost_cents: number
          overage_seconds: number
          total_calls: number
          total_seconds: number
        }[]
      }
      get_dentist_available_slots: {
        Args: { p_business_id: string; p_date: string; p_dentist_id: string }
        Returns: {
          is_available: boolean
          slot_time: string
        }[]
      }
      get_dentist_capacity_usage: {
        Args: { p_business_id: string; p_date: string; p_dentist_id: string }
        Returns: {
          available_slots: number
          booked_slots: number
          capacity_percentage: number
          is_near_capacity: boolean
          is_overbooked: boolean
          total_slots: number
        }[]
      }
      get_dentist_patients: {
        Args: {
          p_business_id?: string
          p_cursor?: string
          p_dentist_id: string
          p_limit?: number
          p_search?: string
        }
        Returns: {
          avatar_url: string
          created_at: string
          date_of_birth: string
          email: string
          first_name: string
          has_more: boolean
          id: string
          last_name: string
          medical_history: string
          phone: string
        }[]
      }
      get_my_profile_id: { Args: never; Returns: string }
      get_system_stats: {
        Args: never
        Returns: {
          last_24h_errors: number
          total_businesses: number
          total_patients: number
          total_providers: number
          total_users: number
          unresolved_errors: number
        }[]
      }
      get_treatment_plan_details: {
        Args: { p_treatment_plan_id: string }
        Returns: Json
      }
      get_user_business_ids: { Args: never; Returns: string[] }
      get_user_profile_id: { Args: { _user_id: string }; Returns: string }
      has_active_consent: {
        Args: { p_patient_id: string; p_practice_id: string }
        Returns: boolean
      }
      has_business_access: {
        Args: { target_business_id: string }
        Returns: boolean
      }
      has_business_access_via_membership: {
        Args: { target_business_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_health_consent: {
        Args: { p_patient_id: string; p_practice_id: string }
        Returns: boolean
      }
      increment_email_count: {
        Args: { business_uuid: string }
        Returns: undefined
      }
      increment_promo_usage: { Args: { promo_id: string }; Returns: undefined }
      is_active_dentist_profile: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      is_business_member: {
        Args: { p_business_id: string; p_profile_id: string }
        Returns: boolean
      }
      is_business_owner:
        | { Args: { _business_id: string; _user_id: string }; Returns: boolean }
        | { Args: { target_business_id: string }; Returns: boolean }
      is_business_staff: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_patient: {
        Args: { _business_id: string; _profile_id: string }
        Returns: boolean
      }
      is_dentist: { Args: { _user_id: string }; Returns: boolean }
      is_dentist_patient: {
        Args: { patient_profile_id: string }
        Returns: boolean
      }
      is_dentist_patient_norec: {
        Args: { patient_profile_id: string }
        Returns: boolean
      }
      is_member_of_business: {
        Args: { target_business_id: string }
        Returns: boolean
      }
      is_member_of_business_with_role: {
        Args: { allowed_roles: string[]; target_business_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_user_business_member: { Args: { _user_id: string }; Returns: boolean }
      is_user_member_of_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      leave_clinic: { Args: { p_business_id?: string }; Returns: Json }
      log_super_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: undefined
      }
      process_gdpr_deletion: { Args: { target_user_id: string }; Returns: Json }
      regenerate_daily_slots: {
        Args: { p_business_id: string; p_date: string; p_dentist_id: string }
        Returns: undefined
      }
      release_appointment_slot: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      release_appointment_slots: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      reschedule_appointment: {
        Args: {
          p_appointment_id: string
          p_slot_date: string
          p_slot_time: string
          p_user_id: string
        }
        Returns: boolean
      }
      viewer_profile_id: { Args: { _viewer_user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "provider"
        | "customer"
        | "staff"
        | "patient"
        | "waiter"
        | "cook"
        | "host"
        | "manager"
        | "super_admin"
      appointment_type_category:
        | "checkup"
        | "cleaning"
        | "filling"
        | "extraction"
        | "root_canal"
        | "crown"
        | "whitening"
        | "orthodontics"
        | "emergency"
        | "consultation"
        | "other"
      imaging_type: "xray" | "photo" | "scan" | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "provider",
        "customer",
        "staff",
        "patient",
        "waiter",
        "cook",
        "host",
        "manager",
        "super_admin",
      ],
      appointment_type_category: [
        "checkup",
        "cleaning",
        "filling",
        "extraction",
        "root_canal",
        "crown",
        "whitening",
        "orthodontics",
        "emergency",
        "consultation",
        "other",
      ],
      imaging_type: ["xray", "photo", "scan", "unknown"],
    },
  },
} as const
