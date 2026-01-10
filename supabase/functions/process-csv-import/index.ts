import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

interface CSVRow {
  [key: string]: string;
}

interface ImportRequest {
  csvData: string;
  fieldMapping: Record<string, string>;
  importType: 'patients' | 'appointments' | 'inventory';
  dentistId: string;
  filename: string;
  sendEmails?: boolean;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  console.log(`${req.method} request received from ${req.headers.get('origin')} at ${new Date().toISOString()}`);
  
  // Handle CORS preflight requests
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Log request headers for debugging
    console.log('Request headers:', {
      'content-type': req.headers.get('content-type'),
      'authorization': req.headers.get('authorization') ? 'present' : 'missing',
      'x-client-info': req.headers.get('x-client-info') ? 'present' : 'missing',
      'apikey': req.headers.get('apikey') ? 'present' : 'missing'
    });

    // Validate request body
    const requestBody = await req.text();
    console.log('Request body length:', requestBody.length);
    
    if (!requestBody) {
      return new Response(JSON.stringify({ error: 'Request body is empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let parsedBody: ImportRequest;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      const parseErrorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: parseErrorMessage 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { csvData, fieldMapping, importType, dentistId, filename, sendEmails } = parsedBody;

    // Validate required fields
    if (!csvData || !fieldMapping || !importType || !dentistId || !filename) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        required: ['csvData', 'fieldMapping', 'importType', 'dentistId', 'filename'],
        received: Object.keys(parsedBody)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use service role key for system-level operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Import request received:', {
      importType,
      dentistId,
      filename,
      fieldMappingKeys: Object.keys(fieldMapping),
      csvDataLength: csvData.length
    });

    // Create import session
    console.log('Creating import session with:', {
      dentist_id: dentistId,
      filename,
      import_type: importType,
      field_mapping: fieldMapping,
      status: 'processing'
    });

    const { data: importSession, error: sessionError } = await supabase
      .from('import_sessions')
      .insert({
        dentist_id: dentistId,
        filename,
        import_type: importType,
        field_mapping: fieldMapping,
        status: 'processing',
        created_by_user_id: req.headers.get('x-user-id')
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create import session:', sessionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create import session',
        details: sessionError.message,
        code: sessionError.code
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Import session created:', importSession);

    // Parse CSV data
    const rows = parseCSV(csvData);
    const totalRecords = rows.length;
    
    console.log(`Parsed ${totalRecords} rows from CSV`);

    // Update session with total count
    await supabase
      .from('import_sessions')
      .update({ total_records: totalRecords })
      .eq('id', importSession.id);

    let successCount = 0;
    let failureCount = 0;
    const errors: any[] = [];

    // Process each row based on import type
    if (importType === 'patients') {
      const seenEmails = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i];
          const profileData = mapRowToProfile(row, fieldMapping);
          
          console.log(`Processing row ${i + 1}:`, { profileData });

          // Guard against invalid or duplicate emails in the CSV
          const normalizedEmail = (profileData.email || '').toString().trim().toLowerCase();
          if (!normalizedEmail || !normalizedEmail.includes('@')) {
            console.warn('Skipping invite: invalid email for profile at row', i + 1, profileData.email);
            errors.push({ row: i + 1, error: `Invalid email: ${profileData.email || '(empty)'}`, data: row });
            failureCount++;
            continue;
          }
          if (seenEmails.has(normalizedEmail)) {
            console.warn('Skipping invite: duplicate email in CSV at row', i + 1, normalizedEmail);
            errors.push({ row: i + 1, error: `Duplicate email in CSV: ${normalizedEmail}` , data: row });
            failureCount++;
            continue;
          }
          seenEmails.add(normalizedEmail);
          
          // Check if profile already exists by email
          const { data: existing, error: existingError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', profileData.email)
            .maybeSingle();
          
          if (existingError) {
            console.error('Error checking existing profile:', existingError);
          }

          if (existing) {
            errors.push({
              row: i + 1,
              error: `Profile with email ${profileData.email} already exists`,
              data: row
            });
            failureCount++;
            continue;
          }

          // Create profile with incomplete status for imported patients
          const insertData = {
            ...profileData,
            import_session_id: importSession.id,
            profile_completion_status: 'incomplete',
            role: 'patient',
            user_id: null // Explicitly set to null for imported patients
          };
          
          console.log(`Inserting profile for row ${i + 1}:`, insertData);
          
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert(insertData)
            .select('id, email, first_name, last_name')
            .single();

          if (profileError) {
            console.error('Profile creation error:', profileError);
            errors.push({
              row: i + 1,
              error: profileError.message,
              data: row
            });
            failureCount++;
          } else {
            console.log(`Profile created successfully:`, newProfile);
            
          // Generate invitation token for the new profile
            try {
              const { data: tokenData, error: tokenError } = await supabase
                .rpc('create_invitation_token_with_cleanup', {
                  p_profile_id: newProfile.id,
                  p_email: newProfile.email,
                  p_expires_hours: 72
                });

              if (tokenError) {
                console.error('Failed to create invitation token:', tokenError);
              } else {
                console.log('Invitation token created:', tokenData);
                
                // Optionally send invitation email immediately if requested
                if (sendEmails === true) {
                  try {
                    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';
                    const invitationLink = `${siteUrl}/invite?token=${tokenData}`;

                    const subject = 'Welcome to DentiBot — set your password';
                    const authHeader = req.headers.get('authorization') || '';
                    const functionUrl = `${supabaseUrl}/functions/v1/send-email-notification`;

                    const message = [
                      `<p>Hi ${newProfile.first_name || ''} ${newProfile.last_name || ''},</p>`,
                      `<p>Your profile has been created. Click below to set your password and claim your account.</p>`,
                      `<p><a href="${invitationLink}">Set up your password</a></p>`,
                      `<p>If you didn’t request this, you can ignore this email.</p>`
                    ].join('');
                    const emailPayload = {
                      to: newProfile.email,
                      subject,
                      message,
                      messageType: 'system',
                      isSystemNotification: true,
                      patientId: newProfile.id ?? null,
                      dentistId: null
                    };

                    const emailResponse = await fetch(functionUrl, {
                      method: 'POST',
                      headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(emailPayload)
                    });

                    if (!emailResponse.ok) {
                      const errorText = await emailResponse.text().catch(() => '');
                      console.error('Invitation email failed:', emailResponse.status, errorText);
                    } else {
                      const mailData = await emailResponse.json().catch(() => ({}));
                      console.log('Invitation email sent:', mailData);
                    }
                  } catch (emailError) {
                    console.error('Error sending invitation email:', emailError);
                  }
                }
              }
            } catch (tokenError) {
              console.error('Error creating invitation token:', tokenError);
            }
            
            successCount++;
          }
        } catch (error) {
          console.error('Row processing error:', error);
          const rowErrorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            row: i + 1,
            error: rowErrorMessage,
            data: rows[i]
          });
          failureCount++;
        }
      }
    }

