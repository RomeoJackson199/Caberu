import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendSms } from '../_shared/sms.ts';
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from '../_shared/whatsapp.ts';
import { checkRateLimitMemory, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';
const BUSINESS_TIMEZONE = 'Europe/Brussels';
function getBrusselsOffset(dateStr: string): string { const d = new Date(dateStr + 'T12:00:00Z'); const parts = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIMEZONE, hour: 'numeric', hour12: false }).formatToParts(d); const hourPart = parts.find(p => p.type === 'hour'); const brusselsHour = hourPart ? parseInt(hourPart.value, 10) : 13; const offsetHours = brusselsHour - 12; return `${offsetHours >= 0 ? '+' : '-'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`; }
function getBrusselsNow(): { year: number; month: number; day: number; dow: number } { const parts = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long' }).formatToParts(new Date()); let y=0,m=0,d=0,dn=''; for (const p of parts) { if (p.type==='year') y=parseInt(p.value); if (p.type==='month') m=parseInt(p.value); if (p.type==='day') d=parseInt(p.value); if (p.type==='weekday') dn=p.value; } const dm: Record<string,number> = {Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6}; return {year:y,month:m,day:d,dow:dm[dn]??0}; }
function maskPhone(p: string): string { if (!p || p.length < 4) return p || ''; return p.slice(0,-2).replace(/\d/g,'X') + p.slice(-2); }

// ── Google Calendar sync (fire-and-forget after booking) ─────────────────────
async function syncAppointmentToCalendar(supabase: any, appointmentId: string): Promise<void> {
  try {
    const googleClientId     = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!googleClientId || !googleClientSecret) { console.log('Google Calendar: credentials not configured, skipping sync'); return; }
    const { data: apt, error: aptErr } = await supabase
      .from('appointments_decrypted')
      .select(`*, dentists!inner(profile_id, google_calendar_refresh_token, google_calendar_connected, google_calendar_sync_direction, google_calendar_id), profiles!appointments_patient_id_fkey(first_name, last_name, email, phone), business_services(name), businesses!appointments_business_id_fkey(name, address)`)
      .eq('id', appointmentId).single();
    if (aptErr || !apt) { console.log('Google Calendar: appointment not found for sync'); return; }
    const dentist = apt.dentists;
    if (!dentist.google_calendar_connected || !dentist.google_calendar_refresh_token) { console.log('Google Calendar: dentist has not connected calendar, skipping'); return; }
    const syncDir = dentist.google_calendar_sync_direction || 'both';
    if (syncDir === 'google_to_practice') { console.log('Google Calendar: sync direction is google_to_practice only, skipping'); return; }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: dentist.google_calendar_refresh_token, client_id: googleClientId, client_secret: googleClientSecret, grant_type: 'refresh_token' }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) { console.error('Google Calendar: failed to refresh access token'); return; }
    const patient  = apt.profiles;
    const business = apt.businesses;
    const serviceName = apt.business_services?.name || null;
    const calendarId  = encodeURIComponent(dentist.google_calendar_id || 'primary');
    const startTime = new Date(apt.appointment_date);
    const endTime   = new Date(startTime.getTime() + (apt.duration_minutes || 60) * 60000);
    const detailLabel = [serviceName, apt.reason].filter(Boolean).join(' — ') || 'Appointment';
    const contactInfo = patient?.phone ? `Phone: ${patient.phone}` : `Email: ${patient?.email}`;
    const descriptionLines = [`Patient: ${patient?.first_name} ${patient?.last_name}`, contactInfo, serviceName ? `Service: ${serviceName}` : null, apt.reason ? `Reason: ${apt.reason}` : null, `Status: ${apt.status}`, apt.notes ? `Notes: ${apt.notes}` : null].filter(Boolean).join('\n');
    const event: Record<string, unknown> = {
      summary: `${patient?.first_name} ${patient?.last_name} - ${detailLabel}`,
      description: descriptionLines,
      start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
      end:   { dateTime: endTime.toISOString(),   timeZone: 'UTC' },
      colorId: '9',
      extendedProperties: { private: { appointmentId } },
    };
    if (business?.address) event.location = business.address;
    const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    const calData = await calRes.json();
    if (!calRes.ok) { console.error('Google Calendar: event creation failed', calData); return; }
    console.log(`Google Calendar: event created for appointment ${appointmentId}, gcal id: ${calData.id}`);
  } catch (err) {
    console.error('Google Calendar sync error (non-fatal):', err instanceof Error ? err.message : err);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const raw = await req.text(); let incoming: any; try { incoming = raw ? JSON.parse(raw) : {}; } catch { incoming = {}; }
    const body = (incoming && typeof incoming === 'object' && 'body' in incoming && incoming.body) ? incoming.body : incoming;
    const rlBusinessId = body?.business_id || 'unknown'; const rlCallSid = body?.call_sid || 'nosid';
    const rl = checkRateLimitMemory(`${rlBusinessId}_${rlCallSid}`, { ...RATE_LIMITS.VOICE_AI, maxRequests: 300 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
    const businessIdForLimit = body?.business_id;
    if (businessIdForLimit && businessIdForLimit !== 'lookup') { const lc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!); const { data: ld } = await lc.rpc('check_phone_minutes_available', { p_business_id: businessIdForLimit }); if (ld?.[0]?.remaining_seconds <= 0) return new Response(JSON.stringify({ error: 'Phone minutes limit exceeded', limit_exceeded: true }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const action = body?.action;
    if (action) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const bid = body.business_id || null; const aPhone = body.phone || body.patient_phone || body.caller_phone || null;
      switch (action) {
        case 'lookup_business': { const ph = body.phone; if (!ph) return new Response(JSON.stringify({error:'phone required'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); const {data:bp} = await supabase.from('business_phone_numbers').select('business_id, businesses!inner(id, name)').eq('phone_number',ph).eq('is_active',true).maybeSingle(); if (bp?.business_id) return new Response(JSON.stringify({business_id:bp.business_id,business_name:(bp as any).businesses?.name||''}),{headers:{...corsHeaders,'Content-Type':'application/json'}}); return new Response(JSON.stringify({error:'Business not found'}),{status:404,headers:{...corsHeaders,'Content-Type':'application/json'}}); }

        case 'get_business_context': {
          if (!bid) return new Response(JSON.stringify({error:'business_id required'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}});
          // Fetch business info, all active services, AND which service_ids have at least one dentist assigned
          const [{data:biz},{data:svcs},{data:ds}] = await Promise.all([
            supabase.from('businesses').select('id,name,specialty_type,ai_instructions,ai_greeting,business_hours,tagline,bio').eq('id',bid).maybeSingle(),
            supabase.from('business_services').select('id,name,duration_minutes,description,price_cents').eq('business_id',bid).eq('is_active',true).order('name'),
            supabase.from('dentist_services').select('service_id').eq('business_id',bid).eq('is_active',true),
          ]);
          // Only expose services that have at least one active dentist assigned
          const assignedIds = new Set((ds||[]).map((d:any) => d.service_id));
          const filteredSvcs = (svcs||[]).filter((s:any) => assignedIds.has(s.id));
          const {data:mp} = await supabase.from('business_members').select('profile_id').eq('business_id',bid);
          const pids = (mp||[]).map((m:any)=>m.profile_id);
          let dents: any[] = [];
          if (pids.length > 0) { const {data:dr} = await supabase.from('dentists').select('id,first_name,last_name,specialization').in('profile_id',pids).eq('is_active',true).order('first_name'); dents = dr || []; }
          const dm = dents.map((d:any)=>({id:d.id,name:`${d.first_name||''} ${d.last_name||''}`.trim(),specialization:d.specialization||null}));
          console.log(`Business context: ${filteredSvcs.length}/${(svcs||[]).length} services have dentists assigned`);
          return new Response(JSON.stringify({business:biz||{},services:filteredSvcs,dentists:dm}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
        }

        case 'log_call_start': { if (!bid||!body.call_sid) return new Response(JSON.stringify({ok:false}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); await supabase.from('voice_call_logs').upsert({business_id:bid,call_sid:body.call_sid,caller_phone:maskPhone(body.caller_phone||''),forwarded_from:body.forwarded_from||null,status:'in_progress',started_at:new Date().toISOString()},{onConflict:'call_sid'}); return new Response(JSON.stringify({ok:true}),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'log_call_details': { if (!bid||!body.call_sid) return new Response(JSON.stringify({ok:false}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); const lp = {business_id:bid,call_sid:body.call_sid,patient_phone:maskPhone(body.caller_phone||body.patient_phone||''),started_at:body.started_at||new Date().toISOString(),ended_at:body.ended_at||new Date().toISOString(),duration_seconds:body.duration_seconds||0,status:body.status||'completed',tools_used:body.tools_used||[],errors:body.errors||[],transcript:body.transcript||[],input_text_tokens:body.input_text_tokens||0,output_text_tokens:body.output_text_tokens||0,input_audio_tokens:body.input_audio_tokens||0,output_audio_tokens:body.output_audio_tokens||0,appointment_booked:body.appointment_booked||false,appointment_id:body.appointment_id||null}; const {data:lr,error:le} = await supabase.from('call_logs').upsert(lp,{onConflict:'call_sid'}).select('id').single(); if (le) return new Response(JSON.stringify({ok:false,error:le.message}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}}); await supabase.from('voice_call_logs').update({status:body.status||'completed',ended_at:body.ended_at||new Date().toISOString(),duration_seconds:body.duration_seconds||0}).eq('call_sid',body.call_sid); return new Response(JSON.stringify({ok:true,log_id:lr?.id}),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'lookup_patient': case 'find_patient': case 'get_patient': { const ph=aPhone,nm=body.name||null; const np=ph?String(ph).replace(/[^0-9]/g,''):null; const pp=np?`+${np}`:null; let pt:any=null; if(ph){const r=await supabase.from('secure_profiles_view').select('id,first_name,last_name,email,phone,date_of_birth').eq('phone',ph).maybeSingle();pt=r.data;} if(!pt&&pp){const r=await supabase.from('secure_profiles_view').select('id,first_name,last_name,email,phone,date_of_birth').eq('phone',pp).maybeSingle();pt=r.data;} if(!pt&&np){const r=await supabase.from('secure_profiles_view').select('id,first_name,last_name,email,phone,date_of_birth').eq('phone',np).maybeSingle();pt=r.data;} if(!pt&&np&&np.length>=6){const r=await supabase.from('secure_profiles_view').select('id,first_name,last_name,email,phone,date_of_birth').ilike('phone',`%${np.slice(-9)}`).limit(1).maybeSingle();pt=r.data;} if(!pt&&nm){const parts=nm.trim().split(/\s+/);const fn=parts[0],ln=parts.slice(1).join(' ');if(fn&&ln){const r=await supabase.from('secure_profiles_view').select('id,first_name,last_name,email,phone,date_of_birth').ilike('first_name',`${fn}%`).ilike('last_name',`${ln}%`).limit(1).maybeSingle();pt=r.data;}} if(pt){let aq=supabase.from('appointments').select('id,appointment_date,reason,status,dentist_id').eq('patient_id',pt.id).gte('appointment_date',new Date().toISOString()).order('appointment_date',{ascending:true}).limit(5);if(bid)aq=aq.eq('business_id',bid);const{data:ap}=await aq;return new Response(JSON.stringify({patient_id:pt.id,found:true,created:false,profile:{first_name:pt.first_name,last_name:pt.last_name,email:pt.email,phone:pt.phone},upcoming_appointments:ap||[]}),{headers:{...corsHeaders,'Content-Type':'application/json'}});} return new Response(JSON.stringify({error:'Patient not found',found:false}),{status:404,headers:{...corsHeaders,'Content-Type':'application/json'}}); }

        case 'register_patient': {
          const { first_name: fn, last_name: ln } = body;
          const ph = aPhone;
          if (!fn || !ln || !ph) return new Response(JSON.stringify({ error: 'first_name, last_name, phone required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          const np = String(ph).replace(/[^0-9]/g, '');
          const pp = `+${np}`;
          const { data: ex } = await supabase.from('secure_profiles_view')
            .select('id,first_name,last_name,email,phone')
            .or(`phone.eq.${ph},phone.eq.${pp},phone.eq.${np}`)
            .maybeSingle();
          if (ex) return new Response(JSON.stringify({ success: true, patient_id: ex.id, already_existed: true, profile: { first_name: ex.first_name, last_name: ex.last_name, email: ex.email, phone: ex.phone } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          const { data: au, error: ae } = await supabase.auth.admin.createUser({
            phone: pp,
            phone_confirm: true,
            user_metadata: { first_name: fn.trim(), last_name: ln.trim(), phone: pp },
          });
          if (ae) {
            if ((ae as any).code === 'phone_exists' || (ae as any).message?.includes('phone')) {
              const { data: bp } = await supabase.from('secure_profiles_view')
                .select('id,first_name,last_name,email,phone')
                .or(`phone.eq.${ph},phone.eq.${pp},phone.eq.${np}`)
                .maybeSingle();
              if (bp) return new Response(JSON.stringify({ success: true, patient_id: bp.id, already_existed: true, profile: bp }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            console.error('register_patient createUser error:', ae.message);
            return new Response(JSON.stringify({ error: 'Failed to create patient' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          await new Promise(r => setTimeout(r, 200));
          const { data: np2 } = await supabase.from('secure_profiles_view')
            .select('id,first_name,last_name,email,phone')
            .eq('user_id', au.user.id)
            .maybeSingle();
          return new Response(JSON.stringify({
            success: true,
            patient_id: np2?.id || au.user.id,
            already_existed: false,
            profile: np2 || { first_name: fn.trim(), last_name: ln.trim(), email: null, phone: pp },
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        case 'check_availability': { const r = await checkAvailability(supabase,{start_date:body.start_date,end_date:body.end_date,time_preference:body.time_preference||'any',dentist_id:body.dentist_id||null,service_id:body.service_id||null},bid); return new Response(JSON.stringify(r),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'book_appointment': { const r = await bookAppointment(supabase,{patient_phone:body.patient_phone||aPhone,patient_name:body.patient_name||body.name,dentist_id:body.dentist_id||null,service_id:body.service_id||null,appointment_date:body.appointment_date,appointment_time:body.appointment_time,reason:body.reason||'General consultation'},aPhone,bid); if(r.error) return new Response(JSON.stringify({error:r.error}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); return new Response(JSON.stringify(r),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'cancel_appointment': { const r = await cancelAppointment(supabase,{appointment_id:body.appointment_id},aPhone,bid); if(r.error) return new Response(JSON.stringify({error:r.error}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); return new Response(JSON.stringify(r),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'reschedule_appointment': { const r = await rescheduleAppointment(supabase,{appointment_id:body.appointment_id,new_date:body.new_date,new_time:body.new_time},aPhone,bid); if(r.error) return new Response(JSON.stringify({error:r.error}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); return new Response(JSON.stringify(r),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'get_patient_appointments': { const r = await getPatientInfo(supabase,{phone:aPhone,name:body.name},aPhone,bid); return new Response(JSON.stringify(r),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'get_clinic_info': { const r = await getClinicInfo(supabase,{info_type:body.info_type||'general'},bid); return new Response(JSON.stringify(r),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'get_dentists_for_service': { const sid=body.service_id; if(!bid||!sid) return new Response(JSON.stringify({error:'business_id and service_id required'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); const {data,error:re}=await supabase.rpc('get_dentists_for_service',{p_business_id:bid,p_service_id:sid}); if(re){const{data:fm}=await supabase.from('business_members').select('profile_id').eq('business_id',bid);const fp=(fm||[]).map((m:any)=>m.profile_id);let ad:any[]=[];if(fp.length>0){const{data:r2}=await supabase.from('dentists').select('id,first_name,last_name,specialization').in('profile_id',fp).eq('is_active',true);ad=r2||[];}return new Response(JSON.stringify({dentists:ad.map((d:any)=>({id:d.id,name:`${d.first_name||''} ${d.last_name||''}`.trim(),specialization:d.specialization||null})),fallback:true}),{headers:{...corsHeaders,'Content-Type':'application/json'}});} const dents=(data||[]).map((d:any)=>({id:d.dentist_id||d.id,name:`${d.dentist_first_name||d.first_name||''} ${d.dentist_last_name||d.last_name||''}`.trim(),specialization:d.specialization||null})); return new Response(JSON.stringify({dentists:dents}),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'resolve_weekday': { const dn=(body.day_name||'').toLowerCase().trim(); const wa=parseInt(body.weeks_ahead||'0',10); const dm2:Record<string,number>={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6}; const td=dm2[dn]; if(td===undefined) return new Response(JSON.stringify({error:'Invalid day_name'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); const bn=getBrusselsNow(); let dl=(td-bn.dow+7)%7; if(dl===0) dl=7; dl+=wa*7; const rd=new Date(Date.UTC(bn.year,bn.month-1,bn.day+dl)); return new Response(JSON.stringify({date:rd.toISOString().split('T')[0],day_name:rd.toLocaleDateString('en-US',{timeZone:BUSINESS_TIMEZONE,weekday:'long'}),weeks_ahead:wa}),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        case 'send_profile_completion_link': { if(!aPhone) return new Response(JSON.stringify({error:'phone required'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); const encodedPhone=encodeURIComponent(aPhone); const link=`https://app.caberu.be/claim-profile?phone=${encodedPhone}`; const message=`Bonjour / Hallo!\nCompl\u00e9tez votre profil / Vul uw profiel in:\n${link}`; const smsResult=await sendSms({to:aPhone,message,messageType:'profile_completion',businessId:bid||undefined}); return new Response(JSON.stringify({ok:smsResult.success,sid:smsResult.sid,error:smsResult.error}),{headers:{...corsHeaders,'Content-Type':'application/json'}}); }
        default: return new Response(JSON.stringify({error:`Unknown action: ${action}`}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}});
      }
    }
    return new Response(JSON.stringify({error:'Use action-based routing'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}});
  } catch(error) { return new Response(JSON.stringify({error:error instanceof Error?error.message:'Unknown error'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}}); }
});

async function checkAvailability(supabase:any, args:any, businessId?:string) {
  const {start_date,end_date,time_preference='any',dentist_id,service_id} = args;
  if (!businessId) return {error:'business_id required'};
  const tr:Record<string,{start:number;end:number}> = {morning:{start:8,end:12},afternoon:{start:12,end:17},evening:{start:17,end:20}};
  let dIds:string[] = [];
  if (dentist_id) { dIds = [dentist_id]; }
  else { const {data:mp} = await supabase.from('business_members').select('profile_id').eq('business_id',businessId); const pids=(mp||[]).map((m:any)=>m.profile_id); if(pids.length>0){const{data:d}=await supabase.from('dentists').select('id').in('profile_id',pids).eq('is_active',true);dIds=(d||[]).map((x:any)=>x.id);} }
  if (dIds.length===0) return {available_slots:[],count:0};
  const dates:string[]=[]; const sD=new Date(start_date+'T00:00:00Z'),eD=new Date(end_date+'T00:00:00Z');
  for(let d=new Date(sD);d<=eD;d.setUTCDate(d.getUTCDate()+1)) dates.push(d.toISOString().split('T')[0]);
  const {data:dr} = await supabase.from('dentists').select('id,first_name,last_name').in('id',dIds);
  const nm:Record<string,string>={};
  for(const d of dr||[]) nm[d.id]=`Dr. ${d.first_name||''} ${d.last_name||''}`.trim();
  const tasks: Array<{did:string;ds:string}> = [];
  for (const did of dIds) for (const ds of dates) tasks.push({did,ds});
  const results = await Promise.all(tasks.map(async ({did,ds}) => { try { const {data:sl} = await supabase.rpc('get_available_slots',{p_business_id:businessId,p_date:ds,p_dentist_id:did,p_service_id:service_id||null}); return (sl||[]).map((s:any) => { const ts = typeof s.slot_start==='string'&&s.slot_start.includes('T') ? s.slot_start.split('T')[1]?.substring(0,5) : (s.slot_start||'').substring(0,5); return {dentist_id:did,date:ds,time:ts,dentist:nm[did]||'Doctor'}; }); } catch { return []; } }));
  let all = results.flat();
  if (time_preference && time_preference !== 'any') { const r = tr[time_preference]; if (r) all = all.filter(s => { const h=parseInt(s.time.split(':')[0],10); return h>=r.start&&h<r.end; }); }
  all.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  return {available_slots:all.slice(0,50),count:Math.min(all.length,50)};
}

async function bookAppointment(supabase:any, args:any, callerPhone:string, businessId?:string) {
  const {patient_phone,patient_name,dentist_id,service_id,appointment_date,appointment_time,reason} = args;
  const phone=patient_phone||callerPhone||null; const np=phone?phone.replace(/[^0-9]/g,''):null; let rbid=businessId||null;
  const pd = (appointment_date||'').trim();
  if (!pd || !/^\d{4}-\d{2}-\d{2}$/.test(pd)) return {error:'appointment_date must be YYYY-MM-DD'};
  function pad(n:number){return String(n).padStart(2,'0');}
  let pt = (appointment_time||'09:00').trim();
  const tm = pt.match(/(\d{1,2})(?::(\d{2}))?/);
  if (tm) { pt=`${pad(Math.min(23,parseInt(tm[1])))}:${pad(tm[2]?Math.min(59,parseInt(tm[2])):0)}`; } else { pt='09:00'; }
  const nParts=(patient_name||'').trim().split(/\s+/);const fn=nParts[0]||'';const ln=nParts.slice(1).join(' ')||'';
  let patient:any=null;
  if(phone){let r=await supabase.from('secure_profiles_view').select('id,first_name,last_name,email,phone,date_of_birth').eq('phone',phone).maybeSingle();patient=r.data;if(!patient&&np){r=await supabase.from('secure_profiles_view').select('id,first_name,last_name,email,phone,date_of_birth').ilike('phone',`%${np}%`).maybeSingle();patient=r.data;}}
  if(!patient&&fn&&ln){const r=await supabase.from('secure_profiles_view').select('id,first_name,last_name,email,phone,date_of_birth').ilike('first_name',`${fn}%`).ilike('last_name',`${ln}%`).limit(1).maybeSingle();patient=r.data;}
  if(!patient) return {error:'Patient not found. Please register the patient first.'};
  let dur=30; if(service_id){const{data:sv}=await supabase.from('business_services').select('duration_minutes').eq('id',service_id).maybeSingle();if(sv?.duration_minutes)dur=sv.duration_minutes;}
  let fdid=dentist_id;
  if(!fdid&&businessId){const{data:mp}=await supabase.from('business_members').select('profile_id').eq('business_id',businessId);const pids=(mp||[]).map((m:any)=>m.profile_id);const{data:bd}=pids.length>0?await supabase.from('dentists').select('id').eq('is_active',true).in('profile_id',pids):{data:[]};for(const d of bd||[]){const{data:sl}=await supabase.rpc('get_available_slots',{p_dentist_id:d.id,p_date:pd,p_business_id:businessId,p_service_id:service_id||null});const sts=(sl||[]).map((s:any)=>(s.slot_start||'').toString().substring(0,5));if(sts.includes(pt)){fdid=d.id;break;}}}
  if(!fdid){const{data:ad}=await supabase.from('dentists').select('id').eq('is_active',true).limit(1);if(ad?.length)fdid=ad[0].id;}
  if(!fdid) return {error:'No dentist available'};
  if(fdid&&businessId){
    const{data:as}=await supabase.rpc('get_available_slots',{p_dentist_id:fdid,p_date:pd,p_business_id:businessId,p_service_id:service_id||null});
    if(as?.length){
      const sts=as.map((s:any)=>(s.slot_start||'').toString().substring(0,5));
      if(!sts.includes(pt)) return {error:`The ${pt} slot on ${pd} is no longer available. Please check availability again and offer the patient alternative times.`};
    }
  }
  if(!rbid){const{data:dr}=await supabase.from('dentists').select('profile_id').eq('id',fdid).single();if(dr?.profile_id){const{data:mb}=await supabase.from('business_members').select('business_id').eq('profile_id',dr.profile_id).maybeSingle();if(mb?.business_id)rbid=mb.business_id;}}
  if(!rbid) return {error:'Could not determine business'};
  const off=getBrusselsOffset(pd); const adt=`${pd}T${pt}:00${off}`;
  const apd:any={patient_id:patient.id,dentist_id:fdid,appointment_date:adt,reason:reason||'Phone consultation',status:'confirmed',patient_name:`${patient.first_name??fn} ${patient.last_name??ln}`.trim(),business_id:rbid,duration_minutes:dur}; if(service_id)apd.service_id=service_id;
  const{data:apt,error:ae2}=await supabase.from('appointments').insert(apd).select().single(); if(ae2) return {error:ae2.message};
  const{error:se}=await supabase.rpc('book_appointment_slots_for_duration',{p_dentist_id:fdid,p_slot_date:pd,p_start_time:`${pt}:00`,p_duration_minutes:dur,p_appointment_id:apt.id}); if(se){await supabase.from('appointments').delete().eq('id',apt.id);return{error:'Slot taken. Choose different time.'};}
  syncAppointmentToCalendar(supabase, apt.id).catch(() => {});
  return {success:true,appointment_id:apt.id,patient_name:apd.patient_name,confirmation:`Appointment booked for ${pd} at ${pt}`};
}

async function cancelAppointment(supabase:any, args:any, callerPhone:string, businessId?:string) {
  const {appointment_id} = args; if (!appointment_id) return {error:'appointment_id required'}; if (!businessId) return {error:'business_id required'};
  const phone = callerPhone; const np = phone ? String(phone).replace(/[^0-9]/g,'') : null; let patient:any = null;
  if (phone) { const r = await supabase.from('secure_profiles_view').select('id').eq('phone',phone).maybeSingle(); patient = r.data; }
  if (!patient && np) { const r = await supabase.from('secure_profiles_view').select('id').or(`phone.eq.+${np},phone.eq.${np}`).maybeSingle(); patient = r.data; }
  if (!patient) return {error:'Could not identify caller as a patient'};
  const {data,error} = await supabase.rpc('cancel_appointment_for_voice',{p_appointment_id:appointment_id,p_patient_id:patient.id,p_business_id:businessId});
  if (error) return {error:error.message}; if (!data) return {error:'Appointment not found or you are not authorized to cancel it'};
  return {success:true,message:'Your appointment has been successfully cancelled'};
}

async function rescheduleAppointment(supabase:any, args:any, callerPhone:string, businessId?:string) {
  const {appointment_id,new_date,new_time} = args; if (!appointment_id || !new_date || !new_time) return {error:'appointment_id, new_date, new_time required'}; if (!businessId) return {error:'business_id required'};
  const phone = callerPhone; const np = phone ? String(phone).replace(/[^0-9]/g,'') : null; let patient:any = null;
  if (phone) { const r = await supabase.from('secure_profiles_view').select('id').eq('phone',phone).maybeSingle(); patient = r.data; }
  if (!patient && np) { const r = await supabase.from('secure_profiles_view').select('id').or(`phone.eq.+${np},phone.eq.${np}`).maybeSingle(); patient = r.data; }
  if (!patient) return {error:'Could not identify caller as a patient'};
  const {data,error} = await supabase.rpc('reschedule_appointment_for_voice',{p_appointment_id:appointment_id,p_patient_id:patient.id,p_business_id:businessId,p_slot_date:new_date,p_slot_time:new_time});
  if (error) {
    if (error.message.includes('appointment_not_found_or_not_authorized')) return {error:'Appointment not found or you are not authorized to reschedule it'};
    if (error.message.includes('slot_unavailable')) return {error:'That time slot is not available. Please choose a different time.'};
    if (error.message.includes('slot_being_booked')) return {error:'That slot is being booked right now. Please try another time.'};
    return {error:error.message};
  }
  return {success:true,message:`Your appointment has been rescheduled to ${new_date} at ${new_time}`};
}

async function getPatientInfo(supabase:any,args:any,callerPhone:string,businessId?:string){
  const{phone,name}=args; const sp=phone||callerPhone; const np=sp?String(sp).replace(/[^0-9]/g,''):null;
  if(sp){
    const r1=await supabase.from('secure_profiles_view').select('id,first_name,last_name,phone,email,date_of_birth').eq('phone',sp).maybeSingle(); let p=r1.data;
    if(!p&&np){const r2=await supabase.from('secure_profiles_view').select('id,first_name,last_name,phone,email,date_of_birth').eq('phone',`+${np}`).maybeSingle();p=r2.data;}
    if(!p&&np){const r3=await supabase.from('secure_profiles_view').select('id,first_name,last_name,phone,email,date_of_birth').eq('phone',np).maybeSingle();p=r3.data;}
    if(!p&&np&&np.length>=6){const r4=await supabase.from('secure_profiles_view').select('id,first_name,last_name,phone,email,date_of_birth').ilike('phone',`%${np.slice(-9)}`).limit(1).maybeSingle();p=r4.data;}
    if(!p) return{found:false,message:'No patient found for this phone number'};
    let aq=supabase.from('appointments').select('id,appointment_date,reason,status,dentist_id').eq('patient_id',p.id).gte('appointment_date',new Date().toISOString()).order('appointment_date',{ascending:true}).limit(5);
    if(businessId)aq=aq.eq('business_id',businessId); const{data:ap}=await aq;
    return{found:true,patient:{name:`${p.first_name} ${p.last_name}`,phone:p.phone,email:p.email},upcoming_appointments:(ap||[]).map((a:any)=>({id:a.id,date:a.appointment_date,dentist_id:a.dentist_id,reason:a.reason,status:a.status}))};
  } else if(name){
    const parts=name.trim().split(/\s+/); const fn=parts[0]||'';
    const{data:pts}=await supabase.from('secure_profiles_view').select('id,first_name,last_name,phone,email,date_of_birth').ilike('first_name',`%${fn}%`).limit(1);
    if(!pts?.length) return{found:false,message:'No patient found'};
    const p=pts[0]; let aq=supabase.from('appointments').select('id,appointment_date,reason,status,dentist_id').eq('patient_id',p.id).gte('appointment_date',new Date().toISOString()).order('appointment_date',{ascending:true}).limit(5);
    if(businessId)aq=aq.eq('business_id',businessId); const{data:ap}=await aq;
    return{found:true,patient:{name:`${p.first_name} ${p.last_name}`,phone:p.phone,email:p.email},upcoming_appointments:(ap||[]).map((a:any)=>({id:a.id,date:a.appointment_date,dentist_id:a.dentist_id,reason:a.reason,status:a.status}))};
  } else { return{found:false,message:'Provide phone or name'}; }
}

async function getClinicInfo(supabase:any,args:any,businessId?:string){const{info_type}=args;let q=supabase.from('businesses').select('name,business_hours,tagline,bio,specialty_type');if(businessId)q=q.eq('id',businessId);const{data:biz}=await q.limit(1).single();switch(info_type){case'hours':return{hours:biz?.business_hours||{}};case'location':return{clinic_name:biz?.name,info:'Visit our website for directions.'};case'services':{const{data:sv}=await supabase.from('business_services').select('name,description,price_cents,duration_minutes').eq('is_active',true).limit(10);return{services:(sv||[]).map((s:any)=>({name:s.name,description:s.description,price:`${(s.price_cents/100).toFixed(2)}`,duration:`${s.duration_minutes} min`}))};} default:return{clinic_name:biz?.name,tagline:biz?.tagline,specialty:biz?.specialty_type,description:biz?.bio};}}
