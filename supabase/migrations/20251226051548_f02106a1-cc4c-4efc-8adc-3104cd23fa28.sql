-- Drop unused tables
DROP TABLE IF EXISTS public.providers_backup;
DROP TABLE IF EXISTS public.template_change_history;

-- Note: The trigger trg_providers_updated_at will be automatically dropped with providers_backup table