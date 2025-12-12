import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagingViewerProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    filename?: string;
    mimeType?: string;
    // For gallery navigation
    images?: Array<{ url: string; filename: string; mimeType: string }>;
    currentIndex?: number;
    onNavigate?: (index: number) => void;
}

export function ImagingViewer({
    isOpen,
    onClose,
    imageUrl,
    filename = 'Image',
    mimeType = 'image/jpeg',
    images,
    currentIndex = 0,
    onNavigate
}: ImagingViewerProps) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const isPdf = mimeType === 'application/pdf';
    const isDicom = mimeType === 'application/dicom';
    const hasMultiple = images && images.length > 1;

    // Reset state when image changes
    useEffect(() => {
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    }, [imageUrl]);

    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev + 0.25, 4));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev - 0.25, 0.25));
    }, []);

    const handleRotate = useCallback(() => {
        setRotation(prev => (prev + 90) % 360);
    }, []);

    const handleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    const handleDownload = useCallback(() => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        link.click();
    }, [imageUrl, filename]);

    const handlePrev = useCallback(() => {
        if (onNavigate && currentIndex > 0) {
            onNavigate(currentIndex - 1);
        }
    }, [onNavigate, currentIndex]);

    const handleNext = useCallback(() => {
        if (onNavigate && images && currentIndex < images.length - 1) {
            onNavigate(currentIndex + 1);
        }
    }, [onNavigate, images, currentIndex]);

    // Mouse drag for panning
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            switch (e.key) {
                case '+':
                case '=':
                    handleZoomIn();
                    break;
                case '-':
                    handleZoomOut();
                    break;
                case 'r':
                    handleRotate();
                    break;
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    handlePrev();
                    break;
                case 'ArrowRight':
                    handleNext();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleZoomIn, handleZoomOut, handleRotate, onClose, handlePrev, handleNext]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
                <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm p-4 flex flex-row items-center justify-between">
                    <DialogTitle className="text-sm font-medium truncate max-w-[300px]">
                        {filename}
                        {hasMultiple && ` (${currentIndex + 1}/${images?.length})`}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out (-)">
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In (+)">
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate (R)">
                            <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleFullscreen} title="Fullscreen">
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} title="Close (Esc)">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Navigation arrows */}
                {hasMultiple && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/50 hover:bg-background/80"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/50 hover:bg-background/80"
                            onClick={handleNext}
                            disabled={currentIndex === (images?.length ?? 0) - 1}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </>
                )}

                {/* Image/Content area */}
                <div
                    className={cn(
                        "flex items-center justify-center w-full h-full bg-muted/50 overflow-hidden pt-16",
                        zoom > 1 && "cursor-grab",
                        isDragging && "cursor-grabbing"
                    )}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {isPdf ? (
                        <iframe
                            src={`${imageUrl}#toolbar=0`}
                            className="w-full h-full"
                            title={filename}
                        />
                    ) : isDicom ? (
                        <div className="text-center p-8">
                            <p className="text-muted-foreground mb-4">DICOM viewer coming soon</p>
                            <Button onClick={handleDownload}>Download DICOM File</Button>
                        </div>
                    ) : (
                        <img
                            src={imageUrl}
                            alt={filename}
                            className="max-w-full max-h-full object-contain select-none"
                            style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                                transition: isDragging ? 'none' : 'transform 0.2s ease'
                            }}
                            draggable={false}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
