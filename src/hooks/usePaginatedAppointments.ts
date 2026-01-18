import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface Appointment {
    id: string;
    appointment_date: string;
    duration_minutes: number;
    status: string;
    urgency: string;
    reason?: string;
    consultation_notes?: string;
    patient_id: string;
    patient_first_name: string;
    patient_last_name: string;
    patient_email: string;
    patient_phone?: string;
    patient_avatar_url?: string;
    created_at: string;
}

interface UsePaginatedAppointmentsOptions {
    dentistId: string;
    businessId?: string | null;
    limit?: number;
    statusFilter?: string | null;
    dateFrom?: Date | null;
    dateTo?: Date | null;
}

interface UsePaginatedAppointmentsReturn {
    appointments: Appointment[];
    isLoading: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    error: Error | null;
}

export function usePaginatedAppointments({
    dentistId,
    businessId,
    limit = 50,
    statusFilter,
    dateFrom,
    dateTo,
}: UsePaginatedAppointmentsOptions): UsePaginatedAppointmentsReturn {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const { toast } = useToast();

    const fetchAppointments = useCallback(async (isInitial: boolean = false) => {
        if (!dentistId) return;

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('get_appointments_paginated', {
                p_dentist_id: dentistId,
                p_business_id: businessId || null,
                p_cursor: isInitial ? null : cursor,
                p_limit: limit,
                p_status_filter: statusFilter || null,
                p_date_from: dateFrom?.toISOString() || null,
                p_date_to: dateTo?.toISOString() || null,
            });

            if (rpcError) {
                throw rpcError;
            }

            if (data && data.length > 0) {
                const newAppointments = data.map((a: Appointment & { has_more?: boolean }) => ({
                    id: a.id,
                    appointment_date: a.appointment_date,
                    duration_minutes: a.duration_minutes,
                    status: a.status,
                    urgency: a.urgency,
                    reason: a.reason,
                    consultation_notes: a.consultation_notes,
                    patient_id: a.patient_id,
                    patient_first_name: a.patient_first_name,
                    patient_last_name: a.patient_last_name,
                    patient_email: a.patient_email,
                    patient_phone: a.patient_phone,
                    patient_avatar_url: a.patient_avatar_url,
                    created_at: a.created_at,
                }));

                if (isInitial) {
                    setAppointments(newAppointments);
                } else {
                    setAppointments(prev => [...prev, ...newAppointments]);
                }

                // Set cursor for next page
                const lastAppointment = newAppointments[newAppointments.length - 1];
                setCursor(lastAppointment.appointment_date);

                // Check if there are more records
                setHasMore(data[0]?.has_more || false);
            } else {
                if (isInitial) {
                    setAppointments([]);
                }
                setHasMore(false);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load appointments');
            logger.error('Error fetching appointments:', error);
            setError(error);
            toast({
                title: 'Error loading appointments',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [dentistId, businessId, cursor, limit, statusFilter, dateFrom, dateTo, toast]);

    // Initial load
    useEffect(() => {
        fetchAppointments(true);
    }, [dentistId, businessId, statusFilter, dateFrom, dateTo]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;
        await fetchAppointments(false);
    }, [fetchAppointments, hasMore, isLoading]);

    const refresh = useCallback(async () => {
        setCursor(null);
        await fetchAppointments(true);
    }, [fetchAppointments]);

    return {
        appointments,
        isLoading,
        hasMore,
        loadMore,
        refresh,
        error,
    };
}
