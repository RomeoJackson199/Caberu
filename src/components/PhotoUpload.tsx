import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Camera, Image, X } from "lucide-react";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { logger } from '@/lib/logger';
import { validateFileName, generateSecureFileName } from '@/lib/fileValidation';

interface PhotoUploadProps {
  onComplete: (photoUrl: string) => void;
  onCancel: () => void;
}

export const PhotoUpload = ({ onComplete, onCancel }: PhotoUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // SECURITY: Validate file name for path traversal attacks
      const fileNameValidation = validateFileName(file.name);
      if (!fileNameValidation.valid) {
        toast({
          title: "Nom de fichier invalide",
          description: fileNameValidation.error,
          variant: "destructive",
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale autorisée est de 5MB",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Type de fichier non supporté",
          description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");

      // SECURITY: Use secure UUID-based filename to prevent enumeration
      const secureFileName = generateSecureFileName(selectedFile.name);
      const storagePath = `${user.id}/${secureFileName}`;

      const { data, error } = await supabase.storage
        .from('dental-photos')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get signed URL for security (private access)
      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from('dental-photos')
        .createSignedUrl(data.path, 3600); // 1 hour expiry

      if (signedUrlError || !signedUrl) {
        throw new Error('Failed to create secure photo URL');
      }

      toast({
        title: "Photo téléchargée avec succès",
        description: "Votre photo a été transmise au dentiste",
      });

      onComplete(signedUrl.signedUrl);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger la photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Camera className="h-5 w-5 mr-2 text-blue-500" />
          Télécharger une photo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <AiDisclaimer />
        <div className="text-sm text-muted-foreground">
          <p>Vous pouvez télécharger une photo de la zone dentaire concernée pour aider le dentiste à mieux comprendre votre situation.</p>
          <p className="mt-2">Formats acceptés : JPG, PNG • Taille max : 5MB</p>
        </div>

        {!preview ? (
          <div>
            <Label htmlFor="photo-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">
                  Cliquez pour sélectionner une photo
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  ou glissez-déposez votre fichier ici
                </p>
              </div>
            </Label>
            <Input
              ref={fileInputRef}
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Aperçu"
                className="w-full h-64 object-cover rounded-lg border"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Image className="h-4 w-4" />
              <span>{selectedFile?.name}</span>
              <span>({Math.round((selectedFile?.size || 0) / 1024)} KB)</span>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <Button 
            onClick={handleUpload} 
            className="flex-1" 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "Téléchargement..." : "Envoyer la photo"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};