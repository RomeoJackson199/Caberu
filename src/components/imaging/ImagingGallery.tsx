import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Image, Trash2, Calendar, Clock, Scan, Camera, FileText, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImaging, ImagingSet, ImagingFile } from '@/hooks/useImaging';
import { ImagingViewer } from './ImagingViewer';
import { format } from 'date-fns';

interface ImagingGalleryProps {
    patientId?: string;
    appointmentId?: string;
    onImagingCountChange?: (count: number) => void;
    className?: string;
    showHeader?: boolean;
    compact?: boolean;
}

const imagingTypeIcons = {
    xray: Scan,
    photo: Camera,
    scan: FileText,
    unknown: Image,
};

const imagingTypeLabels = {
    xray: 'X-Ray',
    photo: 'Photo',
    scan: 'Scan',
    unknown: 'Other',
};

export function ImagingGallery({
    patientId,
    appointmentId,
    onImagingCountChange,
    className,
    showHeader = true,
    compact = false
}: ImagingGalleryProps) {
    const { fetchImagingSets, getSignedUrl, deleteImagingSet, deleteImagingFile, isLoading } = useImaging();

    const [imagingSets, setImagingSets] = useState<ImagingSet[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentImages, setCurrentImages] = useState<Array<{ url: string; filename: string; mimeType: string }>>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    // Fetch imaging sets
    const loadImagingSets = useCallback(async () => {
        const sets = await fetchImagingSets({ patientId, appointmentId });
        setImagingSets(sets);

        // Count total files
        const totalFiles = sets.reduce((acc, set) => acc + (set.files?.length || 0), 0);
        onImagingCountChange?.(totalFiles);
    }, [fetchImagingSets, patientId, appointmentId, onImagingCountChange]);

    useEffect(() => {
        loadImagingSets();
    }, [loadImagingSets]);

    // Load thumbnails
    useEffect(() => {
        const loadThumbnails = async () => {
            const newThumbnails: Record<string, string> = {};
            for (const set of imagingSets) {
                for (const file of (set.files || [])) {
                    if (file.mime_type.startsWith('image/') && !thumbnails[file.id]) {
                        const url = await getSignedUrl(file.id);
                        if (url) {
                            newThumbnails[file.id] = url;
                        }
                    }
                }
            }
            if (Object.keys(newThumbnails).length > 0) {
                setThumbnails(prev => ({ ...prev, ...newThumbnails }));
            }
        };
        loadThumbnails();
    }, [imagingSets, getSignedUrl, thumbnails]);

    // Filter sets by type
    const filteredSets = filterType === 'all'
        ? imagingSets
        : imagingSets.filter(set => set.imaging_type === filterType);

    // Open image in viewer
    const openImage = useCallback(async (file: ImagingFile, allFiles: ImagingFile[]) => {
        const urls: Array<{ url: string; filename: string; mimeType: string }> = [];

        for (const f of allFiles) {
            const url = thumbnails[f.id] || await getSignedUrl(f.id);
            if (url) {
                urls.push({ url, filename: f.filename, mimeType: f.mime_type });
            }
        }

        const index = allFiles.findIndex(f => f.id === file.id);
        setCurrentImages(urls);
        setCurrentImageIndex(index >= 0 ? index : 0);
        setViewerOpen(true);
    }, [getSignedUrl, thumbnails]);

    // Handle delete
    const handleDeleteSet = async (setId: string) => {
        const success = await deleteImagingSet(setId);
        if (success) {
            loadImagingSets();
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        const success = await deleteImagingFile(fileId);
        if (success) {
            loadImagingSets();
        }
    };

    if (isLoading && imagingSets.length === 0) {
        return (
            <div className={cn("space-y-4", className)}>
                {showHeader && <Skeleton className="h-8 w-48" />}
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (imagingSets.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No imaging files yet</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {showHeader && (
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Imaging Files</h3>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="xray">X-Rays</SelectItem>
                            <SelectItem value="photo">Photos</SelectItem>
                            <SelectItem value="scan">Scans</SelectItem>
                            <SelectItem value="unknown">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-4">
                {filteredSets.map(set => {
                    const Icon = imagingTypeIcons[set.imaging_type] || Image;
                    const files = set.files || [];

                    return (
                        <Card key={set.id} className={cn(compact && "shadow-sm")}>
                            <CardHeader className={cn("pb-2", compact && "p-3")}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <Badge variant="secondary" className="text-xs">
                                            {imagingTypeLabels[set.imaging_type]}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {files.length} file{files.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(set.created_at), 'MMM d, yyyy')}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete imaging set?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete all {files.length} file(s) in this set.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteSet(set.id)}>
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                {set.notes && (
                                    <p className="text-sm text-muted-foreground mt-1">{set.notes}</p>
                                )}
                            </CardHeader>
                            <CardContent className={cn("pt-0", compact && "p-3 pt-0")}>
                                <div className={cn(
                                    "grid gap-2",
                                    compact ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
                                )}>
                                    {files.map(file => (
                                        <div
                                            key={file.id}
                                            className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 ring-primary transition-all"
                                            onClick={() => openImage(file, files)}
                                        >
                                            {file.mime_type.startsWith('image/') && thumbnails[file.id] ? (
                                                <img
                                                    src={thumbnails[file.id]}
                                                    alt={file.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <ImagingViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                imageUrl={currentImages[currentImageIndex]?.url || ''}
                filename={currentImages[currentImageIndex]?.filename}
                mimeType={currentImages[currentImageIndex]?.mimeType}
                images={currentImages}
                currentIndex={currentImageIndex}
                onNavigate={setCurrentImageIndex}
            />
        </div>
    );
}
