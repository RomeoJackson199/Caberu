import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield,
  UserPlus,
  RefreshCw,
  Mail,
  Send,
  Trash2,
  Database,
  FileJson,
} from 'lucide-react';

export function QuickActionsCard() {
  const { toast } = useToast();
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleGrantSuperAdmin = async () => {
    if (!superAdminEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }
    
    setIsGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke('make-super-admin', {
        body: { email: superAdminEmail.trim() }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: data.message || `${superAdminEmail} is now a super admin`,
      });
      setSuperAdminEmail('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant super admin',
        variant: 'destructive'
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: testEmail.trim(),
          subject: '[SYSTEM TEST] Quick Email Test',
          message: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #333;">✅ Email Test Successful</h2>
              <p>This is a quick test from the Super Admin Dashboard.</p>
              <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `,
          messageType: 'system',
          isSystemNotification: true,
        },
      });

      if (error) throw error;

      toast({
        title: 'Email Sent',
        description: `Test email sent to ${testEmail}`,
      });
      setTestEmail('');
    } catch (error: any) {
      toast({
        title: 'Failed to send email',
        description: error.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleClearQueryCache = () => {
    setIsClearingCache(true);
    
    try {
      // Clear localStorage and sessionStorage caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('query') || key.includes('cache') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      toast({
        title: 'Cache Cleared',
        description: `Cleared ${keysToRemove.length} cached items. Refreshing page...`,
      });
      
      // Reload to fully clear React Query cache
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear cache',
        variant: 'destructive',
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleExportSystemInfo = () => {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      localStorage: Object.keys(localStorage).length + ' items',
      sessionStorage: Object.keys(sessionStorage).length + ' items',
      url: window.location.href,
    };

    const blob = new Blob([JSON.stringify(systemInfo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-info-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'System info downloaded',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-500" />
          Admin Quick Actions
        </CardTitle>
        <CardDescription>
          Common administrative tasks and utilities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grant Super Admin */}
        <div className="space-y-3 p-4 border rounded-lg bg-red-500/5 border-red-500/20">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-red-500" />
            <Label className="font-medium">Grant Super Admin</Label>
            <Badge variant="destructive" className="ml-auto text-xs">Dangerous</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={superAdminEmail}
              onChange={(e) => setSuperAdminEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleGrantSuperAdmin}
              disabled={isGranting || !superAdminEmail.trim()}
              variant="destructive"
              size="sm"
            >
              {isGranting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Grant'}
            </Button>
          </div>
        </div>

        {/* Quick Email Test */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            <Label className="font-medium">Quick Email Test</Label>
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleSendTestEmail}
              disabled={isSendingEmail || !testEmail.trim()}
              variant="outline"
              size="sm"
            >
              {isSendingEmail ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Utility Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleClearQueryCache}
            disabled={isClearingCache}
          >
            {isClearingCache ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Clear Cache
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportSystemInfo}
          >
            <FileJson className="h-4 w-4" />
            Export Info
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
