import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Upload, X } from "lucide-react";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { logger } from '@/lib/logger';

interface QuickPhotoUploadProps {
  onPhotoUploaded: (url: string) => void;
  onCancel: () => void;
}

export const QuickPhotoUpload = ({ onPhotoUploaded, onCancel }: QuickPhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Generate unique filename with user folder structure
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${timestamp}.${fileExt}`;

      // Validate fileName
      if (fileName.includes('..')) {
        throw new Error("Invalid file name");
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('dental-photos')
        .upload(fileName, file);

      if (error) throw error;

      // Get signed URL (valid for 7 days)
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('dental-photos')
        .createSignedUrl(fileName, 7 * 24 * 60 * 60); // 7 days in seconds

      if (urlError) throw urlError;

      toast({
        title: "Photo uploaded",
        description: "Your photo has been added successfully",
      });

      onPhotoUploaded(signedUrl.signedUrl);

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Unable to upload photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardContent className="p-4">
        <div className="space-y-4">
          <AiDisclaimer />
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-1">
              Add a photo
            </h3>
            <p className="text-sm text-gray-600">
              Photo of the affected area
            </p>
          </div>

          {preview && (
            <div className="relative">
              <img 
                src={preview} 
                alt="Dental issue photo preview" 
                loading="lazy"
                decoding="async"
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1"
                onClick={() => setPreview(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Choose photo"}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
};