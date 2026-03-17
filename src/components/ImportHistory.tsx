import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, AlertCircle, FileText, Users, Package, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/lib/logger';

interface ImportSession {
  id: string;
  filename: string;
  status: string;
  import_type: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  created_at: string;
  completed_at?: string;
  error_details?: any[];
}

export function ImportHistory() {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('dentists')
        .select('id')
        .eq('profile_id', session.user.id)
        .maybeSingle();

      if (!profile?.id) return;

      const { data, error } = await (supabase as any)
        .from('import_sessions')
        .select('*')
        .eq('dentist_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(((data || []) as any[]).map((session: any) => ({
        ...session,
        error_details: Array.isArray(session.error_details) ? session.error_details : []
      })) as ImportSession[]);
    } catch (error) {
      console.error('Error fetching import history:', error);
      toast({
        title: "Error loading history",
        description: "Failed to load import history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'patients':
        return <Users className="w-4 h-4" />;
      case 'appointments':
        return <FileText className="w-4 h-4" />;
      case 'inventory':
        return <Package className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const deleteImportSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('import_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      toast({
        title: "Import deleted",
        description: "Import session has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting import session:', error);
      toast({
        title: "Error deleting import",
        description: "Failed to delete import session",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No import history found</p>
            <p className="text-sm">Start by importing your first CSV file</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const successRate = session.total_records > 0 
                  ? Math.round((session.successful_records / session.total_records) * 100)
                  : 0;

                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{session.filename}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(session.import_type)}
                        <span className="capitalize">{session.import_type}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(session.status)}
                        <Badge 
                          variant={
                            session.status === 'completed' ? 'default' :
                            session.status === 'failed' ? 'destructive' : 'secondary'
                          }
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div>{session.total_records} total</div>
                        <div className="text-muted-foreground">
                          {session.successful_records} success, {session.failed_records} failed
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-medium ${
                          successRate >= 90 ? 'text-green-600' :
                          successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {successRate}%
                        </div>
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              successRate >= 90 ? 'bg-green-500' :
                              successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</div>
                        {session.completed_at && (
                          <div className="text-muted-foreground">
                            Completed {formatDistanceToNow(new Date(session.completed_at), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteImportSession(session.id)}
                        className="p-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}