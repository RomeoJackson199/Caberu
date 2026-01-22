import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Clock, FileText, Users, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface BreachIncident {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'contained' | 'resolved';
  discovered_at: string;
  contained_at?: string;
  resolved_at?: string;
  affected_records_count?: number;
  data_categories: string[];
  root_cause?: string;
  mitigation_steps?: string;
  patients_notified_at?: string;
  authority_notified_at?: string;
  reporter_id?: string;
  assigned_to?: string;
}

export default function BreachManagement() {
  const [incidents, setIncidents] = useState<BreachIncident[]>([]);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as const,
    affected_records_count: '',
    data_categories: [] as string[],
    discovered_at: new Date().toISOString().slice(0, 16)
  });
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const severityColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500', 
    high: 'bg-orange-500',
    critical: 'bg-red-500'
  };

  const statusColors = {
    reported: 'bg-red-100 text-red-800',
    investigating: 'bg-yellow-100 text-yellow-800',
    contained: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800'
  };

  const dataCategoryOptions = [
    'Personal Identifiers',
    'Health Data',
    'Financial Information',
    'Contact Information',
    'Authentication Data',
    'Treatment Records',
    'Insurance Information',
    'Appointment Data',
    'Communication Records'
  ];

  const loadIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('breach_incidents')
        .select('*')
        .order('discovered_at', { ascending: false });

      if (error) throw error;
      setIncidents(data?.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        severity: item.severity as any,
        status: item.status === 'closed' ? 'resolved' : item.status as any,
        discovered_at: item.discovered_at,
        contained_at: item.contained_at,
        resolved_at: item.resolved_at,
        affected_records_count: item.affected_records_count,
        data_categories: item.data_categories,
        root_cause: item.root_cause,
        mitigation_steps: item.mitigation_steps,
        patients_notified_at: item.patients_notified_at,
        authority_notified_at: item.authority_notified_at,
        reporter_id: item.reporter_id,
        assigned_to: item.assigned_to
      })) || []);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const reportIncident = async () => {
    if (!newIncident.title) {
      toast({
        title: "Missing information",
        description: "Please provide an incident title",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('breach_incidents')
        .insert({
          title: newIncident.title,
          description: newIncident.description,
          severity: newIncident.severity,
          discovered_at: newIncident.discovered_at,
          affected_records_count: parseInt(newIncident.affected_records_count) || null,
          data_categories: newIncident.data_categories,
          reporter_id: user.id,
          status: 'reported'
        });

      if (error) throw error;

      toast({
        title: "Incident reported",
        description: "Security incident has been logged and investigation will begin."
      });

      setNewIncident({
        title: '',
        description: '',
        severity: 'medium',
        affected_records_count: '',
        data_categories: [],
        discovered_at: new Date().toISOString().slice(0, 16)
      });
      setShowNewIncident(false);
      loadIncidents();
    } catch (error) {
      console.error('Incident reporting error:', error);
      toast({
        title: "Reporting failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateIncidentStatus = async (incidentId: string, status: string, additionalData?: any) => {
    try {
      const updates: any = { status };
      
      if (status === 'contained') {
        updates.contained_at = new Date().toISOString();
      } else if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      
      if (additionalData) {
        Object.assign(updates, additionalData);
      }

      const { error } = await supabase
        .from('breach_incidents')
        .update(updates)
        .eq('id', incidentId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Incident status has been updated successfully."
      });

      loadIncidents();
    } catch (error) {
      console.error('Status update error:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const getTimeRemaining = (discoveredAt: string) => {
    const discovered = new Date(discoveredAt);
    const deadline = new Date(discovered.getTime() + 72 * 60 * 60 * 1000); // 72 hours
    const now = new Date();
    const remaining = deadline.getTime() - now.getTime();
    
    if (remaining <= 0) return { expired: true, hours: 0 };
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    return { expired: false, hours };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Incident Management</h2>
          <p className="text-muted-foreground">
            Report and track data security incidents and breaches
          </p>
        </div>
        
        <Dialog open={showNewIncident} onOpenChange={setShowNewIncident}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Report Incident
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Report Security Incident</DialogTitle>
              <DialogDescription>Document a security incident for GDPR compliance. Authorities must be notified within 72 hours.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Report security incidents immediately. Data protection authorities must be notified within 72 hours.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Incident Title *</label>
                <Input
                  placeholder="Brief description of the incident"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Severity Level</label>
                <Select value={newIncident.severity} onValueChange={(value: any) => 
                  setNewIncident(prev => ({ ...prev, severity: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minor security issue</SelectItem>
                    <SelectItem value="medium">Medium - Moderate risk</SelectItem>
                    <SelectItem value="high">High - Significant breach</SelectItem>
                    <SelectItem value="critical">Critical - Major data exposure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Discovery Date & Time</label>
                <Input
                  type="datetime-local"
                  value={newIncident.discovered_at}
                  onChange={(e) => setNewIncident(prev => ({ ...prev, discovered_at: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Affected Records (if known)</label>
                <Input
                  type="number"
                  placeholder="Number of patient records affected"
                  value={newIncident.affected_records_count}
                  onChange={(e) => setNewIncident(prev => ({ ...prev, affected_records_count: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data Categories Affected</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {dataCategoryOptions.map((category) => (
                    <label key={category} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newIncident.data_categories.includes(category)}
                        onChange={(e) => {
                          const categories = e.target.checked
                            ? [...newIncident.data_categories, category]
                            : newIncident.data_categories.filter(c => c !== category);
                          setNewIncident(prev => ({ ...prev, data_categories: categories }));
                        }}
                        className="rounded"
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Incident Description</label>
                <Textarea
                  placeholder="Detailed description of what happened, when, and potential impact..."
                  value={newIncident.description}
                  onChange={(e) => setNewIncident(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={reportIncident} 
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "Reporting..." : "Report Incident"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewIncident(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Security Incidents</h3>
            <p className="text-muted-foreground text-center">
              No security incidents have been reported. This dashboard will show any data breaches or security issues.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => {
            const timeInfo = getTimeRemaining(incident.discovered_at);
            
            return (
              <Card key={incident.id} className={`${incident.status === 'reported' || incident.status === 'investigating' ? 'border-red-200 bg-red-50/50' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${severityColors[incident.severity]}`} />
                      <CardTitle className="text-lg">{incident.title}</CardTitle>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[incident.status]}>
                        {incident.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {incident.severity}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {incident.description && (
                    <p className="text-muted-foreground">{incident.description}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Timeline
                      </div>
                      <div className="text-muted-foreground">
                        <div>Discovered: {new Date(incident.discovered_at).toLocaleString()}</div>
                        {incident.contained_at && (
                          <div>Contained: {new Date(incident.contained_at).toLocaleString()}</div>
                        )}
                        {incident.resolved_at && (
                          <div>Resolved: {new Date(incident.resolved_at).toLocaleString()}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Impact
                      </div>
                      <div className="text-muted-foreground">
                        {incident.affected_records_count ? (
                          <div>{incident.affected_records_count} records affected</div>
                        ) : (
                          <div>Impact assessment pending</div>
                        )}
                        {incident.data_categories.length > 0 && (
                          <div>Categories: {incident.data_categories.slice(0, 2).join(', ')}{incident.data_categories.length > 2 && '...'}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Compliance
                      </div>
                      <div className="text-muted-foreground">
                        {incident.authority_notified_at ? (
                          <div className="text-green-600">Authority notified</div>
                        ) : timeInfo.expired ? (
                          <div className="text-red-600">72h deadline passed</div>
                        ) : (
                          <div className="text-yellow-600">{timeInfo.hours}h remaining</div>
                        )}
                        {incident.patients_notified_at ? (
                          <div className="text-green-600">Patients notified</div>
                        ) : (
                          <div>Patient notification pending</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {incident.status !== 'resolved' && (
                    <div className="flex gap-2">
                      {incident.status === 'reported' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                        >
                          Start Investigation
                        </Button>
                      )}
                      {incident.status === 'investigating' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateIncidentStatus(incident.id, 'contained')}
                        >
                          Mark Contained
                        </Button>
                      )}
                      {incident.status === 'contained' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                        >
                          Mark Resolved
                        </Button>
                      )}
                      
                      {!incident.authority_notified_at && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateIncidentStatus(incident.id, incident.status, {
                            authority_notified_at: new Date().toISOString()
                          })}
                        >
                          Mark Authority Notified
                        </Button>
                      )}
                    </div>
                  )}

                  {timeInfo.expired && !incident.authority_notified_at && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Compliance Alert:</strong> The 72-hour notification deadline has passed. 
                        Contact your data protection authority immediately.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}