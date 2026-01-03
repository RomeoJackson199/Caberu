-- Atomic completion: Create invoice and deduct inventory in one transaction
CREATE OR REPLACE FUNCTION public.complete_visit_atomic(
  p_appointment_id uuid,
  p_dentist_id uuid,
  p_patient_id uuid,
  p_total_cents integer,
  p_items jsonb,          -- array of { code, description, quantity, tariff_cents, mutuality_cents, patient_cents, vat_cents }
  p_deductions jsonb,     -- array of { item_id, quantity }
  p_created_by uuid       -- profiles.id
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_rec jsonb;
  v_ded jsonb;
  v_item_id uuid;
  v_qty int;
  v_row public.inventory_items%ROWTYPE;
BEGIN
  -- Ownership check
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = p_appointment_id AND a.dentist_id = p_dentist_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized appointment or dentist';
  END IF;

  -- Create invoice
  INSERT INTO public.invoices (
    appointment_id,
    patient_id,
    dentist_id,
    total_amount_cents,
    patient_amount_cents,
    mutuality_amount_cents,
    vat_amount_cents,
    status,
    claim_status
  ) VALUES (
    p_appointment_id,
    p_patient_id,
    p_dentist_id,
    p_total_cents,
    p_total_cents,
    0,
    0,
    'draft',
    'to_be_submitted'
  ) RETURNING id INTO v_invoice_id;

  -- Items
  FOR v_rec IN SELECT jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.invoice_items (
      invoice_id,
      code,
      description,
      quantity,
      tariff_cents,
      mutuality_cents,
      patient_cents,
      vat_cents
    ) VALUES (
      v_invoice_id,
      (v_rec->>'code'),
      (v_rec->>'description'),
      COALESCE((v_rec->>'quantity')::int, 1),
      COALESCE((v_rec->>'tariff_cents')::int, 0),
      COALESCE((v_rec->>'mutuality_cents')::int, 0),
      COALESCE((v_rec->>'patient_cents')::int, 0),
      COALESCE((v_rec->>'vat_cents')::int, 0)
    );
  END LOOP;

  -- Deduct inventory (row-locked)
  FOR v_ded IN SELECT jsonb_array_elements(p_deductions)
  LOOP
    v_item_id := (v_ded->>'item_id')::uuid;
    v_qty := GREATEST(1, COALESCE((v_ded->>'quantity')::int, 1));

    SELECT * INTO v_row
    FROM public.inventory_items
    WHERE id = v_item_id AND dentist_id = p_dentist_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE; -- skip unknown/foreign items
    END IF;

    UPDATE public.inventory_items
      SET quantity = GREATEST(0, quantity - v_qty)
      WHERE id = v_item_id;

    INSERT INTO public.inventory_adjustments (
      item_id,
      dentist_id,
      appointment_id,
      change,
      adjustment_type,
      reason,
      created_by
    ) VALUES (
      v_item_id,
      p_dentist_id,
      p_appointment_id,
      -v_qty,
      'usage',
      CONCAT('Appointment ', p_appointment_id),
      p_created_by
    );
  END LOOP;

  -- Mark appointment completed
  UPDATE public.appointments
    SET status = 'completed', treatment_completed_at = now()
    WHERE id = p_appointment_id;

  RETURN v_invoice_id;
END;
$$;

-- Allow execution to authenticated users through RLS-defended tables; function performs its own ownership checks
REVOKE ALL ON FUNCTION public.complete_visit_atomic(uuid, uuid, uuid, integer, jsonb, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_visit_atomic(uuid, uuid, uuid, integer, jsonb, jsonb, uuid) TO PUBLIC;