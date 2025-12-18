import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileArchive, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface ExportBundle {
  id: string;
  bundle_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  download_count: number;
  expires_at?: string;
  signed_url?: string;
}

export default function DataExportService() {
  const [exporting, setExporting] = useState(false);
  const [exports, setExports] = useState<ExportBundle[]>([]);
  const { toast } = useToast();

  const requestDataExport = async (exportType: 'full_export' | 'portability') => {
    setExporting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create export bundle request
      const { data, error } = await supabase
        .from('gdpr_export_bundles')
        .insert({
          patient_id: profile.id,
          bundle_type: exportType,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger export generation (this would call an edge function)
      const { error: functionError } = await supabase.functions.invoke('generate-data-export', {
        body: { bundleId: data.id, exportType }
      });

      if (functionError) {
        console.error('Export function error:', functionError);
        // Don't throw here - the export might still work
      }

      toast({
        title: "Export requested",
        description: "Your data export has been queued. You'll receive an email when it's ready."
      });

      loadExports();
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const loadExports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('gdpr_export_bundles')
        .select('*')
        .eq('patient_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
        setExports(data?.map(item => ({
          id: item.id,
          bundle_type: item.bundle_type,
          status: item.status as 'pending' | 'processing' | 'completed' | 'failed',
          created_at: item.created_at,
          completed_at: item.completed_at,
          download_count: item.download_count,
          expires_at: item.expires_at,
          signed_url: item.signed_url
        })) || []);
    } catch (error) {
      console.error('Failed to load exports:', error);
    }
  };

  React.useEffect(() => {
    loadExports();
  }, []);

  const downloadExport = async (bundle: ExportBundle) => {
    if (!bundle.signed_url) {
      toast({
        title: "Download not available",
        description: "Export is not ready for download yet.",
        variant: "destructive"
      });
      return;
    }

    // Update download count
    await supabase
      .from('gdpr_export_bundles')
      .update({ download_count: bundle.download_count + 1 })
      .eq('id', bundle.id);

    // Open download URL
    window.open(bundle.signed_url, '_blank');
    
    toast({
      title: "Download started",
      description: "Your data export is being downloaded."
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'failed':
        return <div className="w-4 h-4 bg-red-500 rounded-full" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Request Data Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold">Complete Export</h3>
              <p className="text-sm text-muted-foreground">
                Download all your personal data in JSON format for your records.
              </p>
              <Button 
                onClick={() => requestDataExport('full_export')}
                disabled={exporting}
                className="w-full"
              >
                {exporting ? "Processing..." : "Download Complete Data"}
              </Button>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold">Portability Export</h3>
              <p className="text-sm text-muted-foreground">
                Structured export suitable for importing to another service.
              </p>
              <Button 
                onClick={() => requestDataExport('portability')}
                disabled={exporting}
                variant="outline"
                className="w-full"
              >
                {exporting ? "Processing..." : "Download Portable Data"}
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Data exports are available for 24 hours after generation and will be automatically deleted for security.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {exports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exports.map((bundle) => (
                <div key={bundle.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(bundle.status)}
                    <div>
                      <div className="font-medium capitalize">
                        {bundle.bundle_type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(bundle.created_at).toLocaleDateString()}
                        {bundle.completed_at && (
                          <span> • Completed: {new Date(bundle.completed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {bundle.download_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Downloaded {bundle.download_count} times
                      </span>
                    )}
                    
                    {bundle.status === 'completed' && bundle.signed_url && (
                      <Button 
                        size="sm" 
                        onClick={() => downloadExport(bundle)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}