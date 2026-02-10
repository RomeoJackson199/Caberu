/**
 * React hook for managing patient consent.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  grantConsent,
  withdrawConsent,
  getPatientConsents,
  hasConsent,
  type ConsentScope,
} from '@/lib/gdpr/consentManager';
import { useToast } from '@/hooks/use-toast';

const CONSENT_KEY = 'patient-consents';

export function usePatientConsents(patientId: string | undefined) {
  return useQuery({
    queryKey: [CONSENT_KEY, patientId],
    queryFn: () => getPatientConsents(patientId!),
    enabled: !!patientId,
  });
}

export function useHasConsent(patientId: string | undefined, scope: ConsentScope) {
  return useQuery({
    queryKey: [CONSENT_KEY, patientId, scope],
    queryFn: () => hasConsent(patientId!, scope),
    enabled: !!patientId,
  });
}

export function useGrantConsent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      patientId: string;
      scope: ConsentScope;
      actorId: string;
      legalBasis?: string;
    }) => grantConsent({
      patientId: params.patientId,
      scope: params.scope,
      actorId: params.actorId,
      legalBasis: params.legalBasis,
    }),
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({ title: 'Consent recorded' });
        queryClient.invalidateQueries({ queryKey: [CONSENT_KEY, variables.patientId] });
      } else {
        toast({ title: 'Failed to record consent', description: result.error, variant: 'destructive' });
      }
    },
  });
}

export function useWithdrawConsent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      patientId: string;
      scope: ConsentScope;
      actorId: string;
    }) => withdrawConsent(params.patientId, params.scope, params.actorId),
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({ title: 'Consent withdrawn' });
        queryClient.invalidateQueries({ queryKey: [CONSENT_KEY, variables.patientId] });
      } else {
        toast({ title: 'Failed to withdraw consent', description: result.error, variant: 'destructive' });
      }
    },
  });
}
