import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { PatientListItem } from '@/types/patient';

interface UsePaginatedPatientsOptions {
    dentistId: string;
    businessId?: string | null;
    limit?: number;
    searchQuery?: string;
}

interface UsePaginatedPatientsReturn {
    patients: PatientListItem[];
    isLoading: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    error: Error | null;
}

/**
 * Manage paginated retrieval of a dentist's patients with load-more and refresh support.
 *
 * Fetches an initial page of patients and supports loading subsequent pages and refreshing from the start.
 * Shows a destructive toast and sets `error` when fetches fail.
 *
 * @param dentistId - Dentist identifier to fetch patients for
 * @param businessId - Optional business identifier to filter patients
 * @param limit - Maximum number of patients to request per page (defaults to 50)
 * @param searchQuery - Optional text used to filter patients by search
 * @returns An object with:
 *   - `patients`: the current list of loaded patient items
 *   - `isLoading`: whether a fetch is in progress
 *   - `hasMore`: whether more pages may be available
 *   - `loadMore`: function to load the next page
 *   - `refresh`: function to reload from the beginning
 *   - `error`: the last fetch error, or `null` if none
 */
export function usePaginatedPatients({
    dentistId,
    businessId,
    limit = 50,
    searchQuery,
}: UsePaginatedPatientsOptions): UsePaginatedPatientsReturn {
    const [patients, setPatients] = useState<PatientListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const { toast } = useToast();

    const fetchPatients = useCallback(async (isInitial: boolean = false) => {
        if (!dentistId) return;

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('get_dentist_patients', {
                p_dentist_id: dentistId,
                p_business_id: businessId || null,
                p_cursor: isInitial ? null : cursor,
                p_limit: limit,
                p_search: searchQuery || null,
            });

            if (rpcError) {
                throw rpcError;
            }

            if (data && data.length > 0) {
                const newPatients = data.map((p: PatientListItem & { has_more?: boolean }) => ({
                    id: p.id,
                    first_name: p.first_name,
                    last_name: p.last_name,
                    email: p.email,
                    phone: p.phone,
                    date_of_birth: p.date_of_birth,
                    avatar_url: p.avatar_url,
                    medical_history: p.medical_history,
                    created_at: p.created_at,
                }));

                if (isInitial) {
                    setPatients(newPatients);
                } else {
                    setPatients(prev => [...prev, ...newPatients]);
                }

                // Set cursor for next page
                const lastPatient = newPatients[newPatients.length - 1];
                setCursor(lastPatient.created_at);

                // Check if there are more records
                setHasMore(data[0]?.has_more || false);
            } else {
                if (isInitial) {
                    setPatients([]);
                }
                setHasMore(false);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load patients');
            logger.error('Error fetching patients:', error);
            setError(error);
            toast({
                title: 'Error loading patients',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [dentistId, businessId, cursor, limit, searchQuery, toast]);

    // Initial load
    useEffect(() => {
        fetchPatients(true);
    }, [dentistId, businessId, searchQuery]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;
        await fetchPatients(false);
    }, [fetchPatients, hasMore, isLoading]);

    const refresh = useCallback(async () => {
        setCursor(null);
        await fetchPatients(true);
    }, [fetchPatients]);

    return {
        patients,
        isLoading,
        hasMore,
        loadMore,
        refresh,
        error,
    };
}