import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';

export function GoogleCalendarConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { businessId } = useBusinessContext();
  const { dentistId } = useCurrentDentist(businessId);
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
  }, [dentistId]);

  const checkConnectionStatus = async () => {
    if (!dentistId) return;

    try {
      const { data } = await supabase
        .from('dentists')
        .select('google_calendar_connected')
        .eq('id', dentistId)
        .single();

      setIsConnected(data?.google_calendar_connected || false);
    } catch (error) {
      console.error('Error checking Google Calendar status:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/google-calendar-callback`;

      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'get-auth-url', redirectUri }
      });
      if (error) throw error;
      if (!data?.authUrl) {
        throw new Error('No authUrl returned from server');
      }

      // Open OAuth flow in popup
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const popup = window.open(
        data.authUrl,
        'Google Calendar Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'google-calendar-auth') {
          const code = event.data.code;
          popup?.close();
          window.removeEventListener('message', handleMessage);

          // Exchange code for tokens
          const { error: exchangeError } = await supabase.functions.invoke('google-calendar-oauth', {
            body: {
              action: 'exchange-code',
              code,
              redirectUri
            }
          });

          if (exchangeError) {
            throw exchangeError;
          }

          setIsConnected(true);
          toast({
            title: "Connected!",
            description: "Google Calendar connected successfully"
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Clean up listener after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
      }, 300000);

    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect Google Calendar",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: "Google Calendar disconnected successfully"
      });
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your Google Calendar to see all your appointments in one place.
          Appointments created here will automatically appear in your Google Calendar, and events from Google Calendar will block your availability.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-sm">Connected</span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Not connected</span>
              </>
            )}
          </div>

          {isConnected ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isLoading}
            >
              Connect Google Calendar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
