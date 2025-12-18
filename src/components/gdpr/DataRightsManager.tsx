import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserX, Edit3, Lock, Download, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface GDPRRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection';
  status: 'submitted' | 'processing' | 'completed' | 'rejected';
  description?: string;
  submitted_at: string;
  due_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  urgency_level: string;
}

export default function DataRightsManager() {
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [newRequest, setNewRequest] = useState({
    type: '',
    description: '',
    urgency: 'normal'
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const requestTypes = {
    access: {
      title: 'Access My Data',
      description: 'Request a copy of all personal data we hold about you',
      icon: Download,
      color: 'bg-blue-500'
    },
    rectification: {
      title: 'Correct My Data',
      description: 'Request correction of inaccurate or incomplete personal data',
      icon: Edit3,
      color: 'bg-green-500'
    },
    erasure: {
      title: 'Delete My Data',
      description: 'Request deletion of your personal data (right to be forgotten)',
      icon: UserX,
      color: 'bg-red-500'
    },
    restriction: {
      title: 'Restrict Processing',
      description: 'Limit how your personal data is processed',
      icon: Lock,
      color: 'bg-yellow-500'
    },
    portability: {
      title: 'Data Portability',
      description: 'Receive your data in a structured, machine-readable format',
      icon: Download,
      color: 'bg-purple-500'
    },
    objection: {
      title: 'Object to Processing',
      description: 'Object to processing based on legitimate interests or direct marketing',
      icon: AlertTriangle,
      color: 'bg-orange-500'
    }
  };

  const loadRequests = async () => {
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
        .from('gdpr_requests')
        .select('*')
        .eq('patient_id', profile.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setRequests(data?.map(item => ({
        id: item.id,
        type: item.type as any,
        status: item.status === 'in_progress' ? 'processing' : item.status as any,
        description: item.description,
        submitted_at: item.submitted_at,
        due_at: item.due_at,
        resolved_at: item.resolved_at,
        resolution_notes: item.resolution_notes,
        urgency_level: item.urgency_level
      })) || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const submitRequest = async () => {
    if (!newRequest.type) {
      toast({
        title: "Missing information",
        description: "Please select a request type",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('gdpr_requests')
        .insert({
          patient_id: profile.id,
          type: newRequest.type as any,
          description: newRequest.description,
          urgency_level: newRequest.urgency,
          status: 'submitted'
        });

      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "Your data rights request has been submitted and will be processed within 30 days."
      });

      setNewRequest({ type: '', description: '', urgency: 'normal' });
      loadRequests();
    } catch (error) {
      console.error('Request submission error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'rejected':
        return <div className="w-4 h-4 bg-red-500 rounded-full" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      submitted: 'secondary',
      processing: 'default',
      completed: 'secondary',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDaysRemaining = (dueAt: string) => {
    const due = new Date(dueAt);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Data Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Under GDPR, you have several rights regarding your personal data. 
              We'll respond to your requests within 30 days unless we need to extend this period.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(requestTypes).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Dialog key={type}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-muted/50"
                      onClick={() => setNewRequest(prev => ({ ...prev, type }))}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${config.color}`} />
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm">{config.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        {config.title}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Priority Level</label>
                        <Select value={newRequest.urgency} onValueChange={(value) => 
                          setNewRequest(prev => ({ ...prev, urgency: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Additional Details</label>
                        <Textarea
                          placeholder="Please provide any additional information about your request..."
                          value={newRequest.description}
                          onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={submitRequest} 
                          disabled={submitting}
                          className="flex-1"
                        >
                          {submitting ? "Submitting..." : "Submit Request"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request) => {
                const config = requestTypes[request.type];
                const daysRemaining = getDaysRemaining(request.due_at);
                const Icon = config.icon;

                return (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <Icon className="w-4 h-4" />
                      <div>
                        <div className="font-medium">{config.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                          {request.status === 'submitted' && daysRemaining > 0 && (
                            <span className="ml-2">• {daysRemaining} days remaining</span>
                          )}
                          {request.resolved_at && (
                            <span className="ml-2">• Resolved: {new Date(request.resolved_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        {request.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {request.description}
                          </div>
                        )}
                        {request.resolution_notes && (
                          <div className="text-sm bg-muted/50 p-2 rounded mt-2">
                            <strong>Response:</strong> {request.resolution_notes}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {request.urgency_level !== 'normal' && (
                        <Badge variant="outline" className="text-xs">
                          {request.urgency_level}
                        </Badge>
                      )}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}