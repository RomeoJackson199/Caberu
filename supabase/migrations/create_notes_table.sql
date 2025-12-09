-- Create notes table for patient/appointment notes
-- This table stores notes created during appointment completion and other contexts

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id UUID REFERENCES dentists(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- 'general', 'clinical', 'billing', 'follow_up', 'treatment', 'consultation'
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES dentists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notes_patient_id ON notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_dentist_id ON notes(dentist_id);
CREATE INDEX IF NOT EXISTS idx_notes_appointment_id ON notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Dentists can view/manage notes they created or for their patients
CREATE POLICY "Dentists can manage notes"
  ON notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dentists d
      JOIN profiles p ON d.profile_id = p.id
      WHERE (d.id = notes.dentist_id OR d.id = notes.created_by)
      AND p.user_id = auth.uid()
    )
  );

-- Patients can view non-private notes about them
CREATE POLICY "Patients can view their notes"
  ON notes FOR SELECT
  USING (
    notes.is_private = false
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = notes.patient_id
      AND p.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON notes TO authenticated;
GRANT SELECT ON notes TO anon;
