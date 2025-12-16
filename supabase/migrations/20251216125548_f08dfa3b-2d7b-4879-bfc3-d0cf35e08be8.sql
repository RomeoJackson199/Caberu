-- Insert ElevenLabs agent record to link agent_id to business_id
INSERT INTO elevenlabs_agents (agent_id, agent_name, business_id, is_active)
VALUES (
  'agent_0601kabr6jxseqr9deax9c7ft5rq',
  'AI Receptionist',
  '74a81837-4758-497b-a909-b3f42b2097f3',
  true
) ON CONFLICT (agent_id) DO UPDATE SET
  business_id = EXCLUDED.business_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();