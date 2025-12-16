import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImportFieldMapper } from './ImportFieldMapper';
import { ImportHistory } from './ImportHistory';
import { logger } from '@/lib/logger';

interface ImportSession {
  id: string;
  sessionId?: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed';
  total_records?: number;
  totalRecords?: number;
  successful_records?: number;
  successCount?: number;
  failed_records?: number;
  failureCount?: number;
  created_at: string;
  error_details?: any[];
  errors?: any[];
}

export default function DataImportManager() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importType, setImportType] = useState<'patients' | 'appointments' | 'inventory'>('patients');
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    
    // Preview first few rows
    const text = await file.text();
    const rows = text.split('\n').slice(0, 6).map(row => 
      row.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );
    setCsvPreview(rows);

    // Auto-suggest field mappings for patients
    if (importType === 'patients') {
      const headers = rows[0];
      const mapping: Record<string, string> = {};
      
      headers.forEach(header => {
        const lower = header.toLowerCase();
        if (lower.includes('first') && lower.includes('name')) mapping[header] = 'first_name';
        else if (lower.includes('last') && lower.includes('name')) mapping[header] = 'last_name';
        else if (lower.includes('email')) mapping[header] = 'email';
        else if (lower.includes('phone')) mapping[header] = 'phone';
        else if (lower.includes('birth') || lower.includes('dob')) mapping[header] = 'date_of_birth';
        else if (lower.includes('address')) mapping[header] = 'address';
        else if (lower.includes('medical') && lower.includes('history')) mapping[header] = 'medical_history';
      });
      
      setFieldMapping(mapping);
    }
  }, [importType, toast]);

  // Test function to verify edge function connectivity
  const testFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-csv-import', {
        body: { test: true }
      });
      
      if (error && error.message?.includes('Missing required fields')) {
        // This is expected for a test request, function is working
        toast({
          title: "Connection test successful",
          description: "Edge function is responding correctly",
        });
        return true;
      } else if (error) {
        console.error('Function test error:', error);
        toast({
          title: "Connection test failed",
          description: error.message || "Edge function not responding",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.error('Test function error:', error);
      toast({
        title: "Connection test failed", 
        description: error.message || "Cannot reach edge function",
        variant: "destructive"
      });
      return false;
    }
  };

  // Retry logic for failed requests
  const retryRequest = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive"
      });
      return;
    }

    if (Object.keys(fieldMapping).length === 0) {
      toast({
        title: "No field mapping",
        description: "Please map at least one CSV field to a profile field",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);

    try {
      // First test the connection
      const connectionWorking = await testFunction();
      if (!connectionWorking) {
        throw new Error('Edge function is not responding. Please try again later.');
      }

      // Get current user's dentist ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // First get the user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('Profile fetch error:', profileError);
        throw new Error('User profile not found');
      }

      if (userProfile.role !== 'dentist') {
        throw new Error('Only dentists can import patient data');
      }

      // Get dentist record
      const { data: dentist, error: dentistError } = await supabase
        .from('dentists')
        .select('id')
        .eq('profile_id', userProfile.id)
        .single();

      if (dentistError || !dentist) {
        console.error('Dentist fetch error:', dentistError);
        throw new Error('Dentist profile not found. Please contact support.');
      }

      const csvData = await selectedFile.text();

      // Use retry logic for the import request
      const result = await retryRequest(async () => {
        const { data, error } = await supabase.functions.invoke('process-csv-import', {
          body: {
            csvData,
            fieldMapping,
            importType,
            dentistId: dentist.id,
            filename: selectedFile.name,
            sendEmails: false
          },
          headers: {
            'x-user-id': session.user.id
          }
        });

        if (error) {
          console.error('Function invocation error:', error);
          throw new Error(`Function error: ${error.message || JSON.stringify(error)}`);
        }

        if (!data) {
          console.error('No data received from function');
          throw new Error('No response data received from function');
        }

        return data;
      });
      setImportSession(result);

      const successCount = result.successCount || result.successful_records || 0;
      const totalRecords = result.totalRecords || result.total_records || 0;

      toast({
        title: "Import completed",
        description: `Successfully imported ${successCount} of ${totalRecords} records`,
      });

      // Show success message for invitations
      if (successCount > 0) {
        toast({
          title: "Import and invitations completed",
          description: `Successfully imported ${successCount} of ${totalRecords} records. Invitation emails will be sent automatically.`,
        });
        
        // Refresh the page after 2 seconds to show new patients
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to process import. Please check your internet connection and try again.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFile) {
      setSelectedFile(csvFile);
      // Trigger file processing
      const event = { target: { files: [csvFile] } } as any;
      handleFileSelect(event);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Import</h1>
          <p className="text-muted-foreground">Import patient data from CSV files</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.open('/sample-patients.csv', '_blank')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Sample CSV
          </Button>
          
          <Button 
            variant="outline" 
            onClick={testFunction}
            className="flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Test Function
          </Button>
        </div>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          {/* Import Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Import Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={importType === 'patients' ? 'default' : 'outline'}
                  onClick={() => setImportType('patients')}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Patients
                </Button>
                <Button
                  variant={importType === 'appointments' ? 'default' : 'outline'}
                  onClick={() => setImportType('appointments')}
                  disabled
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Appointments (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload CSV File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {selectedFile ? selectedFile.name : 'Drop CSV file here or click to browse'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports CSV files up to 10MB
                    </p>
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Selected File:</span>
                    <Badge variant="outline">{selectedFile.name}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CSV Preview & Field Mapping */}
          {csvPreview.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>CSV Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {csvPreview[0]?.map((header, index) => (
                            <th key={index} className="text-left p-2 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(1, 4).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2 text-muted-foreground">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Showing first 3 rows of data
                  </div>
                </CardContent>
              </Card>

              <ImportFieldMapper
                csvHeaders={csvPreview[0] || []}
                fieldMapping={fieldMapping}
                onChange={setFieldMapping}
                importType={importType}
              />
            </>
          )}

          {/* Import Button & Progress */}
          <Card>
            <CardContent className="pt-6">
              {importing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    <span>Processing import...</span>
                  </div>
                  <Progress value={undefined} className="w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Button
                      onClick={handleImport}
                      disabled={!selectedFile || Object.keys(fieldMapping).length === 0}
                      className="flex items-center gap-2"
                      title={
                        !selectedFile 
                          ? "Please select a CSV file first"
                          : Object.keys(fieldMapping).length === 0
                          ? "Please map at least one CSV field to a profile field"
                          : "Import your data"
                      }
                    >
                      <Upload className="w-4 h-4" />
                      Import Data
                    </Button>
                    {importSession?.sessionId || importSession?.id ? (
                      <Button
                        variant="default"
                        onClick={async () => {
                          try {
                            const sessionId = (importSession.sessionId || importSession.id) as string;
                            const { data, error } = await supabase.functions.invoke('send-import-invitations', {
                              body: { sessionId }
                            });
                            if (error) throw error;
                            toast({
                              title: 'Emails sent',
                              description: `Processed ${data.sent}/${data.total} invitations${data.failed ? `, ${data.failed} failed` : ''}.`
                            });
                          } catch (e: any) {
                            toast({
                              title: 'Failed to send emails',
                              description: e?.message || 'Unknown error',
                              variant: 'destructive'
                            });
                          }
                        }}
                        className="flex items-center gap-2"
                        title="Send invitation emails to all imported patients"
                      >
                        Email patients
                      </Button>
                    ) : null}
                    {selectedFile && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFile(null);
                          setCsvPreview([]);
                          setFieldMapping({});
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  {/* Debug info for troubleshooting */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={selectedFile ? "text-green-600" : "text-red-600"}>
                          {selectedFile ? "✓" : "✗"}
                        </span>
                        <span>File selected: {selectedFile ? selectedFile.name : "None"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={Object.keys(fieldMapping).length > 0 ? "text-green-600" : "text-red-600"}>
                          {Object.keys(fieldMapping).length > 0 ? "✓" : "✗"}
                        </span>
                        <span>Fields mapped: {Object.keys(fieldMapping).length}</span>
                      </div>
                      {Object.keys(fieldMapping).length > 0 && (
                        <div className="ml-6 text-muted-foreground">
                          Mappings: {Object.entries(fieldMapping).map(([csv, field]) => 
                            csv + " → " + field
                          ).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import Results */}
          {importSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(importSession.failed_records || importSession.failureCount || 0) === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {importSession.successful_records || importSession.successCount || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {importSession.failed_records || importSession.failureCount || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {importSession.total_records || importSession.totalRecords || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>

                {(importSession.error_details || importSession.errors) && ((importSession.error_details?.length ?? 0) > 0 || (importSession.errors?.length ?? 0) > 0) && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>Some records failed to import:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {(importSession.error_details || importSession.errors)?.slice(0, 5).map((error: any, index: number) => (
                            <div key={index} className="text-sm bg-muted p-2 rounded">
                              <strong>Row {error.row}:</strong> {error.error}
                            </div>
                          ))}
                          {(importSession.error_details?.length || importSession.errors?.length || 0) > 5 && (
                            <div className="text-sm text-muted-foreground">
                              + {(importSession.error_details?.length || importSession.errors?.length || 0) - 5} more errors
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <ImportHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}