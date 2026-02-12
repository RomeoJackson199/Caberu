import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import {
  Shield,
  FileText,
  Key,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  Eye,
  Users,
} from 'lucide-react';

export function ComplianceTab() {
  const [auditSearch, setAuditSearch] = useState('');

  // GDPR Requests
  const { data: gdprRequests, isLoading: gdprLoading } = useQuery({
    queryKey: ['admin-gdpr-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Audit logs
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-audit-logs', auditSearch],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditSearch) {
        query = query.or(`action.ilike.%${auditSearch}%,table_name.ilike.%${auditSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Encryption keys status
  const { data: encryptionKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['admin-encryption-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_encryption_keys')
        .select('business_id, is_active, key_version, expires_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Consent tracking
  const { data: consents, isLoading: consentsLoading } = useQuery({
    queryKey: ['admin-consents'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('patient_consents')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const gdprStats = {
    total: gdprRequests?.length || 0,
    pending: gdprRequests?.filter((r) => r.status === 'pending').length || 0,
    completed: gdprRequests?.filter((r) => r.status === 'completed').length || 0,
    export: gdprRequests?.filter((r) => r.request_type === 'export').length || 0,
    deletion: gdprRequests?.filter((r) => r.request_type === 'deletion').length || 0,
  };

  const activeKeys = encryptionKeys?.filter((k) => k.is_active).length || 0;
  const expiredKeys = encryptionKeys?.filter((k) => new Date(k.expires_at) < new Date()).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">GDPR & Compliance</h2>
        <p className="text-sm text-muted-foreground">Data protection, audit trails, and encryption management</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{gdprStats.total}</p>
                <p className="text-xs text-muted-foreground">GDPR Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{gdprStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{activeKeys}</p>
                <p className="text-xs text-muted-foreground">Active Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{consents}</p>
                <p className="text-xs text-muted-foreground">Active Consents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GDPR Requests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Data Subject Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gdprLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : gdprRequests && gdprRequests.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {gdprRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{req.request_type}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <Badge
                    variant={req.status === 'completed' ? 'default' : req.status === 'pending' ? 'secondary' : 'destructive'}
                  >
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No GDPR requests</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Encryption Key Status */}
      {expiredKeys > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">{expiredKeys} expired encryption key{expiredKeys > 1 ? 's' : ''}</p>
                <p className="text-sm text-muted-foreground">These should be rotated for security compliance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Audit Log
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action or table..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {auditLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    {log.table_name && (
                      <span className="text-muted-foreground font-mono text-xs">{log.table_name}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No audit logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