    // Update final session status
    const finalStatus = failureCount === totalRecords ? 'failed' : 'completed';
    await supabase
      .from('import_sessions')
      .update({
        successful_records: successCount,
        failed_records: failureCount,
        status: finalStatus,
        error_details: errors,
        completed_at: new Date().toISOString()
      })
      .eq('id', importSession.id);

    console.log(`Import completed: ${successCount}/${totalRecords} successful`);

    return new Response(JSON.stringify({
      success: true,
      sessionId: importSession.id,
      totalRecords,
      successCount,
      failureCount,
      status: finalStatus,
      errors: errors.slice(0, 10) // Return first 10 errors for preview
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Import processing error:', error);
    
    // Return a more detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorResponse = {
      error: 'Import processing failed',
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function parseCSV(csvData: string): CSVRow[] {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }

  return rows;
}

function mapRowToProfile(row: CSVRow, fieldMapping: Record<string, string>): any {
  const profile: any = {};
  
  // Map fields based on field mapping configuration
  Object.entries(fieldMapping).forEach(([csvField, profileField]) => {
    if (row[csvField]) {
      if (profileField === 'date_of_birth' && row[csvField]) {
        // Handle date format conversion
        const dateValue = new Date(row[csvField]);
        if (!isNaN(dateValue.getTime())) {
          profile[profileField] = dateValue.toISOString().split('T')[0];
        }
      } else {
        profile[profileField] = row[csvField].trim();
      }
    }
  });

  // Ensure required fields have values
  if (!profile.email) {
    throw new Error('Email is required for profile creation');
  }

  // Don't set user_id for imported patients - they'll get it when they register
  
  return profile;
}