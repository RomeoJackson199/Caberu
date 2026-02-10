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
    refetchInterval: 60_000, // Refresh every minute
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
    mutationFn: (params: { patientId: string; requestedBy: string }) =>
      exportPatientData(params.patientId, params.requestedBy),
    onSuccess: (result) => {
      if (result.success && result.data) {
        // Trigger download of JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patient-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Data exported', description: 'Patient data has been downloaded.' });
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
    mutationFn: (params: { patientId: string; actorId: string; reason: string }) =>
      anonymizePatientData(params.patientId, params.actorId, params.reason),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Patient data anonymized', description: 'All personal data has been removed.' });
        queryClient.invalidateQueries();
      } else {
        toast({ title: 'Anonymization failed', description: result.error, variant: 'destructive' });
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
