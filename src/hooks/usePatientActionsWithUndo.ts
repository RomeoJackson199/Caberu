/**
 * usePatientActionsWithUndo Hook
 *
 * Patient management actions with Gmail-style undo functionality.
 * Provides undo support for patient deletions, updates, and related operations.
 *
 * @example
 * const { deletePatientWithUndo, updatePatientWithUndo } = usePatientActionsWithUndo();
 *
 * await deletePatientWithUndo(patient);
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUndoManager } from './useUndoManager';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  medical_history?: string;
  emergency_contact?: string;
  profile_picture_url?: string;
  [key: string]: any; // Other fields
}

interface PatientNote {
  id: string;
  patient_id: string;
  title: string;
  content: string;
  note_type: string;
  is_private: boolean;
  created_at: string;
  [key: string]: any;
}

interface Allergy {
  id: string;
  patient_id: string;
  allergen: string;
  reaction: string;
  severity: string;
  [key: string]: any;
}

export function usePatientActionsWithUndo() {
  const queryClient = useQueryClient();
  const { executeWithUndo } = useUndoManager();
  const deletedPatients = useRef<Map<string, Patient>>(new Map());
  const deletedNotes = useRef<Map<string, PatientNote>>(new Map());
  const deletedAllergies = useRef<Map<string, Allergy>>(new Map());

  /**
   * Get query keys to invalidate
   */
  const getPatientQueryKeys = useCallback(() => [
    ['patients'],
    ['patient-list'],
    ['patient-details'],
    ['patient-notes'],
    ['patient-allergies'],
  ], []);

  /**
   * Delete a patient with undo support
   */
  const deletePatientWithUndo = useCallback(async (patient: Patient) => {
    // Save snapshot for undo
    deletedPatients.current.set(patient.id, { ...patient });

    await executeWithUndo({
      message: `${patient.first_name} ${patient.last_name} deleted`,
      description: 'Click undo to restore patient',
      undoDelay: 5000,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from('patients')
          .delete()
          .eq('id', patient.id);

        if (error) throw error;

        deletedPatients.current.delete(patient.id);
        return patient;
      },
      undo: async () => {
        const original = deletedPatients.current.get(patient.id);
        if (!original) return;

        // Restore the patient
        const { error } = await supabase
          .from('patients')
          .insert([original]);

        if (error) throw error;

        deletedPatients.current.delete(patient.id);
      },
      invalidateQueries: getPatientQueryKeys(),
    });
  }, [executeWithUndo, getPatientQueryKeys]);

  /**
   * Delete a patient note with undo support
   */
  const deleteNoteWithUndo = useCallback(async (note: PatientNote) => {
    // Save snapshot for undo
    deletedNotes.current.set(note.id, { ...note });

    await executeWithUndo({
      message: 'Note deleted',
      description: `"${note.title}"`,
      undoDelay: 5000,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from('patient_notes')
          .delete()
          .eq('id', note.id);

        if (error) throw error;

        deletedNotes.current.delete(note.id);
        return note;
      },
      undo: async () => {
        const original = deletedNotes.current.get(note.id);
        if (!original) return;

        // Restore the note
        const { error } = await supabase
          .from('patient_notes')
          .insert([original]);

        if (error) throw error;

        deletedNotes.current.delete(note.id);
      },
      invalidateQueries: [['patient-notes', note.patient_id]],
    });
  }, [executeWithUndo]);

  /**
   * Delete an allergy record with undo support
   */
  const deleteAllergyWithUndo = useCallback(async (allergy: Allergy, patientName?: string) => {
    // Save snapshot for undo
    deletedAllergies.current.set(allergy.id, { ...allergy });

    await executeWithUndo({
      message: 'Allergy removed',
      description: `${allergy.allergen} ${patientName ? `from ${patientName}` : ''}`,
      undoDelay: 5000,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from('patient_allergies')
          .delete()
          .eq('id', allergy.id);

        if (error) throw error;

        deletedAllergies.current.delete(allergy.id);
        return allergy;
      },
      undo: async () => {
        const original = deletedAllergies.current.get(allergy.id);
        if (!original) return;

        // Restore the allergy record
        const { error } = await supabase
          .from('patient_allergies')
          .insert([original]);

        if (error) throw error;

        deletedAllergies.current.delete(allergy.id);
      },
      invalidateQueries: [['patient-allergies', allergy.patient_id]],
    });
  }, [executeWithUndo]);

  /**
   * Archive a patient with undo support (soft delete)
   */
  const archivePatientWithUndo = useCallback(async (patient: Patient) => {
    const previousStatus = patient.is_archived || false;

    await executeWithUndo({
      message: `${patient.first_name} ${patient.last_name} archived`,
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        // Mark as archived
        const { error } = await supabase
          .from('patients')
          .update({ is_archived: true, updated_at: new Date().toISOString() })
          .eq('id', patient.id);

        if (error) throw error;

        return patient;
      },
      undo: async () => {
        // Restore archived status
        const { error } = await supabase
          .from('patients')
          .update({ is_archived: previousStatus, updated_at: new Date().toISOString() })
          .eq('id', patient.id);

        if (error) throw error;
      },
      invalidateQueries: getPatientQueryKeys(),
    });
  }, [executeWithUndo, getPatientQueryKeys]);

  /**
   * Bulk delete patients with undo support
   */
  const bulkDeletePatientsWithUndo = useCallback(async (patients: Patient[]) => {
    // Save snapshots for undo
    patients.forEach(patient => {
      deletedPatients.current.set(patient.id, { ...patient });
    });

    await executeWithUndo({
      message: `${patients.length} patients deleted`,
      description: 'Click undo to restore all',
      undoDelay: 5000,
      action: async () => {
        // Perform bulk deletion
        const { error } = await supabase
          .from('patients')
          .delete()
          .in('id', patients.map(p => p.id));

        if (error) throw error;

        patients.forEach(patient => deletedPatients.current.delete(patient.id));
      },
      undo: async () => {
        // Restore all patients
        const patientsToRestore = patients
          .map(patient => deletedPatients.current.get(patient.id))
          .filter(Boolean) as Patient[];

        if (patientsToRestore.length === 0) return;

        const { error } = await supabase
          .from('patients')
          .insert(patientsToRestore);

        if (error) throw error;

        patients.forEach(patient => deletedPatients.current.delete(patient.id));
      },
      invalidateQueries: getPatientQueryKeys(),
    });
  }, [executeWithUndo, getPatientQueryKeys]);

  return {
    deletePatientWithUndo,
    deleteNoteWithUndo,
    deleteAllergyWithUndo,
    archivePatientWithUndo,
    bulkDeletePatientsWithUndo,
  };
}
