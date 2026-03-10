import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, CheckCircle, XCircle, RefreshCw, ExternalLink, ArrowRightLeft, ListChecks, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentDentist } from '@/hooks/useCurrentDentist';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarSyncStatus } from '@/components/stability/CalendarSyncStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SyncDirection = 'both' | 'google_to_practice' | 'practice_to_google';

interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
}

export function GoogleCalendarSettings() {
  const { businessId } = useBusinessContext();
  const { dentistId } = useCurrentDentist(businessId);
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncDirection, setSyncDirection] = useState<SyncDirection>('both');
  const [selectedCalendarId, setSelectedCalendarId] = useState('primary');
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingDirection, setSavingDirection] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!dentistId) return;
    try {
      const { data } = await supabase
        .from('dentists')
        .select('google_calendar_connected, google_calendar_last_sync, google_calendar_sync_direction, google_calendar_id')
        .eq('id', dentistId)
        .single();

      if (data) {
        setIsConnected(!!data.google_calendar_connected);
        setLastSync(data.google_calendar_last_sync ? new Date(data.google_calendar_last_sync) : null);
        setSyncDirection((data.google_calendar_sync_direction as SyncDirection) || 'both');
        setSelectedCalendarId(data.google_calendar_id || 'primary');
      }
    } finally {
      setLoading(false);
    }
  }, [dentistId]);

  const fetchCalendars = useCallback(async () => {
    if (!isConnected) return;
    setLoadingCalendars(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'list-calendars' },
      });
      if (error) throw error;
      setCalendars(data?.calendars || []);
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
    } finally {
      setLoadingCalendars(false);
    }
  }, [isConnected]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { fetchCalendars(); }, [fetchCalendars]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/google-calendar-callback`;
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'get-auth-url', redirectUri },
      });
      if (error || !data?.authUrl) throw new Error(error?.message || 'Failed to get auth URL');

      const popup = window.open(data.authUrl, 'google-calendar-auth', 'width=500,height=700,left=200,top=100');
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
      setCalendars([]);
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

  const handleSyncDirectionChange = async (value: SyncDirection) => {
    if (!dentistId) return;
    setSavingDirection(true);
    const previous = syncDirection;
    setSyncDirection(value);
    try {
      const { error } = await supabase
        .from('dentists')
        .update({ google_calendar_sync_direction: value })
        .eq('id', dentistId);
      if (error) throw error;
      toast({ title: 'Sync direction updated' });
    } catch (err) {
      setSyncDirection(previous);
      toast({ title: 'Failed to update', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSavingDirection(false);
    }
  };

  const handleCalendarChange = async (calId: string) => {
    if (!dentistId) return;
    setSavingCalendar(true);
    const previous = selectedCalendarId;
    setSelectedCalendarId(calId);
    try {
      const { error } = await supabase
        .from('dentists')
        .update({ google_calendar_id: calId })
        .eq('id', dentistId);
      if (error) throw error;
      toast({ title: 'Calendar updated', description: 'Future syncs will use the selected calendar.' });
    } catch (err) {
      setSelectedCalendarId(previous);
      toast({ title: 'Failed to update', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSavingCalendar(false);
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


      {/* Calendar Selection */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Calendar
            </CardTitle>
            <CardDescription>
              Choose which Google Calendar to sync with your practice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingCalendars ? (
              <div className="animate-pulse h-10 bg-muted rounded w-64" />
            ) : calendars.length > 0 ? (
              <Select
                value={selectedCalendarId}
                onValueChange={handleCalendarChange}
                disabled={savingCalendar}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      <div className="flex items-center gap-2">
                        {cal.backgroundColor && (
                          <span
                            className="inline-block h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: cal.backgroundColor }}
                          />
                        )}
                        <span>{cal.summary}</span>
                        {cal.primary && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Primary</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">No calendars found. Try reconnecting.</p>
            )}

            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong className="text-amber-800 dark:text-amber-400">⚠️ Only use a work-only calendar!</strong>
                <span className="block mt-1 text-muted-foreground">
                  Every event on the selected calendar will <strong className="text-foreground">block patient booking slots</strong>. 
                  If this calendar contains personal events (gym, dinner, errands…), patients won't be able to book during those times. 
                  We recommend creating a <strong className="text-foreground">dedicated work calendar</strong> in Google Calendar and selecting it here.
                </span>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Sync Direction Settings */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Sync Direction
            </CardTitle>
            <CardDescription>
              Choose how your calendar syncs between Google and your practice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={syncDirection}
              onValueChange={(v) => handleSyncDirectionChange(v as SyncDirection)}
              disabled={savingDirection}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="both" id="sync-both" className="mt-0.5" />
                <Label htmlFor="sync-both" className="cursor-pointer space-y-1">
                  <span className="font-medium text-sm">Bidirectional sync</span>
                  <p className="text-xs text-muted-foreground">
                    Appointments sync to Google Calendar, and Google events block your practice slots.
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="practice_to_google" id="sync-ptg" className="mt-0.5" />
                <Label htmlFor="sync-ptg" className="cursor-pointer space-y-1">
                  <span className="font-medium text-sm">Practice → Google only</span>
                  <p className="text-xs text-muted-foreground">
                    Practice appointments appear in Google Calendar, but Google events won't block your slots.
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="google_to_practice" id="sync-gtp" className="mt-0.5" />
                <Label htmlFor="sync-gtp" className="cursor-pointer space-y-1">
                  <span className="font-medium text-sm">Google → Practice only</span>
                  <p className="text-xs text-muted-foreground">
                    Google Calendar events block your practice slots, but appointments won't be pushed to Google.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            How sync works
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
