/**
 * React hook for managing GDPR data subject requests.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitGdprRequest,
  getPatientGdprRequests,
  getPendingGdprRequests,
  updateGdprRequestStatus,
  exportPatientData,
  anonymizePatientData,
  rectifyPatientData,
  objectToProcessing,
  restrictPatientProcessing,
  type GdprRequestType,
  type GdprRequestStatus,
} from '@/lib/gdpr/dataSubjectRights';
import { useToast } from '@/hooks/use-toast';

const GDPR_REQUESTS_KEY = 'gdpr-requests';
const GDPR_PENDING_KEY = 'gdpr-pending-requests';

export function usePatientGdprRequests(patientId: string | undefined) {
  return useQuery({
    queryKey: [GDPR_REQUESTS_KEY, patientId],
    queryFn: () => getPatientGdprRequests(patientId!),
    enabled: !!patientId,
  });
}

export function usePendingGdprRequests() {
  return useQuery({
    queryKey: [GDPR_PENDING_KEY],
    queryFn: getPendingGdprRequests,
    refetchInterval: 60_000,
  });
}

export function useSubmitGdprRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      patientId: string;
      type: GdprRequestType;
      description?: string;
      actorId?: string;
    }) => submitGdprRequest(params.patientId, params.type, params.description, params.actorId),
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({ title: 'GDPR request submitted', description: 'Your request has been recorded and will be processed within 30 days.' });
        queryClient.invalidateQueries({ queryKey: [GDPR_REQUESTS_KEY, variables.patientId] });
        queryClient.invalidateQueries({ queryKey: [GDPR_PENDING_KEY] });
      } else {
        toast({ title: 'Request failed', description: result.error, variant: 'destructive' });
      }
    },
  });
}

export function useUpdateGdprRequestStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      requestId: string;
      status: GdprRequestStatus;
      actorId: string;
      resolutionNotes?: string;
    }) => updateGdprRequestStatus(params.requestId, params.status, params.actorId, params.resolutionNotes),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Request updated' });
        queryClient.invalidateQueries({ queryKey: [GDPR_REQUESTS_KEY] });
        queryClient.invalidateQueries({ queryKey: [GDPR_PENDING_KEY] });
      } else {
        toast({ title: 'Update failed', description: result.error, variant: 'destructive' });
      }
    },
  });
}

export function useExportPatientData() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { patientId: string; requestedBy: string; format?: 'json' | 'csv' }) =>
      exportPatientData(params.patientId, params.requestedBy),
    onSuccess: (result, variables) => {
      if (result.success && result.data) {
        const format = variables.format ?? 'json';
        let blob: Blob;
        let filename: string;
        const dateStr = new Date().toISOString().split('T')[0];

        if (format === 'csv') {
          // Convert to CSV format
          const csvLines: string[] = [];
          for (const [section, records] of Object.entries(result.data)) {
            if (section === 'export_metadata') continue;
            if (Array.isArray(records) && records.length > 0) {
              csvLines.push(`\n--- ${section} ---`);
              const headers = Object.keys(records[0]);
              csvLines.push(headers.join(','));
              for (const record of records) {
                csvLines.push(headers.map(h => {
                  const val = String(record[h] ?? '');
                  return val.includes(',') ? `"${val}"` : val;
                }).join(','));
              }
            }
          }
          blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
          filename = `patient-data-export-${dateStr}.csv`;
        } else {
          blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
          filename = `patient-data-export-${dateStr}.json`;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Data exported', description: `Patient data has been downloaded as ${format.toUpperCase()}.` });
      } else {
        toast({ title: 'Export failed', description: result.error, variant: 'destructive' });
      }
    },
  });
}

export function useAnonymizePatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { patientId: string; actorId: string; reason: string; requestId?: string }) => {
      const result = await anonymizePatientData(params.patientId, params.actorId, params.reason);
      // Also update the GDPR request status if there's an associated request
      if (result.success && params.requestId) {
        await updateGdprRequestStatus(params.requestId, 'completed', params.actorId, 'Patient data anonymized');
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Patient data anonymized', description: 'All personal data has been removed.' });
        queryClient.invalidateQueries({ queryKey: [GDPR_REQUESTS_KEY] });
        queryClient.invalidateQueries({ queryKey: [GDPR_PENDING_KEY] });
      } else {
        toast({ title: 'Anonymization failed', description: result.error, variant: 'destructive' });
      }
    },
  });
}

export function useRectifyPatientData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      patientId: string;
      actorId: string;
      fieldsToCorrect: Record<string, unknown>;
      requestId?: string;
    }) => rectifyPatientData(params.patientId, params.actorId, params.fieldsToCorrect, params.requestId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Data corrected', description: 'Patient data has been updated as requested.' });
        queryClient.invalidateQueries({ queryKey: [GDPR_REQUESTS_KEY] });
        queryClient.invalidateQueries({ queryKey: [GDPR_PENDING_KEY] });
      } else {
        toast({ title: 'Correction failed', description: result.error, variant: 'destructive' });
      }
    },
  });
}

export function useObjectToProcessing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      patientId: string;
      actorId: string;
      processingTypes: string[];
      reason?: string;
      requestId?: string;
    }) => objectToProcessing(params.patientId, params.actorId, params.processingTypes, params.reason, params.requestId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Objection recorded', description: 'Processing has been stopped for the selected categories.' });
        queryClient.invalidateQueries({ queryKey: [GDPR_REQUESTS_KEY] });
        queryClient.invalidateQueries({ queryKey: [GDPR_PENDING_KEY] });
      } else {
        toast({ title: 'Objection failed', description: result.error, variant: 'destructive' });
      }
    },
  });
}

export function useRestrictProcessing() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { patientId: string; actorId: string }) =>
      restrictPatientProcessing(params.patientId, params.actorId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Processing restricted', description: 'Automated processing has been disabled for this patient.' });
      } else {
        toast({ title: 'Restriction failed', description: result.error, variant: 'destructive' });
      }
    },
  });
}
