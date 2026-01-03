-- Payments rebuild: statuses, items, reminders, transitions, and filters

-- 1) Extend payment_requests with lifecycle fields
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_cadence_days integer[] DEFAULT ARRAY[3,7,14],
  ADD COLUMN IF NOT EXISTS terms_due_in_days integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS channels text[] DEFAULT ARRAY['email'],
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Standardize statuses with a CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints
    WHERE  table_schema = 'public'
    AND    table_name   = 'payment_requests'
    AND    constraint_name = 'payment_requests_status_check'
  ) THEN
    ALTER TABLE public.payment_requests
      ADD CONSTRAINT payment_requests_status_check
      CHECK (status IN ('draft','sent','pending','paid','overdue','failed','cancelled'));
  END IF;
END $$;

-- Helpful indexes for filtering
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_by ON public.payment_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_requests_due_date ON public.payment_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_requests_amount ON public.payment_requests(amount);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON public.payment_requests(created_at);

-- 2) Line items per payment request
CREATE TABLE IF NOT EXISTS public.payment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  code text,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_items_request ON public.payment_items(payment_request_id);

ALTER TABLE public.payment_items ENABLE ROW LEVEL SECURITY;

-- Dentists can manage items for their own payment requests
CREATE POLICY IF NOT EXISTS "Dentists manage their payment items"
  ON public.payment_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.payment_requests pr
      JOIN public.dentists d ON d.id = pr.dentist_id
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE pr.id = payment_items.payment_request_id AND p.user_id = auth.uid()
    )
  );

-- Patients can read items for their own payment requests
CREATE POLICY IF NOT EXISTS "Patients read their payment items"
  ON public.payment_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.payment_requests pr
      JOIN public.profiles p ON p.id = pr.patient_id
      WHERE pr.id = payment_items.payment_request_id AND p.user_id = auth.uid()
    )
  );

-- 3) Reminder logs per payment
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  template_key text NOT NULL, -- e.g., 'friendly', 'firm'
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','opened','bounced','failed')),
  message_id text,
  error_message text,
  metadata jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_request ON public.payment_reminders(payment_request_id);
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- Dentists can manage reminders for their own payment requests
CREATE POLICY IF NOT EXISTS "Dentists manage payment reminders"
  ON public.payment_reminders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.payment_requests pr
      JOIN public.dentists d ON d.id = pr.dentist_id
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE pr.id = payment_reminders.payment_request_id AND p.user_id = auth.uid()
    )
  );

-- Patients can read reminder logs for their own payment requests
CREATE POLICY IF NOT EXISTS "Patients read payment reminders"
  ON public.payment_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.payment_requests pr
      JOIN public.profiles p ON p.id = pr.patient_id
      WHERE pr.id = payment_reminders.payment_request_id AND p.user_id = auth.uid()
    )
  );

-- 4) Status transition audit log
CREATE TABLE IF NOT EXISTS public.payment_status_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transitions_request ON public.payment_status_transitions(payment_request_id);
ALTER TABLE public.payment_status_transitions ENABLE ROW LEVEL SECURITY;

-- Dentists can read transitions for their own payment requests
CREATE POLICY IF NOT EXISTS "Dentists read payment transitions"
  ON public.payment_status_transitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.payment_requests pr
      JOIN public.dentists d ON d.id = pr.dentist_id
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE pr.id = payment_status_transitions.payment_request_id AND p.user_id = auth.uid()
    )
  );

-- Patients can read transitions for their own payment requests
CREATE POLICY IF NOT EXISTS "Patients read payment transitions"
  ON public.payment_status_transitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.payment_requests pr
      JOIN public.profiles p ON p.id = pr.patient_id
      WHERE pr.id = payment_status_transitions.payment_request_id AND p.user_id = auth.uid()
    )
  );

-- 5) Trigger: enforce lifecycle and log transitions
CREATE OR REPLACE FUNCTION public.allowed_payment_status_transition(old_status text, new_status text)
RETURNS boolean AS $$
BEGIN
  -- Allowed paths:
  -- draft -> sent, cancelled
  -- sent -> pending, cancelled
  -- pending -> paid, overdue, cancelled, failed
  -- overdue -> paid, cancelled
  -- failed -> pending, cancelled
  -- paid -> (terminal)
  -- cancelled -> (terminal)
  IF old_status = new_status THEN
    RETURN true;
  END IF;

  IF old_status = 'draft' AND (new_status IN ('sent','cancelled')) THEN RETURN true; END IF;
  IF old_status = 'sent' AND (new_status IN ('pending','cancelled')) THEN RETURN true; END IF;
  IF old_status = 'pending' AND (new_status IN ('paid','overdue','cancelled','failed')) THEN RETURN true; END IF;
  IF old_status = 'overdue' AND (new_status IN ('paid','cancelled')) THEN RETURN true; END IF;
  IF old_status = 'failed' AND (new_status IN ('pending','cancelled')) THEN RETURN true; END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.log_and_enforce_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.allowed_payment_status_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid payment status transition: % -> %', OLD.status, NEW.status;
    END IF;

    -- Try to capture actor profile id if possible
    SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid();

    INSERT INTO public.payment_status_transitions(payment_request_id, from_status, to_status, created_by)
    VALUES (OLD.id, OLD.status, NEW.status, v_actor);

    IF NEW.status = 'paid' AND OLD.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payment_requests_status_transition'
  ) THEN
    CREATE TRIGGER trg_payment_requests_status_transition
      BEFORE UPDATE OF status ON public.payment_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.log_and_enforce_payment_status_transition();
  END IF;
END $$;

