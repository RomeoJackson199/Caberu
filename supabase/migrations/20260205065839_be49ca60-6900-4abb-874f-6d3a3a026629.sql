
-- First add business_id to notes table so encryption can work properly
ALTER TABLE notes ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- Populate business_id from appointment or dentist
UPDATE notes n SET business_id = (
  SELECT COALESCE(
    (SELECT a.business_id FROM appointments a WHERE a.id = n.appointment_id),
    (SELECT DISTINCT bm.business_id FROM dentists d 
     JOIN business_members bm ON bm.profile_id = d.profile_id 
     WHERE d.id = n.dentist_id LIMIT 1)
  )
) WHERE business_id IS NULL;

-- Set default business for any remaining
UPDATE notes SET business_id = 'c2ba8198-a90a-4802-8405-b8ac51cc2a00' WHERE business_id IS NULL;

-- Now run backfill for remaining tables
DO $$
DECLARE
  enc_key TEXT;
  biz_id UUID := 'c2ba8198-a90a-4802-8405-b8ac51cc2a00';
  updated_count INTEGER;
BEGIN
  enc_key := private.get_business_encryption_key(biz_id);
  
  IF enc_key IS NULL THEN
    RAISE EXCEPTION 'Could not get encryption key';
  END IF;
  
  -- Appointments
  UPDATE appointments SET reason_encrypted = extensions.pgp_sym_encrypt(reason, enc_key)
  WHERE reason IS NOT NULL AND reason_encrypted IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Encrypted % appointment reasons', updated_count;
  
  UPDATE appointments SET notes_encrypted = extensions.pgp_sym_encrypt(notes, enc_key)
  WHERE notes IS NOT NULL AND notes_encrypted IS NULL;
  
  UPDATE appointments SET consultation_notes_encrypted = extensions.pgp_sym_encrypt(consultation_notes, enc_key)
  WHERE consultation_notes IS NOT NULL AND consultation_notes_encrypted IS NULL;
  
  UPDATE appointments SET ai_summary_encrypted = extensions.pgp_sym_encrypt(ai_summary, enc_key)
  WHERE ai_summary IS NOT NULL AND ai_summary_encrypted IS NULL;
  
  UPDATE appointments SET patient_name_encrypted = extensions.pgp_sym_encrypt(patient_name, enc_key)
  WHERE patient_name IS NOT NULL AND patient_name_encrypted IS NULL;
  
  -- Notes (now with business_id, trigger removed)
  UPDATE notes SET content_encrypted = extensions.pgp_sym_encrypt(content, enc_key)
  WHERE content IS NOT NULL AND content_encrypted IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Encrypted % notes content', updated_count;
  
  UPDATE notes SET title_encrypted = extensions.pgp_sym_encrypt(title, enc_key)
  WHERE title IS NOT NULL AND title_encrypted IS NULL;
  
  -- Patient allergies
  UPDATE patient_allergies SET allergy_name_encrypted = extensions.pgp_sym_encrypt(allergy_name, enc_key)
  WHERE allergy_name IS NOT NULL AND allergy_name_encrypted IS NULL;
  
  UPDATE patient_allergies SET notes_encrypted = extensions.pgp_sym_encrypt(notes, enc_key)
  WHERE notes IS NOT NULL AND notes_encrypted IS NULL;
  
  -- Imaging sets
  UPDATE imaging_sets SET notes_encrypted = extensions.pgp_sym_encrypt(notes, enc_key)
  WHERE notes IS NOT NULL AND notes_encrypted IS NULL;
  
  -- Treatment plans (need to drop trigger first if exists)
  UPDATE treatment_plans SET diagnosis_encrypted = extensions.pgp_sym_encrypt(diagnosis, enc_key)
  WHERE diagnosis IS NOT NULL AND diagnosis_encrypted IS NULL;
  
  UPDATE treatment_plans SET description_encrypted = extensions.pgp_sym_encrypt(description, enc_key)
  WHERE description IS NOT NULL AND description_encrypted IS NULL;
  
  -- Medical records
  UPDATE medical_records SET findings_encrypted = extensions.pgp_sym_encrypt(findings, enc_key)
  WHERE findings IS NOT NULL AND findings_encrypted IS NULL;
  
  RAISE NOTICE 'All tables backfilled!';
END;
$$;

-- Re-create notes trigger
CREATE TRIGGER encrypt_notes_phi
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION private.encrypt_phi_with_business_key();
