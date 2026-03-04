import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, CheckCircle, XCircle, RefreshCw, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentDentist } from '@/hooks/useCurrentDentist';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarSyncStatus } from '@/components/stability/CalendarSyncStatus';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function GoogleCalendarSettings() {
  const { businessId } = useBusinessContext();
  const { dentistId } = useCurrentDentist(businessId);
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!dentistId) return;
    try {
      const { data } = await supabase
        .from('dentists')
        .select('google_calendar_connected, google_calendar_last_sync')
        .eq('id', dentistId)
        .single();

      if (data) {
        setIsConnected(!!data.google_calendar_connected);
        setLastSync(data.google_calendar_last_sync ? new Date(data.google_calendar_last_sync) : null);
      }
    } finally {
      setLoading(false);
    }
  }, [dentistId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/google-calendar-callback`;

      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'get-auth-url', redirectUri },
      });

      if (error || !data?.authUrl) throw new Error(error?.message || 'Failed to get auth URL');

      // Open popup
      const popup = window.open(data.authUrl, 'google-calendar-auth', 'width=500,height=700,left=200,top=100');

      // Listen for callback message
      const handler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'google-calendar-auth') return;

        window.removeEventListener('message', handler);
        popup?.close();

        const { error: exchangeError } = await supabase.functions.invoke('google-calendar-oauth', {
          body: { action: 'exchange-code', code: event.data.code, redirectUri },
        });

        if (exchangeError) {
          toast({ title: 'Connection failed', description: exchangeError.message, variant: 'destructive' });
        } else {
          toast({ title: 'Google Calendar connected', description: 'Your calendar is now synced with your practice.' });
          await fetchStatus();
        }
        setConnecting(false);
      };

      window.addEventListener('message', handler);

      // Timeout after 2 minutes
      setTimeout(() => {
        window.removeEventListener('message', handler);
        if (connecting) setConnecting(false);
      }, 120000);
    } catch (err) {
      toast({ title: 'Connection failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;
      toast({ title: 'Google Calendar disconnected' });
      await fetchStatus();
    } catch (err) {
      toast({ title: 'Disconnect failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { startDate, endDate },
      });

      if (error) throw error;
      toast({ title: 'Sync complete', description: `${data?.events?.length ?? 0} events synced from Google Calendar.` });
      await fetchStatus();
    } catch (err) {
      toast({ title: 'Sync failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-10 bg-muted rounded w-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar
              </CardTitle>
              <CardDescription className="mt-1.5">
                Sync your Google Calendar with your practice schedule.
              </CardDescription>
            </div>
            {isConnected && (
              <CalendarSyncStatus
                lastSyncTime={lastSync}
                isSyncing={syncing}
                onSync={handleSync}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-foreground font-medium">Connected</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <XCircle className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
                      <AlertDialogDescription>
                        New appointments will no longer sync to Google Calendar, and Google events will stop blocking your slots. Existing appointments are not affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnect} disabled={disconnecting}>
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Connect your Google Calendar to enable bidirectional sync with your practice schedule.
              </p>
              <Button onClick={handleConnect} disabled={connecting}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {connecting ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            How bidirectional sync works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Badge variant="secondary" className="text-xs">Practice → Google</Badge>
              <p className="text-sm text-muted-foreground">
                When you book, update, or cancel an appointment, it's automatically created or updated in your Google Calendar.
              </p>
            </div>
            <div className="space-y-1.5">
              <Badge variant="secondary" className="text-xs">Google → Practice</Badge>
              <p className="text-sm text-muted-foreground">
                Events in your Google Calendar automatically block matching appointment slots so patients can't double-book you.
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            Sync runs automatically every 5 minutes. You can also trigger a manual sync above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
