import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface ImagingSet {
    id: string;
    business_id: string;
    patient_id: string;
    appointment_id: string | null;
    uploaded_by: string;
    imaging_type: 'xray' | 'photo' | 'scan' | 'unknown';
    notes: string | null;
    created_at: string;
    updated_at: string;
    files?: ImagingFile[];
}

export interface ImagingFile {
    id: string;
    imaging_set_id: string;
    storage_path: string;
    filename: string;
    original_filename: string | null;
    mime_type: string;
    size_bytes: number;
    width: number | null;
    height: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
    signedUrl?: string;
}

export interface UploadImagingParams {
    patientId: string;
    appointmentId?: string;
    imagingType?: 'xray' | 'photo' | 'scan' | 'unknown';
    notes?: string;
    files: File[];
}

export function useImaging() {
    const { toast } = useToast();
    const { businessId } = useBusinessContext();
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Fetch imaging sets for a patient or appointment
    const fetchImagingSets = useCallback(async (params: {
        patientId?: string;
        appointmentId?: string;
    }): Promise<ImagingSet[]> => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('imaging_sets')
                .select(`
          *,
          files:imaging_files(*)
        `)
                .order('created_at', { ascending: false });

            if (params.patientId) {
                query = query.eq('patient_id', params.patientId);
            }
            if (params.appointmentId) {
                query = query.eq('appointment_id', params.appointmentId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return (data || []) as ImagingSet[];
        } catch (error: any) {
            console.error('Error fetching imaging sets:', error);
            toast({
                title: 'Error',
                description: 'Failed to load imaging data',
                variant: 'destructive'
            });
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    // Get signed URL for a file
    const getSignedUrl = useCallback(async (fileId: string): Promise<string | null> => {
        try {
            const { data, error } = await supabase.functions.invoke('get-imaging-url', {
                body: { fileId }
            });

            if (error) throw error;
            return data?.url || null;
        } catch (error: any) {
            console.error('Error getting signed URL:', error);
            return null;
        }
    }, []);

    // Upload imaging files
    const uploadImaging = useCallback(async (params: UploadImagingParams): Promise<ImagingSet | null> => {
        if (!businessId) {
            toast({
                title: 'Error',
                description: 'No business context available',
                variant: 'destructive'
            });
            return null;
        }

        setIsLoading(true);
        setUploadProgress(0);

        try {
            // Convert files to base64
            const filesBase64 = await Promise.all(
                params.files.map(async (file, index) => {
                    const buffer = await file.arrayBuffer();
                    const base64 = btoa(
                        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                    );
                    setUploadProgress(((index + 1) / params.files.length) * 50); // 0-50% for encoding
                    return {
                        base64,
                        filename: file.name,
                        mimeType: file.type
                    };
                })
            );

            setUploadProgress(60);

            const { data, error } = await supabase.functions.invoke('upload-imaging', {
                body: {
                    businessId,
                    patientId: params.patientId,
                    appointmentId: params.appointmentId || null,
                    imagingType: params.imagingType || 'unknown',
                    notes: params.notes || null,
                    files: filesBase64
                }
            });

            setUploadProgress(100);

            if (error) throw error;

            toast({
                title: 'Success',
                description: data.message || 'Images uploaded successfully'
            });

            return data.imagingSet as ImagingSet;
        } catch (error: any) {
            console.error('Error uploading imaging:', error);
            toast({
                title: 'Upload Failed',
                description: error.message || 'Failed to upload images',
                variant: 'destructive'
            });
            return null;
        } finally {
            setIsLoading(false);
            setUploadProgress(0);
        }
    }, [businessId, toast]);

    // Delete an imaging set
    const deleteImagingSet = useCallback(async (setId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('imaging_sets')
                .delete()
                .eq('id', setId);

            if (error) throw error;

            toast({
                title: 'Deleted',
                description: 'Imaging set deleted successfully'
            });
            return true;
        } catch (error: any) {
            console.error('Error deleting imaging set:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete imaging set',
                variant: 'destructive'
            });
            return false;
        }
    }, [toast]);

    // Delete a single file
    const deleteImagingFile = useCallback(async (fileId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('imaging_files')
                .delete()
                .eq('id', fileId);

            if (error) throw error;

            toast({
                title: 'Deleted',
                description: 'File deleted successfully'
            });
            return true;
        } catch (error: any) {
            console.error('Error deleting imaging file:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete file',
                variant: 'destructive'
            });
            return false;
        }
    }, [toast]);

    // Get workflow flags for an appointment
    const getWorkflowFlags = useCallback(async (appointmentId: string) => {
        try {
            const { data, error } = await supabase
                .rpc('check_imaging_workflow_flags', { p_appointment_id: appointmentId });

            if (error) throw error;
            return data;
        } catch (error: any) {
            console.error('Error getting workflow flags:', error);
            return null;
        }
    }, []);

    return {
        isLoading,
        uploadProgress,
        fetchImagingSets,
        getSignedUrl,
        uploadImaging,
        deleteImagingSet,
        deleteImagingFile,
        getWorkflowFlags
    };
}
