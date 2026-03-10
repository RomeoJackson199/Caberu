

# Voice AI: Smarter Booking Flow with Service-Aware Dentist Selection and Weekday Preference

## Problem

The current Voice AI (Fastify server) booking flow has two issues:

1. **No service-to-dentist filtering** — After the patient picks a service, the AI doesn't know which dentists can actually perform it. It either picks randomly or the AI hallucinates.
2. **No weekday preference step** — The AI jumps straight to checking a full date range, often resulting in hallucinated times (like 20:00) because OpenAI picks from a large list or invents a time.
3. **The `check_appointment_availability` tool in Fastify doesn't pass `service_id`** — so the edge function can't filter by service duration.

## Solution

Update the **Fastify server** (`index.js` — the code you shared) with:

### 1. Add a new tool: `get_dentists_for_service`

A new tool definition that calls the edge function with action `get_dentists_for_service`, which queries the existing database RPC. This lets the AI ask "Which dentist would you like?" with only dentists who actually offer the selected service.

### 2. Add `service_id` to `check_appointment_availability` tool

The tool definition already has `service_id` as a parameter, but the Fastify server needs to pass it through to the edge function so duration-aware slot filtering works.

### 3. Update the system prompt to enforce the new flow

```
1. Ask symptoms → pick service
2. Call get_dentists_for_service → present matching dentists
3. Patient picks dentist → ask "What day of the week works best for you?"
4. Patient says e.g. "Thursday" → AI calls check_appointment_availability 
   with start_date = next Thursday, end_date = 2 weeks out, 
   filtering to that weekday only, with service_id included
5. Present max 3 slots → patient picks → book immediately
```

### 4. Add edge function handler for `get_dentists_for_service`

In `voice-call-ai/index.ts`, add a new action case that calls the existing `get_dentists_for_service` RPC and returns the results.

## Changes Required

### File 1: Fastify server (`index.js` — external, you shared it)

- **Add tool definition** for `get_dentists_for_service` with params `service_id` (required)
- **Add to `actionMap`**: `get_dentists_for_service: 'get_dentists_for_service'`
- **Update system prompt** (`buildSystemMessage`):
  - Step 3: After service confirmation, call `get_dentists_for_service` with the `service_id` to get matching dentists, then ask patient which one
  - Step 4: Ask "What day of the week works best?" instead of asking for a specific date
  - Step 5: When checking availability, always include `service_id`, and scope the date range to the patient's preferred weekday (e.g. next 2 occurrences of "Thursday")
  - Reinforce: "Never invent time slots — only use results from check_appointment_availability. Present exactly 3 slots."

### File 2: `supabase/functions/voice-call-ai/index.ts`

- **Add action case** `get_dentists_for_service` that calls the existing `get_dentists_for_service` RPC:
  ```typescript
  case 'get_dentists_for_service': {
    const { data, error } = await supabase.rpc('get_dentists_for_service', {
      p_business_id: actionBusinessId,
      p_service_id: body.service_id,
    });
    // Return dentist list with id, name, specialization
  }
  ```

### File 3: Fix `NodeJS` namespace build errors

The build errors (`Cannot find namespace 'NodeJS'`) are unrelated but need fixing. Add `/// <reference types="node" />` or replace `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` in the 5 affected files.

## Expected Result

The voice call flow becomes:
1. "What's bothering you?" → patient describes symptoms
2. AI picks best service, confirms with patient
3. AI calls `get_dentists_for_service` → "We have Dr. X and Dr. Y who can do this. Who would you prefer?"
4. Patient picks → "What day of the week works best for you?"
5. Patient says "Wednesday" → AI checks next 2 Wednesdays for that dentist+service
6. "I have Wednesday the 12th at 9am, 10:30am, or 2pm. Which works?"
7. Patient picks → booked immediately, no confirmation question

