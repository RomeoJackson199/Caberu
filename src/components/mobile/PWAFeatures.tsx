import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Bell,
  Wifi,
  WifiOff,
  Smartphone,
  Share,
  Home,
  Settings,
  Zap,
  Hand,
  Layers,
  RefreshCw,
  Check,
  Fingerprint,
  ScanFace,
  Vibrate,
  Heart,
  Cloud,
  Camera,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { showToast } from '@/components/ui/notification-toast';
import { PulseIndicator } from '@/components/ui/micro-interactions';
import { AnimatedToggle } from '@/components/ui/page-enhancements';
import {
  useDespiaNative,
  useHaptics,
  useBiometricAuth,
  useNativeMedia,
  useNativeShare
} from '@/hooks/useDespia';

interface PWAFeaturesProps {
  className?: string;
}

export function PWAFeatures({ className }: PWAFeaturesProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Native Apple features hooks
  const isNative = useDespiaNative();
  const haptics = useHaptics();
  const biometrics = useBiometricAuth();
  const nativeMedia = useNativeMedia();
  const nativeShare = useNativeShare();

  useEffect(() => {
    // Check if app is installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check notification permission
    setNotificationPermission(Notification.permission);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) {
      showToast.info({
        title: 'Install Available',
        description: 'Use your browser menu to install this app'
      });
      return;
    }

    const result = await installPrompt.prompt();
    if (result.outcome === 'accepted') {
      showToast.success({
        title: 'App Installing',
        description: 'DentiSmart is being installed on your device'
      });
      setInstallPrompt(null);
    }
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast.error({
        title: 'Not Supported',
        description: 'Your browser does not support notifications'
      });
      return;
    }

    if (notificationPermission === 'granted') {
      setPushEnabled(!pushEnabled);
      showToast.success({
        title: pushEnabled ? 'Notifications Disabled' : 'Notifications Enabled',
        description: `Push notifications have been ${pushEnabled ? 'disabled' : 'enabled'}`
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setPushEnabled(true);
        showToast.success({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications'
        });
        
        // Send test notification
        new Notification('DentiSmart', {
          body: 'Notifications are now enabled!',
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      } else {
        showToast.warning({
          title: 'Permission Denied',
          description: 'Enable notifications in your browser settings'
        });
      }
    } catch (error) {
      showToast.error({
        title: 'Error',
        description: 'Failed to enable notifications'
      });
    }
  };

  const handleShareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DentiSmart - Smart Dental Scheduling',
          text: 'Check out this amazing dental appointment scheduling app!',
          url: window.location.origin
        });
        showToast.success({
          title: 'Shared Successfully',
          description: 'Thanks for sharing DentiSmart!'
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.origin);
      showToast.success({
        title: 'Link Copied',
        description: 'App link copied to clipboard'
      });
    }
  };

  const addToHomeScreen = () => {
    showToast.info({
      title: 'Add to Home Screen',
      description: 'Use your browser menu to add DentiSmart to your home screen',
      action: {
        label: 'Learn More',
        onClick: () => window.open('https://support.google.com/chrome/answer/9658361', '_blank')
      }
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <Card className="border-l-4 border-l-dental-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <div>
                <h3 className="font-semibold">Connection Status</h3>
                <p className="text-sm text-dental-muted-foreground">
                  {isOnline ? 'Online - All features available' : 'Offline - Limited features'}
                </p>
              </div>
            </div>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* App Installation */}
      {!isInstalled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Install App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-dental-muted-foreground">
              Install DentiSmart on your device for faster access and offline features.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleInstallApp} className="w-full">
                <Smartphone className="h-4 w-4 mr-2" />
                Install App
              </Button>
              <Button variant="outline" onClick={addToHomeScreen} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Add to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Notifications</p>
              <p className="text-sm text-dental-muted-foreground">
                Get notified about appointments and important updates
              </p>
            </div>
            <Switch
              checked={pushEnabled && notificationPermission === 'granted'}
              onCheckedChange={handleEnableNotifications}
            />
          </div>
          
          {notificationPermission === 'denied' && (
            <div className="p-3 bg-dental-warning/10 border border-dental-warning/20 rounded-lg">
              <p className="text-sm text-dental-warning-foreground">
                Notifications are blocked. Enable them in your browser settings to receive updates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share App */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share className="h-5 w-5" />
            Share App
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-dental-muted-foreground mb-4">
            Help others discover DentiSmart - share it with friends and family.
          </p>
          <Button onClick={handleShareApp} variant="outline" className="w-full">
            <Share className="h-4 w-4 mr-2" />
            Share DentiSmart
          </Button>
        </CardContent>
      </Card>

      {/* Mobile Optimizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Mobile Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { icon: Layers, label: 'Responsive Design', status: 'Active', active: true },
            { icon: Hand, label: 'Touch Optimized', status: 'Active', active: true },
            { icon: RefreshCw, label: 'Pull to Refresh', status: 'Active', active: true },
            { icon: Zap, label: 'Swipe Actions', status: 'Active', active: true },
            { icon: Wifi, label: 'Offline Support', status: isInstalled ? 'Available' : 'Install App', active: isInstalled },
          ].map((feature, index) => (
            <motion.div
              key={feature.label}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${feature.active ? 'bg-success-600/10' : 'bg-muted'}`}>
                  <feature.icon className={`h-4 w-4 ${feature.active ? 'text-success-600' : 'text-muted-foreground'}`} />
                </div>
                <span className="text-sm font-medium">{feature.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {feature.active && <PulseIndicator size="sm" color="success" />}
                <Badge 
                  variant={feature.active ? 'default' : 'outline'}
                  className={feature.active ? 'bg-success-600' : ''}
                >
                  {feature.status}
                </Badge>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Gesture Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hand className="h-5 w-5" />
            Touch Gestures
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { gesture: '← Swipe Left', action: 'Delete/Archive' },
              { gesture: '→ Swipe Right', action: 'Complete/Pin' },
              { gesture: '↓ Pull Down', action: 'Refresh' },
              { gesture: 'Long Press', action: 'Quick Actions' },
            ].map((item) => (
              <div
                key={item.gesture}
                className="p-3 rounded-lg bg-muted/50 text-center"
              >
                <span className="text-lg font-mono">{item.gesture}</span>
                <p className="text-xs text-muted-foreground mt-1">{item.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Native Apple Features Section */}
      <Separator className="my-6" />

      <div className="space-y-2 mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Native iOS Features
        </h2>
        <p className="text-sm text-muted-foreground">
          {isNative
            ? 'All native features are available in the iOS app.'
            : 'Download the iOS app to access these native features.'}
        </p>
      </div>

      {/* Haptic Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Vibrate className="h-5 w-5 text-purple-500" />
            Haptic Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Native haptic feedback for touch interactions on supported devices.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Light', fn: haptics.light, color: 'bg-gray-100 hover:bg-gray-200' },
              { label: 'Heavy', fn: haptics.heavy, color: 'bg-gray-200 hover:bg-gray-300' },
              { label: 'Success', fn: haptics.success, color: 'bg-green-100 hover:bg-green-200' },
              { label: 'Warning', fn: haptics.warning, color: 'bg-yellow-100 hover:bg-yellow-200' },
              { label: 'Error', fn: haptics.error, color: 'bg-red-100 hover:bg-red-200' },
              { label: 'Impact', fn: haptics.impact, color: 'bg-blue-100 hover:bg-blue-200' },
            ].map((item) => (
              <Button
                key={item.label}
                variant="outline"
                size="sm"
                className={item.color}
                onClick={() => {
                  item.fn();
                  showToast.info({ title: `${item.label} haptic` });
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={haptics.isAvailable ? 'default' : 'outline'}>
              {haptics.isAvailable ? 'Available' : 'Not Available'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Biometric Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScanFace className="h-5 w-5 text-blue-500" />
            Biometric Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Secure authentication using Face ID or Touch ID.
          </p>
          <Button
            variant="outline"
            className="w-full"
            disabled={!biometrics.isAvailable || biometrics.isAuthenticating}
            onClick={async () => {
              haptics.impact();
              const result = await biometrics.authenticate();
              if (result.authenticated) {
                haptics.success();
                showToast.success({
                  title: 'Authenticated',
                  description: 'Biometric authentication successful!'
                });
              } else {
                haptics.error();
                showToast.error({
                  title: 'Authentication Failed',
                  description: result.error || 'Please try again'
                });
              }
            }}
          >
            <Fingerprint className="h-4 w-4 mr-2" />
            {biometrics.isAuthenticating ? 'Authenticating...' : 'Test Biometric Auth'}
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant={biometrics.isAvailable ? 'default' : 'outline'}>
              {biometrics.isAvailable ? 'Available' : 'Native App Only'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Native Camera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-pink-500" />
            Native Camera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Access device camera and photo library.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!nativeMedia.isAvailable}
              onClick={async () => {
                haptics.impact();
                const result = await nativeMedia.capturePhoto();
                if (result) {
                  haptics.success();
                  showToast.success({ title: 'Photo captured!' });
                }
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!nativeMedia.isAvailable}
              onClick={async () => {
                haptics.impact();
                const result = await nativeMedia.pickPhoto();
                if (result) {
                  haptics.success();
                  showToast.success({ title: 'Photo selected!' });
                }
              }}
            >
              Photo Library
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={nativeMedia.isAvailable ? 'default' : 'outline'}>
              {nativeMedia.isAvailable ? 'Available' : 'Native App Only'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* More Native Features Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center gap-4 text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <Heart className="h-6 w-6" />
                <span className="text-xs">HealthKit</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Cloud className="h-6 w-6" />
                <span className="text-xs">iCloud Sync</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CreditCard className="h-6 w-6" />
                <span className="text-xs">In-App Purchase</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              More native features available in the iOS app including HealthKit integration,
              iCloud storage sync, and in-app purchases.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}