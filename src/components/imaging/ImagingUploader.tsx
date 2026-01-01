import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image, FileText, Camera, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImaging, UploadImagingParams } from '@/hooks/useImaging';

interface ImagingUploaderProps {
    patientId: string;
    appointmentId?: string;
    onUploadComplete?: () => void;
    onCancel?: () => void;
    className?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const imagingTypeOptions = [
    { value: 'xray', label: 'X-Ray', icon: Scan },
    { value: 'photo', label: 'Photo', icon: Camera },
    { value: 'scan', label: 'Scan', icon: FileText },
    { value: 'unknown', label: 'Other', icon: Image },
] as const;

export function ImagingUploader({
    patientId,
    appointmentId,
    onUploadComplete,
    onCancel,
    className
}: ImagingUploaderProps) {
    const { uploadImaging, isLoading, uploadProgress } = useImaging();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imagingType, setImagingType] = useState<'xray' | 'photo' | 'scan' | 'unknown'>('unknown');
    const [notes, setNotes] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const validateFiles = useCallback((newFiles: File[]): { valid: File[]; errors: string[] } => {
        const valid: File[] = [];
        const errors: string[] = [];

        for (const file of newFiles) {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                errors.push(`${file.name}: Invalid file type. Accepted: JPG, PNG, WebP, PDF`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name}: File too large. Maximum: 50MB`);
                continue;
            }
            valid.push(file);
        }

        return { valid, errors };
    }, []);

    // Auto-upload function
    const autoUpload = useCallback(async (filesToUpload: File[]) => {
        if (filesToUpload.length === 0) return;

        const params: UploadImagingParams = {
            patientId,
            appointmentId,
            imagingType,
            notes: notes || undefined,
            files: filesToUpload
        };

        const result = await uploadImaging(params);

        if (result) {
            setNotes('');
            onUploadComplete?.();
        }
    }, [patientId, appointmentId, imagingType, notes, uploadImaging, onUploadComplete]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const { valid, errors: newErrors } = validateFiles(droppedFiles);

        setErrors(newErrors);
        
        if (valid.length > 0) {
            autoUpload(valid);
        }
    }, [validateFiles, autoUpload]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const { valid, errors: newErrors } = validateFiles(selectedFiles);

            setErrors(newErrors);
            
            if (valid.length > 0) {
                autoUpload(valid);
            }
            
            e.target.value = '';
        }
    }, [validateFiles, autoUpload]);

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Imaging
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Imaging Type Selector */}
                <div className="space-y-2">
                    <Label>Imaging Type</Label>
                    <Select value={imagingType} onValueChange={(v) => setImagingType(v as typeof imagingType)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            {imagingTypeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                        <option.icon className="h-4 w-4" />
                                        {option.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Drop Zone */}
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                        dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                        isLoading && "opacity-50 pointer-events-none"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPTED_TYPES.join(',')}
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">
                        Tap to select files
                    </p>
                    <p className="text-xs text-muted-foreground">
                        JPG, PNG, WebP, PDF • Auto-uploads on select
                    </p>
                </div>

                {/* Error messages */}
                {errors.length > 0 && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md space-y-1">
                        {errors.map((error, i) => (
                            <p key={i}>{error}</p>
                        ))}
                    </div>
                )}

                {/* Notes (optional, can be set before selecting files) */}
                <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional - set before upload)</Label>
                    <Textarea
                        id="notes"
                        placeholder="Add notes about these images..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        disabled={isLoading}
                    />
                </div>

                {/* Upload Progress */}
                {isLoading && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                    </div>
                )}

                {/* Cancel Button */}
                {onCancel && (
                    <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                            {isLoading ? 'Uploading...' : 'Close'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
