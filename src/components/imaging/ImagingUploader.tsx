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

    const [files, setFiles] = useState<File[]>([]);
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

        setFiles(prev => [...prev, ...valid]);
        setErrors(newErrors);
    }, [validateFiles]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const { valid, errors: newErrors } = validateFiles(selectedFiles);

            setFiles(prev => [...prev, ...valid]);
            setErrors(newErrors);
        }
    }, [validateFiles]);

    const removeFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleUpload = async () => {
        if (files.length === 0) return;

        const params: UploadImagingParams = {
            patientId,
            appointmentId,
            imagingType,
            notes: notes || undefined,
            files
        };

        const result = await uploadImaging(params);

        if (result) {
            setFiles([]);
            setNotes('');
            setImagingType('unknown');
            onUploadComplete?.();
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader>
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
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
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
                    <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">
                        Drag & drop files here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                        JPG, PNG, WebP, PDF • Max 50MB each
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

                {/* Selected Files */}
                {files.length > 0 && (
                    <div className="space-y-2">
                        <Label>Selected Files ({files.length})</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{file.name}</span>
                                        <span className="text-muted-foreground shrink-0">
                                            ({formatFileSize(file.size)})
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(index);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                        id="notes"
                        placeholder="Add notes about these images..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Upload Progress */}
                {isLoading && uploadProgress > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={handleUpload}
                        disabled={files.length === 0 || isLoading}
                    >
                        {isLoading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
