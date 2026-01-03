import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Handle GET requests with query parameters
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');
      
      if (!action) {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Database API v1',
            documentation: 'See README.md for usage examples',
            available_actions: {
              read_only_get: ['read_table', 'list_appointments', 'search_patients', 'lookup_patient_by_phone', 'search_dentists', 'get_available_times'],
              all_actions_post: ['read_table', 'insert_record', 'update_record', 'delete_record', 'list_appointments', 'create_appointment', 'update_appointment', 'delete_appointment', 'search_patients', 'lookup_patient_by_phone', 'search_dentists', 'custom_query']
            },
            example: '?action=search_patients&name=John'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert all query params to object
      const params: any = {};
      url.searchParams.forEach((value, key) => {
        if (key !== 'action') {
          params[key] = value;
        }
      });

      let result;

      // Only support read operations via GET
      switch (action) {
        case 'read_table': {
          const { table, columns = '*', limit = 100 } = params;
          let query = supabase.from(table).select(columns);
          
          // Apply filters from query params
          Object.entries(params).forEach(([key, value]) => {
            if (!['table', 'columns', 'limit', 'order_by', 'ascending'].includes(key)) {
              query = query.eq(key, value);
            }
          });

          if (params.order_by) {
            query = query.order(params.order_by, { ascending: params.ascending !== 'false' });
          }
          query = query.limit(Number(limit));

          const { data, error } = await query;
          if (error) throw error;
          result = { success: true, data };
          break;
        }

        case 'list_appointments': {
          const { business_id, dentist_id, patient_id, status, date_from, date_to, limit = 50 } = params;
          let query = supabase.from('appointments').select('id, patient_id, dentist_id, appointment_date, reason, notes, status, urgency, duration_minutes, created_at, updated_at, business_id');

          if (business_id) query = query.eq('business_id', business_id);
          if (dentist_id) query = query.eq('dentist_id', dentist_id);
          if (patient_id) query = query.eq('patient_id', patient_id);
          if (status) query = query.eq('status', status);
          if (date_from) query = query.gte('appointment_date', date_from);
          if (date_to) query = query.lte('appointment_date', date_to);

          query = query.order('appointment_date', { ascending: true }).limit(Number(limit));

          const { data, error } = await query;
          if (error) throw error;
          result = { success: true, data };
          break;
        }

        case 'search_patients': {
          const { name, id, phone, dob, email, business_id, limit = 50 } = params;
          let query = supabase
            .from('profiles')
            .select(`
              id,
              first_name,
              last_name,
              email,
              phone,
              date_of_birth,
              address,
              medical_history,
              created_at
            `);

          if (id) query = query.eq('id', id);
          if (phone) query = query.ilike('phone', `%${phone}%`);
          if (email) query = query.ilike('email', `%${email}%`);
          if (dob) query = query.eq('date_of_birth', dob);
          if (name) query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);

          query = query.limit(Number(limit));

          const { data: patients, error } = await query;
          if (error) throw error;

          // Optimized: Fetch all last appointments in a single query instead of N+1
          if (patients && patients.length > 0) {
            const patientIds = patients.map((p: any) => p.id);

            // Fetch all last appointments in one query
            const { data: lastAppointments } = await supabase
              .from('appointments')
              .select(`
                patient_id,
                dentist_id,
                appointment_date,
                business_id,
                dentists!inner(
                  id,
                  first_name,
                  last_name,
                  email,
                  specialization,
                  profile_picture_url
                )
              `)
              .in('patient_id', patientIds)
              .order('appointment_date', { ascending: false });

            // Create a map of patient_id -> last appointment
            const lastApptMap = new Map<string, any>();
            if (lastAppointments) {
              for (const appt of lastAppointments) {
                // Only keep the most recent appointment for each patient
                if (!lastApptMap.has(appt.patient_id)) {
                  lastApptMap.set(appt.patient_id, appt);
                }
              }
            }

            // Assign last appointment data to each patient
            for (const patient of patients) {
              const lastAppt = lastApptMap.get((patient as any).id);
              if (lastAppt) {
                (patient as any).last_dentist = lastAppt.dentists;
                (patient as any).last_appointment_date = lastAppt.appointment_date;
                (patient as any).last_business_id = lastAppt.business_id;
              }
            }
          }

          result = { success: true, data: patients };
          break;
        }

        case 'lookup_patient_by_phone': {
          const { phone } = params;
          
          const { data: patient, error } = await supabase
            .from('profiles')
            .select(`
              id,
              first_name,
              last_name,
              email,
              phone,
              date_of_birth
            `)
            .eq('phone', phone)
            .maybeSingle();

          if (error) throw error;

          if (patient) {
            const { data: lastAppt } = await supabase
              .from('appointments')
              .select(`
                dentist_id,
                appointment_date,
                dentists!inner(
                  first_name,
                  last_name
                )
              `)
              .eq('patient_id', patient.id)
              .order('appointment_date', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastAppt) {
              (patient as any).last_dentist = lastAppt.dentists;
            }
          }

          result = { 
            success: true, 
            data: patient,
            found: !!patient 
          };
          break;
        }

        case 'search_dentists': {
          const { name, specialization, business_id, is_active = 'true', limit = 50 } = params;
          
          let query = supabase
            .from('dentists')
            .select(`
              id,
              first_name,
              last_name,
              email,
              specialization,
              profile_picture_url,
              average_rating,
              total_ratings,
              is_active,
              profiles!inner(
                bio,
                phone
              )
            `)
            .eq('is_active', is_active === 'true');

          if (name) query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
          if (specialization) query = query.ilike('specialization', `%${specialization}%`);

          query = query.limit(Number(limit));

          const { data: dentists, error } = await query;
          if (error) throw error;

          if (business_id && dentists) {
            const { data: businessMembers } = await supabase
              .from('provider_business_map')
              .select('provider_id')
              .eq('business_id', business_id);

            const providerIds = new Set(businessMembers?.map(m => m.provider_id) || []);
            const filtered = dentists.filter(d => providerIds.has(d.id));
            result = { success: true, data: filtered };
          } else {
            result = { success: true, data: dentists };
          }
          break;
        }

        case 'get_available_times': {
          const { dentist_id, date, business_id } = params;

          if (!dentist_id || !date) {
            return new Response(
              JSON.stringify({ success: false, error: 'Missing required parameters: dentist_id and date' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Get available slots for the date
          let slotsQuery = supabase
            .from('appointment_slots')
            .select('*')
            .eq('dentist_id', dentist_id)
            .eq('slot_date', date)
            .eq('is_available', true)
            .order('slot_time', { ascending: true });

          if (business_id) {
            slotsQuery = slotsQuery.eq('business_id', business_id);
          }

          const { data: slots, error: slotsError } = await slotsQuery;
          if (slotsError) throw slotsError;

          // Get dentist info
          const { data: dentist, error: dentistError } = await supabase
            .from('dentists')
            .select(`
              id,
              first_name,
              last_name,
              specialization,
              profiles!inner(bio)
            `)
            .eq('id', dentist_id)
            .maybeSingle();

          if (dentistError) throw dentistError;

          result = { 
            success: true, 
            data: {
              dentist: dentist,
              date: date,
              available_slots: slots || [],
              total_available: slots?.length || 0
            }
          };
          break;
        }

        default:
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Action "${action}" not supported via GET. Use POST for write operations.` 
            }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Database API GET error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Handle POST requests with JSON body
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Request body is required. Please provide a JSON payload with an "action" field.',
          available_actions: {
            read_only_get: ['read_table', 'list_appointments', 'search_patients', 'lookup_patient_by_phone', 'search_dentists', 'get_available_times'],
            all_actions_post: ['read_table', 'insert_record', 'update_record', 'delete_record', 'list_appointments', 'create_appointment', 'update_appointment', 'delete_appointment', 'search_patients', 'lookup_patient_by_phone', 'search_dentists', 'get_available_times', 'custom_query']
          },
          example: { action: 'search_patients', name: 'John' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse JSON and handle ElevenLabs webhook format (wrapped in body key)
    const parsed = JSON.parse(text);
    const incoming: any = parsed.body ?? parsed;
    
    console.log('RAW:', text);
    console.log('PARSED:', JSON.stringify(incoming));
    
    // Extract and allow inference when action is missing
    // Extract and normalize action, allow inference when missing
    const actionRaw = (incoming?.action ?? '') as string;
    let action = actionRaw ? actionRaw.toString().trim() : undefined;
    // Build params and remove action field
    let params: any = { ...incoming };
    delete params.action;

    // Some agents may send the action as a key instead of a value
    if (!action) {
      const known = new Set([
        'read_table', 'list_appointments', 'create_appointment', 'update_appointment', 'delete_appointment',
        'search_patients', 'lookup_patient_by_phone', 'search_dentists', 'get_available_times', 'custom_query',
        'execute_query', 'get_patient'
      ]);
      for (const k of Object.keys(incoming || {})) {
        const key = (k || '').toString().trim();
        if (known.has(key)) { action = key; break; }
      }
    }

    // Heuristic: infer common actions for ElevenLabs agent payloads
    const hasAppointmentCore =
      !!params.patient_id && !!params.dentist_id && !!(params.appointment_date || params.date || params.time);

    if (!action && hasAppointmentCore) {
      action = 'create_appointment';
      // Normalize appointment_date if split into date/time
      if (!params.appointment_date && params.date && params.time) {
        params.appointment_date = `${params.date} ${params.time}`;
      }
    }

    // If still no action, attempt read_table if table specified
    if (!action && params.table) {
      action = 'read_table';
    }

    // For create_appointment, try to infer business_id if missing from dentist context
    if (action === 'create_appointment' && !params.business_id && params.dentist_id) {
      // Try dentist_availability then appointment_slots
      const { data: avail } = await supabase
        .from('dentist_availability')
        .select('business_id')
        .eq('dentist_id', params.dentist_id)
        .limit(1);
      const inferredBusinessId =
        avail?.[0]?.business_id ||
        (await supabase
          .from('appointment_slots')
          .select('business_id')
          .eq('dentist_id', params.dentist_id)
          .limit(1)).data?.[0]?.business_id;

      if (inferredBusinessId) {
        params.business_id = inferredBusinessId;
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing required field: business_id and could not infer from dentist_id',
            hint: 'Include business_id or ensure dentist has availability or slots configured to infer it automatically.',
            received: params,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!action) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required field: action',
          hint: 'We attempted to infer the action but could not. Provide "action" or include patient_id, dentist_id, and appointment_date to create an appointment.',
          available_actions: {
            read_only_get: ['read_table', 'list_appointments', 'search_patients', 'lookup_patient_by_phone', 'search_dentists', 'get_available_times'],
            all_actions_post: ['read_table', 'insert_record', 'update_record', 'delete_record', 'list_appointments', 'create_appointment', 'update_appointment', 'delete_appointment', 'search_patients', 'lookup_patient_by_phone', 'search_dentists', 'get_available_times', 'custom_query'],
          },
          example: { action: 'search_patients', name: 'John' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      // Read any table
      case 'read_table': {
        const { table, columns = '*', filter, order_by, ascending = true, limit = 100 } = params;
        let query = supabase.from(table).select(columns);

        if (filter) {
          Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        if (order_by) {
          query = query.order(order_by, { ascending });
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        result = { success: true, data };
        break;
      }

      // Create appointment
      case 'create_appointment': {
        const { patient_id, dentist_id, business_id, appointment_date, reason, status, urgency, duration_minutes, notes } = params;
        const { data, error } = await supabase
          .from('appointments')
          .insert({
            patient_id,
            dentist_id,
            business_id,
            appointment_date,
            reason: reason || 'General consultation',
            status: status || 'pending',
            urgency: urgency || 'medium',
            duration_minutes: duration_minutes || 60,
            notes,
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, data };
        break;
      }

      // Update appointment
      case 'update_appointment': {
        const { appointment_id, updates } = params;
        const { data, error } = await supabase
          .from('appointments')
          .update(updates)
          .eq('id', appointment_id)
          .select()
          .single();

        if (error) throw error;
        result = { success: true, data };
        break;
      }

      // Delete appointment
      case 'delete_appointment': {
        const { appointment_id } = params;
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('id', appointment_id);

        if (error) throw error;
        result = { success: true, message: `Appointment ${appointment_id} deleted` };
        break;
      }

      // List appointments with filters
      case 'list_appointments': {
        const { business_id, dentist_id, patient_id, status, date_from, date_to, limit = 50 } = params;
        let query = supabase.from('appointments').select('*');

        if (business_id) query = query.eq('business_id', business_id);
        if (dentist_id) query = query.eq('dentist_id', dentist_id);
        if (patient_id) query = query.eq('patient_id', patient_id);
        if (status) query = query.eq('status', status);
        if (date_from) query = query.gte('appointment_date', date_from);
        if (date_to) query = query.lte('appointment_date', date_to);

        query = query.order('appointment_date', { ascending: true }).limit(limit);

        const { data, error } = await query;
        if (error) throw error;
        result = { success: true, data };
        break;
      }

      // Get available appointment times for a dentist on a given date
      case 'get_available_times': {
        const dentist_id = params.dentist_id;
        const rawDate = params.date || params.slot_date;
        const business_id = params.business_id;

        if (!dentist_id || !rawDate) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required parameters: dentist_id and date' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const normalizeDate = (d: string) => {
          const s = String(d);
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
          const parsed = new Date(s);
          if (isNaN(parsed.getTime())) throw new Error(`Invalid date format: ${s}`);
          return parsed.toISOString().slice(0, 10);
        };

        const dateStr = normalizeDate(rawDate);

        // Ensure slots exist for that day (idempotent)
        await supabase.rpc('ensure_daily_slots', { p_dentist_id: dentist_id, p_date: dateStr });

        let slotsQuery = supabase
          .from('appointment_slots')
          .select('*')
          .eq('dentist_id', dentist_id)
          .eq('slot_date', dateStr)
          .eq('is_available', true)
          .order('slot_time', { ascending: true });

        if (business_id) slotsQuery = slotsQuery.eq('business_id', business_id);

        const { data: slots, error: slotsError } = await slotsQuery;
        if (slotsError) throw slotsError;

        const { data: dentist } = await supabase
          .from('dentists')
          .select('id, first_name, last_name, specialization, profiles!inner(bio)')
          .eq('id', dentist_id)
          .maybeSingle();

        result = {
          success: true,
          data: {
            dentist,
            date: dateStr,
            available_slots: slots || [],
            total_available: slots?.length || 0,
          },
        };
        break;
      }

      // Execute custom SQL SELECT query
      case 'execute_query': {
        const { query } = params;
        if (!query.trim().toUpperCase().startsWith('SELECT')) {
          throw new Error('Only SELECT queries are allowed');
        }

        const { data, error } = await supabase.rpc('exec_sql', { query });
        if (error) throw error;
        result = { success: true, data };
        break;
      }

      // Get table schema
      case 'get_table_schema': {
        const { table } = params;
        const { data, error } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_name', table)
          .eq('table_schema', 'public');

        if (error) throw error;
        result = { success: true, data };
        break;
      }

      // Insert record
      case 'insert_record': {
        const { table, data: recordData } = params;
        const { data, error } = await supabase
          .from(table)
          .insert(recordData)
          .select()
          .single();

        if (error) throw error;
        result = { success: true, data };
        break;
      }

      // Update record
      case 'update_record': {
        const { table, id, data: recordData } = params;
        const { data, error } = await supabase
          .from(table)
          .update(recordData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        result = { success: true, data };
        break;
      }

      // Delete record
      case 'delete_record': {
        const { table, id } = params;
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) throw error;
        result = { success: true, message: `Record ${id} deleted from ${table}` };
        break;
      }

      // Search patients
      case 'search_patients': {
        const { name, id, phone, dob, email, business_id, limit = 50 } = params;
        let query = supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            address,
            medical_history,
            created_at
          `);

        if (id) {
          query = query.eq('id', id);
        }
        if (phone) {
          query = query.ilike('phone', `%${phone}%`);
        }
        if (email) {
          query = query.ilike('email', `%${email}%`);
        }
        if (dob) {
          query = query.eq('date_of_birth', dob);
        }
        if (name) {
          query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
        }

        query = query.limit(limit);

        const { data: patients, error } = await query;
        if (error) throw error;

        // Get last dentist used for each patient
        if (patients && patients.length > 0) {
          for (const patient of patients) {
            const { data: lastAppt } = await supabase
              .from('appointments')
              .select(`
                dentist_id,
                appointment_date,
                business_id,
                dentists!inner(
                  id,
                  first_name,
                  last_name,
                  email,
                  specialization,
                  profile_picture_url
                )
              `)
              .eq('patient_id', patient.id)
              .order('appointment_date', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastAppt) {
              (patient as any).last_dentist = lastAppt.dentists;
              (patient as any).last_appointment_date = lastAppt.appointment_date;
              (patient as any).last_business_id = lastAppt.business_id;
            }
          }
        }

        result = { success: true, data: patients };
        break;
      }

      // Get patient by ID with full details
      case 'get_patient': {
        const { patient_id } = params;
        
        // Get patient profile
        const { data: patient, error: patientError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', patient_id)
          .single();

        if (patientError) throw patientError;

        // Get appointment history
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            status,
            reason,
            notes,
            business_id,
            dentists!inner(
              id,
              first_name,
              last_name,
              specialization
            ),
            businesses!inner(
              id,
              name,
              slug
            )
          `)
          .eq('patient_id', patient_id)
          .order('appointment_date', { ascending: false })
          .limit(10);

        // Get medical records
        const { data: medicalRecords } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', patient_id)
          .order('record_date', { ascending: false })
          .limit(10);

        // Get patient preferences
        const { data: preferences } = await supabase
          .from('patient_preferences')
          .select('*')
          .eq('patient_id', patient_id)
          .maybeSingle();

        result = {
          success: true,
          data: {
            patient,
            appointments,
            medical_records: medicalRecords,
            preferences,
          },
        };
        break;
      }

      // Get dentist by ID with full bio and stats
      case 'get_dentist': {
        const { dentist_id } = params;

        // Get dentist details
        const { data: dentist, error: dentistError } = await supabase
          .from('dentists')
          .select(`
            id,
            first_name,
            last_name,
            email,
            specialization,
            license_number,
            profile_picture_url,
            clinic_address,
            average_rating,
            total_ratings,
            expertise_score,
            communication_score,
            wait_time_score,
            is_active,
            created_at,
            profiles!inner(
              bio,
              phone,
              address
            )
          `)
          .eq('id', dentist_id)
          .single();

        if (dentistError) throw dentistError;

        // Get businesses they work at
        const { data: businesses } = await supabase
          .from('provider_business_map')
          .select(`
            business_id,
            role,
            businesses!inner(
              id,
              name,
              slug,
              specialty_type,
              logo_url,
              tagline
            )
          `)
          .eq('provider_id', dentist.id);

        // Get availability
        const { data: availability } = await supabase
          .from('dentist_availability')
          .select('*')
          .eq('dentist_id', dentist_id)
          .eq('is_available', true)
          .order('day_of_week');

        // Get capacity settings
        const { data: capacity } = await supabase
          .from('dentist_capacity_settings')
          .select('*')
          .eq('dentist_id', dentist_id)
          .maybeSingle();

        // Get upcoming appointments count
        const { count: upcomingCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('dentist_id', dentist_id)
          .gte('appointment_date', new Date().toISOString())
          .eq('status', 'confirmed');

        result = {
          success: true,
          data: {
            dentist,
            businesses,
            availability,
            capacity_settings: capacity,
            upcoming_appointments: upcomingCount || 0,
          },
        };
        break;
      }

      // Search dentists
      case 'search_dentists': {
        const { name, specialization, business_id, is_active = true, limit = 50 } = params;
        
        let query = supabase
          .from('dentists')
          .select(`
            id,
            first_name,
            last_name,
            email,
            specialization,
            profile_picture_url,
            average_rating,
            total_ratings,
            is_active,
            profiles!inner(
              bio,
              phone
            )
          `)
          .eq('is_active', is_active);

        if (name) {
          query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
        }
        if (specialization) {
          query = query.ilike('specialization', `%${specialization}%`);
        }

        query = query.limit(limit);

        const { data: dentists, error } = await query;
        if (error) throw error;

        // Filter by business if needed
        if (business_id && dentists) {
          const { data: businessMembers } = await supabase
            .from('provider_business_map')
            .select('provider_id')
            .eq('business_id', business_id);

          const providerIds = new Set(businessMembers?.map(m => m.provider_id) || []);
          const filtered = dentists.filter(d => {
            // Need to match dentist profile_id with provider_id
            return providerIds.has(d.id);
          });

          result = { success: true, data: filtered };
        } else {
          result = { success: true, data: dentists };
        }
        break;
      }

      // Lookup patient by phone (for voice AI)
      case 'lookup_patient_by_phone': {
        const { phone } = params;
        
        const { data: patient, error } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth
          `)
          .eq('phone', phone)
          .maybeSingle();

        if (error) throw error;

        if (patient) {
          // Get last appointment
          const { data: lastAppt } = await supabase
            .from('appointments')
            .select(`
              dentist_id,
              appointment_date,
              dentists!inner(
                first_name,
                last_name
              )
            `)
            .eq('patient_id', patient.id)
            .order('appointment_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastAppt) {
            (patient as any).last_dentist = lastAppt.dentists;
          }
        }

        result = { 
          success: true, 
          data: patient,
          found: !!patient 
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Database API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
