import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Upload, X, ZoomIn, ZoomOut, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProfilePictureUploadWithCropProps {
  currentUrl?: string;
  userId: string;
  onUploadComplete: (url: string) => void;
}

export const ProfilePictureUploadWithCrop = ({ 
  currentUrl, 
  userId, 
  onUploadComplete 
}: ProfilePictureUploadWithCropProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create a local URL for cropping
    const localUrl = URL.createObjectURL(file);
    setTempImageUrl(localUrl);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setCropDialogOpen(true);
    
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const maxOffset = 100 * (zoom - 1);
    const newX = Math.max(-maxOffset, Math.min(maxOffset, e.clientX - dragStart.x));
    const newY = Math.max(-maxOffset, Math.min(maxOffset, e.clientY - dragStart.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      });
    }
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const maxOffset = 100 * (zoom - 1);
    const newX = Math.max(-maxOffset, Math.min(maxOffset, e.touches[0].clientX - dragStart.x));
    const newY = Math.max(-maxOffset, Math.min(maxOffset, e.touches[0].clientY - dragStart.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, zoom]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const cropAndUpload = async () => {
    if (!tempImageUrl) return;

    setUploading(true);
    try {
      // Create an image to crop
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = tempImageUrl;
      });

      // Create canvas for cropping (200x200 output)
      const canvas = document.createElement('canvas');
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');

      // Calculate crop area
      const imgAspect = img.width / img.height;
      let srcSize: number;
      let srcX: number;
      let srcY: number;

      if (imgAspect > 1) {
        // Landscape - crop width
        srcSize = img.height;
        srcX = (img.width - srcSize) / 2 - (position.x / 100) * (srcSize / zoom);
        srcY = (img.height - srcSize) / 2 - (position.y / 100) * (srcSize / zoom);
      } else {
        // Portrait - crop height
        srcSize = img.width;
        srcX = (img.width - srcSize) / 2 - (position.x / 100) * (srcSize / zoom);
        srcY = (img.height - srcSize) / 2 - (position.y / 100) * (srcSize / zoom);
      }

      // Adjust for zoom
      srcSize = srcSize / zoom;
      
      // Draw circular clipped image
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      ctx.drawImage(
        img,
        srcX, srcY, srcSize, srcSize,
        0, 0, size, size
      );

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
          'image/png',
          0.95
        );
      });

      // Upload to Supabase
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        throw new Error('You must be signed in to upload a profile picture');
      }
      const folderId = authData.user.id;
      const fileName = `${folderId}/${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);
      setCropDialogOpen(false);
      
      // Clean up temp URL
      URL.revokeObjectURL(tempImageUrl);
      setTempImageUrl(null);

      toast({
        title: "Success",
        description: "Profile picture uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancelCrop = () => {
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl);
      setTempImageUrl(null);
    }
    setCropDialogOpen(false);
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
    onUploadComplete('');
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={previewUrl} />
          <AvatarFallback>
            <User className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById(`profile-pic-crop-${userId}`)?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WEBP. Max 5MB.
          </p>
          <input
            id={`profile-pic-crop-${userId}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCancelCrop()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Profile Picture</DialogTitle>
            <DialogDescription>
              Drag to reposition and use the slider to zoom
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            {/* Circular preview area */}
            <div 
              className="relative w-[200px] h-[200px] rounded-full overflow-hidden border-4 border-primary/20 bg-muted cursor-move select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {tempImageUrl && (
                <img
                  ref={imageRef}
                  src={tempImageUrl}
                  alt="Crop preview"
                  className="absolute w-full h-full object-cover pointer-events-none"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    transformOrigin: 'center',
                  }}
                  draggable={false}
                />
              )}
              
              {/* Circle overlay guide */}
              <div className="absolute inset-0 pointer-events-none">
                <div 
                  className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full"
                  style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }}
                />
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-3 w-full px-4">
              <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleCancelCrop}
                className="flex-1"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={cropAndUpload}
                className="flex-1"
                disabled={uploading}
              >
                {uploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
