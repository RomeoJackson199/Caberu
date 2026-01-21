-- Update subscription plans with new WhatsApp and phone minute limits (using JSONB format)
UPDATE subscription_plans 
SET features = '["Unlimited appointments", "Unlimited emails", "300 min AI phone/month", "WhatsApp integration", "Patient management", "Basic appointment scheduling", "Email notifications", "Basic reports"]'::jsonb
WHERE slug = 'starter';

UPDATE subscription_plans 
SET features = '["Unlimited appointments", "Unlimited emails", "600 min AI phone/month", "500 WhatsApp messages/month", "Everything in Starter", "Advanced analytics", "SMS notifications", "Custom branding", "Priority support"]'::jsonb
WHERE slug = 'professional';

UPDATE subscription_plans 
SET features = '["Unlimited appointments", "Unlimited emails", "1200 min AI phone/month", "2000 WhatsApp messages/month", "Everything in Professional", "Unlimited staff accounts", "API access", "Dedicated support", "Custom integrations"]'::jsonb
WHERE slug = 'enterprise';