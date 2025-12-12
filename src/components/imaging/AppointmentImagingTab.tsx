import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Image, AlertTriangle } from 'lucide-react';
import { ImagingGallery } from './ImagingGallery';
import { ImagingUploader } from './ImagingUploader';
import { useImaging } from '@/hooks/useImaging';
import { cn } from '@/lib/utils';

interface AppointmentImagingTabProps {
    patientId: string;
    appointmentId: string;
    className?: string;
}

export function AppointmentImagingTab({
    patientId,
    appointmentId,
    className
}: AppointmentImagingTabProps) {
    const { getWorkflowFlags } = useImaging();
    const [showUploader, setShowUploader] = useState(false);
    const [imagingCount, setImagingCount] = useState(0);
    const [workflowFlags, setWorkflowFlags] = useState<{
        has_imaging: boolean;
        has_imaging_notes: boolean;
        has_treatment: boolean;
        warning_imaging_without_notes: boolean;
        warning_treatment_without_imaging: boolean;
    } | null>(null);

    // Load workflow flags
    React.useEffect(() => {
        const loadFlags = async () => {
            const flags = await getWorkflowFlags(appointmentId);
            setWorkflowFlags(flags);
        };
        loadFlags();
    }, [appointmentId, getWorkflowFlags, imagingCount]);

    const handleUploadComplete = useCallback(() => {
        setShowUploader(false);
        // Trigger refresh via count change
        setImagingCount(prev => prev + 1);
    }, []);

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    <h3 className="font-semibold">Imaging</h3>
                    {imagingCount > 0 && (
                        <Badge variant="secondary">{imagingCount}</Badge>
                    )}
                </div>
                <Button
                    variant={showUploader ? "outline" : "default"}
                    size="sm"
                    onClick={() => setShowUploader(!showUploader)}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    {showUploader ? 'Cancel' : 'Upload'}
                </Button>
            </div>

            {/* Workflow Warnings */}
            {workflowFlags?.warning_imaging_without_notes && (
                <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription>
                        Imaging uploaded but no notes added. Consider adding clinical notes.
                    </AlertDescription>
                </Alert>
            )}
            {workflowFlags?.warning_treatment_without_imaging && (
                <Alert variant="default" className="border-orange-500/50 bg-orange-500/10">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <AlertDescription>
                        Treatment recorded but no imaging attached to this appointment.
                    </AlertDescription>
                </Alert>
            )}

            {/* Uploader */}
            {showUploader && (
                <ImagingUploader
                    patientId={patientId}
                    appointmentId={appointmentId}
                    onUploadComplete={handleUploadComplete}
                    onCancel={() => setShowUploader(false)}
                />
            )}

            {/* Gallery */}
            <ImagingGallery
                key={`gallery-${imagingCount}`}
                patientId={patientId}
                appointmentId={appointmentId}
                onImagingCountChange={setImagingCount}
                showHeader={false}
            />
        </div>
    );
}
