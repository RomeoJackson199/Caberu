import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateFileName, generateSecureFileName } from '@/lib/fileValidation';

export interface AIKnowledgeDocument {
  id: string;
  business_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  content: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const useAIKnowledgeDocuments = (businessId: string | undefined) => {
  const [documents, setDocuments] = useState<AIKnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_knowledge_documents')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load knowledge documents',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [businessId, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (file: File): Promise<boolean> => {
    if (!businessId) {
      toast({
        title: 'Error',
        description: 'Business ID not found',
        variant: 'destructive',
      });
      return false;
    }

    // SECURITY: Validate file name for path traversal attacks
    const fileNameValidation = validateFileName(file.name);
    if (!fileNameValidation.valid) {
      toast({
        title: 'Invalid file name',
        description: fileNameValidation.error,
        variant: 'destructive',
      });
      return false;
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'application/pdf', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, TXT, MD, DOC, or DOCX file',
        variant: 'destructive',
      });
      return false;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return false;
    }

    setIsUploading(true);
    try {
      // SECURITY: Use secure UUID-based filename to prevent enumeration
      const secureFileName = generateSecureFileName(file.name);
      const storagePath = `${businessId}/${secureFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ai-knowledge-documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Extract text content from file
      let content = '';
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        content = await file.text();
      } else if (file.type === 'application/pdf' ||
                 file.type === 'application/msword' ||
                 file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For PDF/DOC files, show a helpful message
        toast({
          title: 'Note',
          description: 'PDF and Word documents are uploaded successfully. For best results, also upload a TXT version with the key information extracted.',
          duration: 8000,
        });
        content = `[${file.name} uploaded - For full AI integration, please also upload a text (.txt) version with key information extracted from this document]`;
      } else {
        // For other file types, we'll store just the file reference
        content = `[${file.type} document - content pending extraction]`;
      }

      // Create database record
      const { error: dbError } = await supabase
        .from('ai_knowledge_documents')
        .insert({
          business_id: businessId,
          file_name: file.name,
          file_path: storagePath,
          file_type: file.type,
          content: content.substring(0, 50000), // Limit to 50k chars
          status: 'active',
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('ai-knowledge-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Update database record to inactive
      const { error: dbError } = await supabase
        .from('ai_knowledge_documents')
        .update({ status: 'inactive' })
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });

      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  return {
    documents,
    isLoading,
    isUploading,
    uploadDocument,
    deleteDocument,
    refreshDocuments: fetchDocuments,
  };
};
