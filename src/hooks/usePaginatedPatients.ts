import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    avatar_url?: string;
    medical_history?: string;
    created_at: string;
}

interface UsePaginatedPatientsOptions {
    dentistId: string;
    businessId?: string | null;
    limit?: number;
    searchQuery?: string;
}

interface UsePaginatedPatientsReturn {
    patients: Patient[];
    isLoading: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    error: Error | null;
}

export function usePaginatedPatients({
    dentistId,
    businessId,
    limit = 50,
    searchQuery,
}: UsePaginatedPatientsOptions): UsePaginatedPatientsReturn {
    const [patients, setPatients] = useState<Patient[]>([]);
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
                const newPatients = data.map((p: any) => ({
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
        } catch (err: any) {
            logger.error('Error fetching patients:', err);
            setError(err);
            toast({
                title: 'Error loading patients',
                description: err.message || 'Failed to load patients',
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
