import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface ProfilePictureUploadProps {
  currentUrl?: string;
  userId: string;
  onUploadComplete: (url: string) => void;
}

export const ProfilePictureUpload = ({ currentUrl, userId, onUploadComplete }: ProfilePictureUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
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

    setUploading(true);
    try {
      // Ensure we're using the authenticated user's ID to satisfy RLS
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        throw new Error('You must be signed in to upload a profile picture');
      }
      const folderId = authData.user.id;

      // Create file path under user's folder (matches storage RLS)
      const fileExt = file.name.split('.').pop();
      const fileName = `${folderId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      if (fileName.includes('..')) {
        throw new Error('Invalid file name');
      }
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);

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

  const handleRemove = () => {
    setPreviewUrl(undefined);
    onUploadComplete('');
  };

  return (
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
            onClick={() => document.getElementById(`profile-pic-${userId}`)?.click()}
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
          id={`profile-pic-${userId}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
};
