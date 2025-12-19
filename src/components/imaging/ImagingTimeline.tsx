import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar, Eye, ZoomIn, Columns2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImaging, ImagingSet, ImagingFile } from '@/hooks/useImaging';
import { ImagingViewer } from './ImagingViewer';
import { format } from 'date-fns';

interface ImagingTimelineProps {
    patientId?: string;
    treatmentPlanId?: string;
    className?: string;
}

export function ImagingTimeline({
    patientId,
    treatmentPlanId,
    className
}: ImagingTimelineProps) {
    const { fetchImagingSets, getSignedUrl, isLoading } = useImaging();

    const [imagingSets, setImagingSets] = useState<ImagingSet[]>([]);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentImages, setCurrentImages] = useState<Array<{ url: string; filename: string; mimeType: string; date: string }>>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Comparison mode
    const [compareMode, setCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
    const [compareImages, setCompareImages] = useState<Array<{ url: string; date: string; filename: string }>>([]);
    const [compareSliderValue, setCompareSliderValue] = useState(50);

    // Fetch imaging sets
    useEffect(() => {
        const load = async () => {
            const sets = await fetchImagingSets({ patientId });
            // If treatmentPlanId, filter sets linked to that plan
            // For now, show all patient imaging sorted by date
            setImagingSets(sets);
        };
        if (patientId) load();
    }, [fetchImagingSets, patientId, treatmentPlanId]);

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
    }, [imagingSets, getSignedUrl]);

    // Flatten all images with dates
    const allImages = useMemo(() => {
        const images: Array<{ file: ImagingFile; set: ImagingSet }> = [];
        for (const set of imagingSets) {
            for (const file of (set.files || [])) {
                images.push({ file, set });
            }
        }
        return images.sort((a, b) =>
            new Date(a.set.created_at).getTime() - new Date(b.set.created_at).getTime()
        );
    }, [imagingSets]);

    const openImage = async (file: ImagingFile, set: ImagingSet) => {
        const url = thumbnails[file.id] || await getSignedUrl(file.id);
        if (url) {
            setCurrentImages([{
                url,
                filename: file.filename,
                mimeType: file.mime_type,
                date: format(new Date(set.created_at), 'MMM d, yyyy')
            }]);
            setCurrentImageIndex(0);
            setViewerOpen(true);
        }
    };

    const toggleCompareSelect = (fileId: string) => {
        setSelectedForCompare(prev => {
            if (prev.includes(fileId)) {
                return prev.filter(id => id !== fileId);
            }
            if (prev.length >= 2) {
                return [prev[1], fileId]; // Replace oldest selection
            }
            return [...prev, fileId];
        });
    };

    const startCompare = useCallback(async () => {
        if (selectedForCompare.length !== 2) return;

        const images: Array<{ url: string; date: string; filename: string }> = [];
        for (const fileId of selectedForCompare) {
            const img = allImages.find(i => i.file.id === fileId);
            if (img) {
                const url = thumbnails[fileId] || await getSignedUrl(fileId);
                if (url) {
                    images.push({
                        url,
                        date: format(new Date(img.set.created_at), 'MMM d, yyyy'),
                        filename: img.file.filename
                    });
                }
            }
        }
        setCompareImages(images);
    }, [selectedForCompare, allImages, thumbnails, getSignedUrl]);

    useEffect(() => {
        if (selectedForCompare.length === 2) {
            startCompare();
        } else {
            setCompareImages([]);
        }
    }, [selectedForCompare, startCompare]);

    if (isLoading && imagingSets.length === 0) {
        return (
            <div className={cn("space-y-4", className)}>
                <div className="flex items-center justify-between">
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
                </div>
                <div className="flex gap-3 overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-shrink-0 w-28">
                            <div className="aspect-square bg-muted animate-pulse rounded-lg" />
                            <div className="mt-1.5 space-y-1">
                                <div className="h-3 w-14 bg-muted animate-pulse rounded mx-auto" />
                                <div className="h-2 w-10 bg-muted animate-pulse rounded mx-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (allImages.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No imaging timeline</p>
                <p className="text-sm">Images will appear here as they are uploaded</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header with compare toggle */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Image Timeline</h3>
                <Button
                    variant={compareMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                        setCompareMode(!compareMode);
                        setSelectedForCompare([]);
                    }}
                    className="gap-2"
                >
                    <Columns2 className="h-4 w-4" />
                    {compareMode ? 'Exit Compare' : 'Compare'}
                </Button>
            </div>

            {compareMode && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Select 2 images to compare side-by-side
                    </span>
                    {selectedForCompare.length > 0 && (
                        <span className="font-medium text-primary">({selectedForCompare.length}/2 selected)</span>
                    )}
                </div>
            )}

            {/* Side-by-side comparison view */}
            {compareImages.length === 2 && (
                <Card className="overflow-hidden">
                    <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Before / After Comparison</CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setSelectedForCompare([]);
                                    setCompareImages([]);
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative aspect-video overflow-hidden">
                            {/* Image 1 (left) */}
                            <div
                                className="absolute inset-0 overflow-hidden"
                                style={{ clipPath: `inset(0 ${100 - compareSliderValue}% 0 0)` }}
                            >
                                <img
                                    src={compareImages[0].url}
                                    alt={compareImages[0].filename}
                                    className="w-full h-full object-contain"
                                />
                                <Badge className="absolute bottom-2 left-2 bg-background/80">
                                    {compareImages[0].date}
                                </Badge>
                            </div>

                            {/* Image 2 (right) */}
                            <div
                                className="absolute inset-0 overflow-hidden"
                                style={{ clipPath: `inset(0 0 0 ${compareSliderValue}%)` }}
                            >
                                <img
                                    src={compareImages[1].url}
                                    alt={compareImages[1].filename}
                                    className="w-full h-full object-contain"
                                />
                                <Badge className="absolute bottom-2 right-2 bg-background/80">
                                    {compareImages[1].date}
                                </Badge>
                            </div>

                            {/* Slider handle */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize hover:w-1.5 transition-all"
                                style={{ left: `${compareSliderValue}%` }}
                                role="slider"
                                aria-label="Image comparison slider - drag to compare before and after"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={compareSliderValue}
                                tabIndex={0}
                            />
                        </div>
                        <div className="p-4">
                            <Slider
                                value={[compareSliderValue]}
                                onValueChange={([v]) => setCompareSliderValue(v)}
                                min={0}
                                max={100}
                                step={1}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Timeline scroll */}
            <div className="overflow-x-auto pb-2">
                <div className="flex gap-3 min-w-max">
                    {allImages.map(({ file, set }) => (
                        <div
                            key={file.id}
                            className={cn(
                                "relative flex-shrink-0 w-28 cursor-pointer group",
                                compareMode && selectedForCompare.includes(file.id) && "ring-2 ring-primary rounded-lg"
                            )}
                            onClick={() => {
                                if (compareMode) {
                                    toggleCompareSelect(file.id);
                                } else {
                                    openImage(file, set);
                                }
                            }}
                        >
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                                {thumbnails[file.id] ? (
                                    <img
                                        src={thumbnails[file.id]}
                                        alt={file.filename}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Eye className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    {compareMode ? (
                                        <span className="text-white text-xs">
                                            {selectedForCompare.includes(file.id) ? 'Selected' : 'Select'}
                                        </span>
                                    ) : (
                                        <ZoomIn className="h-5 w-5 text-white" />
                                    )}
                                </div>
                            </div>
                            <div className="mt-1.5 text-center">
                                <p className="text-xs font-medium truncate">{format(new Date(set.created_at), 'MMM d')}</p>
                                <p className="text-[10px] text-muted-foreground">{format(new Date(set.created_at), 'yyyy')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ImagingViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                imageUrl={currentImages[currentImageIndex]?.url || ''}
                filename={currentImages[currentImageIndex]?.filename}
                mimeType={currentImages[currentImageIndex]?.mimeType}
            />
        </div>
    );
}
