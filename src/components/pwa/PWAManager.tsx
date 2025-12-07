import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Download, 
  X, 
  Bell, 
  Wifi, 
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { analytics, ANALYTICS_EVENTS } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface PWAManagerProps {
  onInstall?: () => void;
}

export const PWAManager: React.FC<PWAManagerProps> = ({ onInstall }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    // Check if install prompt was previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    if (dismissedTime && dismissedTime > thirtyDaysAgo) {
      setPromptDismissed(true);
    }

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      if (!isInstalled && !promptDismissed) {
        setShowInstallPrompt(true);
        analytics.track(ANALYTICS_EVENTS.PWA_PROMPT_SHOWN);
      }
    };

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Listen for service worker updates
    const handleSWUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Service worker registration and update detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  handleSWUpdate();
                }
              });
            }
          });
        })
        .catch(error => console.error('SW registration failed:', error));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInstalled, promptDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallPrompt(false);
        analytics.track(ANALYTICS_EVENTS.PWA_INSTALLED);
        if (onInstall) onInstall();
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setPromptDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    analytics.track(ANALYTICS_EVENTS.PWA_PROMPT_DISMISSED);
  };

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
        });
      });
      
      // Reload the page to get the updated version
      window.location.reload();
    }
  };

  return (
    <>
      {/* Network Status Indicator */}
      <div className="fixed top-4 right-4 z-[100]">
        {!isOnline && (
          <Alert className="w-auto shadow-lg border-orange-200 bg-orange-50">
            <WifiOff className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You're offline. Some features may be limited.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-[90] bg-blue-600 text-white p-3 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5" />
              <span className="font-medium">A new version is available!</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUpdate}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Update Now
            </Button>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && deferredPrompt && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-96">
          <Card className="shadow-2xl border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Install Caberu</CardTitle>
                    <p className="text-sm text-muted-foreground">Access faster with our app</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Offline access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Push notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Faster loading</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Home screen access</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstall} 
                  className="flex-1"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDismiss}
                  size="sm"
                  className="px-3"
                >
                  Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PWA Status in Settings (when installed) */}
      {isInstalled && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              App Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Installation Status</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Installed
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Network Status</span>
              <Badge 
                variant="outline" 
                className={cn(
                  isOnline 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-orange-50 text-orange-700 border-orange-200"
                )}
              >
                {isOnline ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Notifications</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Bell className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            </div>

            {updateAvailable && (
              <Alert>
                <RefreshCw className="h-4 w-4" />
                <AlertDescription>
                  An app update is available. 
                  <Button 
                    variant="link" 
                    className="p-0 h-auto ml-1" 
                    onClick={handleUpdate}
                  >
                    Update now
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};
