/**
 * useTreatmentActionsWithUndo Hook
 *
 * Treatment plan and prescription actions with Gmail-style undo functionality.
 * Provides undo support for deletions and status changes.
 *
 * @example
 * const { deleteTemplateWithUndo, deletePrescriptionWithUndo } = useTreatmentActionsWithUndo();
 *
 * await deleteTemplateWithUndo(template);
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUndoManager } from './useUndoManager';

interface TreatmentTemplate {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  default_items: any[];
  created_by_dentist_id: string;
  created_at: string;
  [key: string]: any;
}

interface TreatmentPlan {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  diagnosis: string | null;
  status: string;
  priority: string;
  estimated_cost?: number;
  estimated_duration_weeks?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  [key: string]: any;
}

interface Prescription {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days?: number;
  instructions?: string;
  status: string;
  prescribed_date: string;
  [key: string]: any;
}

export function useTreatmentActionsWithUndo() {
  const queryClient = useQueryClient();
  const { executeWithUndo } = useUndoManager();
  const deletedTemplates = useRef<Map<string, TreatmentTemplate>>(new Map());
  const deletedPlans = useRef<Map<string, TreatmentPlan>>(new Map());
  const deletedPrescriptions = useRef<Map<string, Prescription>>(new Map());

  /**
   * Get query keys for templates
   */
  const getTemplateQueryKeys = useCallback(() => [
    ['treatment-templates'],
    ['templates'],
  ], []);

  /**
   * Get query keys for treatment plans
   */
  const getPlanQueryKeys = useCallback(() => [
    ['treatment-plans'],
    ['patient-treatment-plans'],
  ], []);

  /**
   * Get query keys for prescriptions
   */
  const getPrescriptionQueryKeys = useCallback(() => [
    ['prescriptions'],
    ['patient-prescriptions'],
    ['active-prescriptions'],
  ], []);

  /**
   * Delete a treatment template with undo support
   */
  const deleteTemplateWithUndo = useCallback(async (template: TreatmentTemplate) => {
    // Save snapshot for undo
    deletedTemplates.current.set(template.id, { ...template });

    await executeWithUndo({
      message: `Template "${template.name}" deleted`,
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from('treatment_templates')
          .delete()
          .eq('id', template.id);

        if (error) throw error;

        deletedTemplates.current.delete(template.id);
        return template;
      },
      undo: async () => {
        const original = deletedTemplates.current.get(template.id);
        if (!original) return;

        // Restore the template
        const { error } = await supabase
          .from('treatment_templates')
          .insert([original]);

        if (error) throw error;

        deletedTemplates.current.delete(template.id);
      },
      invalidateQueries: getTemplateQueryKeys(),
    });
  }, [executeWithUndo, getTemplateQueryKeys]);

  /**
   * Delete a treatment plan with undo support
   */
  const deleteTreatmentPlanWithUndo = useCallback(async (plan: TreatmentPlan) => {
    // Save snapshot for undo
    deletedPlans.current.set(plan.id, { ...plan });

    await executeWithUndo({
      message: `Treatment plan "${plan.title}" deleted`,
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from('treatment_plans')
          .delete()
          .eq('id', plan.id);

        if (error) throw error;

        deletedPlans.current.delete(plan.id);
        return plan;
      },
      undo: async () => {
        const original = deletedPlans.current.get(plan.id);
        if (!original) return;

        // Restore the treatment plan
        const { error } = await supabase
          .from('treatment_plans')
          .insert([original]);

        if (error) throw error;

        deletedPlans.current.delete(plan.id);
      },
      invalidateQueries: getPlanQueryKeys(),
    });
  }, [executeWithUndo, getPlanQueryKeys]);

  /**
   * Cancel a treatment plan with undo support
   */
  const cancelTreatmentPlanWithUndo = useCallback(async (plan: TreatmentPlan) => {
    const previousStatus = plan.status;

    await executeWithUndo({
      message: `Treatment plan "${plan.title}" cancelled`,
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        // Update to cancelled status
        const { error } = await supabase
          .from('treatment_plans')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', plan.id);

        if (error) throw error;

        return plan;
      },
      undo: async () => {
        // Restore original status
        const { error } = await supabase
          .from('treatment_plans')
          .update({ status: previousStatus, updated_at: new Date().toISOString() })
          .eq('id', plan.id);

        if (error) throw error;
      },
      invalidateQueries: getPlanQueryKeys(),
    });
  }, [executeWithUndo, getPlanQueryKeys]);

  /**
   * Delete a prescription with undo support
   */
  const deletePrescriptionWithUndo = useCallback(async (prescription: Prescription, patientName?: string) => {
    // Save snapshot for undo
    deletedPrescriptions.current.set(prescription.id, { ...prescription });

    await executeWithUndo({
      message: `Prescription deleted`,
      description: `${prescription.medication_name}${patientName ? ` for ${patientName}` : ''}`,
      undoDelay: 5000,
      action: async () => {
        // Perform actual deletion
        const { error } = await supabase
          .from('prescriptions')
          .delete()
          .eq('id', prescription.id);

        if (error) throw error;

        deletedPrescriptions.current.delete(prescription.id);
        return prescription;
      },
      undo: async () => {
        const original = deletedPrescriptions.current.get(prescription.id);
        if (!original) return;

        // Restore the prescription
        const { error } = await supabase
          .from('prescriptions')
          .insert([original]);

        if (error) throw error;

        deletedPrescriptions.current.delete(prescription.id);
      },
      invalidateQueries: getPrescriptionQueryKeys(),
    });
  }, [executeWithUndo, getPrescriptionQueryKeys]);

  /**
   * Cancel a prescription with undo support
   */
  const cancelPrescriptionWithUndo = useCallback(async (prescription: Prescription) => {
    const previousStatus = prescription.status;

    await executeWithUndo({
      message: `Prescription cancelled`,
      description: prescription.medication_name,
      undoDelay: 5000,
      action: async () => {
        // Update to cancelled status
        const { error } = await supabase
          .from('prescriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', prescription.id);

        if (error) throw error;

        return prescription;
      },
      undo: async () => {
        // Restore original status
        const { error } = await supabase
          .from('prescriptions')
          .update({ status: previousStatus, updated_at: new Date().toISOString() })
          .eq('id', prescription.id);

        if (error) throw error;
      },
      invalidateQueries: getPrescriptionQueryKeys(),
    });
  }, [executeWithUndo, getPrescriptionQueryKeys]);

  /**
   * Mark prescription as completed with undo support
   */
  const completePrescriptionWithUndo = useCallback(async (prescription: Prescription) => {
    const previousStatus = prescription.status;

    await executeWithUndo({
      message: `Prescription completed`,
      description: prescription.medication_name,
      undoDelay: 5000,
      action: async () => {
        // Update to completed status
        const { error } = await supabase
          .from('prescriptions')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', prescription.id);

        if (error) throw error;

        return prescription;
      },
      undo: async () => {
        // Restore original status
        const { error } = await supabase
          .from('prescriptions')
          .update({ status: previousStatus, updated_at: new Date().toISOString() })
          .eq('id', prescription.id);

        if (error) throw error;
      },
      invalidateQueries: getPrescriptionQueryKeys(),
    });
  }, [executeWithUndo, getPrescriptionQueryKeys]);

  /**
   * Bulk delete templates with undo support
   */
  const bulkDeleteTemplatesWithUndo = useCallback(async (templates: TreatmentTemplate[]) => {
    // Save snapshots for undo
    templates.forEach(template => {
      deletedTemplates.current.set(template.id, { ...template });
    });

    await executeWithUndo({
      message: `${templates.length} templates deleted`,
      description: 'Click undo to restore all',
      undoDelay: 5000,
      action: async () => {
        // Perform bulk deletion
        const { error } = await supabase
          .from('treatment_templates')
          .delete()
          .in('id', templates.map(t => t.id));

        if (error) throw error;

        templates.forEach(template => deletedTemplates.current.delete(template.id));
      },
      undo: async () => {
        // Restore all templates
        const templatesToRestore = templates
          .map(template => deletedTemplates.current.get(template.id))
          .filter(Boolean) as TreatmentTemplate[];

        if (templatesToRestore.length === 0) return;

        const { error } = await supabase
          .from('treatment_templates')
          .insert(templatesToRestore);

        if (error) throw error;

        templates.forEach(template => deletedTemplates.current.delete(template.id));
      },
      invalidateQueries: getTemplateQueryKeys(),
    });
  }, [executeWithUndo, getTemplateQueryKeys]);

  return {
    deleteTemplateWithUndo,
    deleteTreatmentPlanWithUndo,
    cancelTreatmentPlanWithUndo,
    deletePrescriptionWithUndo,
    cancelPrescriptionWithUndo,
    completePrescriptionWithUndo,
    bulkDeleteTemplatesWithUndo,
  };
}
