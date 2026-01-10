/**
 * NativeFeatures Component
 *
 * A comprehensive showcase of all Apple/iOS native features available through Despia.
 * Can be used as a settings panel or feature demonstration page.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Fingerprint,
  ScanFace,
  Bell,
  Cloud,
  CreditCard,
  Heart,
  Camera,
  Share2,
  Vibrate,
  Shield,
  Check,
  X,
  Loader2,
  Settings,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  useDespiaNative,
  useHaptics,
  useBiometricAuth,
  useLocalNotifications,
  useStorageVault,
  useNativeMedia,
  useNativeShare,
  useAppInfo,
  useSafeArea,
} from '@/hooks/useDespia';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/notification-toast';

interface NativeFeaturesProps {
  className?: string;
  showAllFeatures?: boolean;
}

export function NativeFeatures({ className, showAllFeatures = true }: NativeFeaturesProps) {
  const isNative = useDespiaNative();
  const haptics = useHaptics();
  const biometrics = useBiometricAuth();
  const notifications = useLocalNotifications();
  const media = useNativeMedia();
  const share = useNativeShare();
  const appInfo = useAppInfo();
  const safeArea = useSafeArea();

  // Test storage vault
  const { value: vaultValue, save: saveToVault, isLoading: vaultLoading } = useStorageVault<string>('test_key');
  const [testInput, setTestInput] = useState('');

  // Feature status helper
  const FeatureStatus = ({ available }: { available: boolean }) => (
    <Badge variant={available ? 'default' : 'secondary'} className={cn(
      available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    )}>
      {available ? (
        <>
          <Check className="h-3 w-3 mr-1" />
          Available
        </>
      ) : (
        <>
          <X className="h-3 w-3 mr-1" />
          Native Only
        </>
      )}
    </Badge>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Platform Status Banner */}
      <Alert className={cn(
        isNative
          ? 'border-green-200 bg-green-50'
          : 'border-blue-200 bg-blue-50'
      )}>
        <Smartphone className={cn(
          'h-4 w-4',
          isNative ? 'text-green-600' : 'text-blue-600'
        )} />
        <AlertDescription className={cn(
          isNative ? 'text-green-800' : 'text-blue-800'
        )}>
          {isNative ? (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Running in Native iOS App - All features available!
            </span>
          ) : (
            'Running in Web Browser - Some features require the native iOS app.'
          )}
        </AlertDescription>
      </Alert>

      {/* App Info Card */}
      {isNative && appInfo.version && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              App Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">{appInfo.version.versionNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Build</span>
              <span className="font-medium">{appInfo.version.bundleNumber}</span>
            </div>
            {appInfo.deviceId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Device ID</span>
                <span className="font-mono text-xs">{appInfo.deviceId.slice(0, 8)}...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Haptic Feedback */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">Haptic Feedback</CardTitle>
            </div>
            <FeatureStatus available={haptics.isAvailable} />
          </div>
          <CardDescription>
            Native haptic feedback for touch interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Light', fn: haptics.light, color: 'bg-gray-100' },
              { label: 'Heavy', fn: haptics.heavy, color: 'bg-gray-300' },
              { label: 'Success', fn: haptics.success, color: 'bg-green-100' },
              { label: 'Warning', fn: haptics.warning, color: 'bg-yellow-100' },
              { label: 'Error', fn: haptics.error, color: 'bg-red-100' },
              { label: 'Impact', fn: haptics.impact, color: 'bg-blue-100' },
            ].map((item) => (
              <Button
                key={item.label}
                variant="outline"
                size="sm"
                className={item.color}
                onClick={() => {
                  item.fn();
                  showToast.info({ title: `${item.label} haptic triggered` });
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Biometric Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Biometric Auth</CardTitle>
            </div>
            <FeatureStatus available={biometrics.isAvailable} />
          </div>
          <CardDescription>
            Face ID / Touch ID authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={async () => {
              const result = await biometrics.authenticate();
              if (result.authenticated) {
                haptics.success();
                showToast.success({
                  title: 'Authenticated!',
                  description: `Using ${result.biometryType || 'biometrics'}`,
                });
              } else {
                haptics.error();
                showToast.error({
                  title: 'Authentication Failed',
                  description: result.error,
                });
              }
            }}
            disabled={!biometrics.isAvailable || biometrics.isAuthenticating}
            className="w-full"
          >
            {biometrics.isAuthenticating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Fingerprint className="h-4 w-4 mr-2" />
            )}
            {biometrics.isAuthenticating ? 'Authenticating...' : 'Test Authentication'}
          </Button>

          {biometrics.lastResult && (
            <div className={cn(
              'p-3 rounded-lg text-sm',
              biometrics.lastResult.authenticated
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            )}>
              {biometrics.lastResult.authenticated
                ? `Authenticated via ${biometrics.lastResult.biometryType || 'biometrics'}`
                : biometrics.lastResult.error || 'Authentication failed'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Push Notifications</CardTitle>
            </div>
            <FeatureStatus available={notifications.isAvailable} />
          </div>
          <CardDescription>
            Local push notification scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Permission Status</span>
            <Badge variant="outline">
              {notifications.permission}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const granted = await notifications.requestPermission();
                if (granted) {
                  haptics.success();
                  showToast.success({ title: 'Notifications enabled!' });
                }
              }}
              disabled={notifications.permission === 'granted'}
            >
              <Shield className="h-4 w-4 mr-2" />
              Request Permission
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const success = await notifications.schedule({
                  title: 'Test Notification',
                  body: 'This is a test notification from Caberu!',
                  delaySeconds: 3,
                });
                if (success) {
                  haptics.success();
                  showToast.info({ title: 'Notification scheduled (3s delay)' });
                }
              }}
              disabled={notifications.permission !== 'granted'}
            >
              <Bell className="h-4 w-4 mr-2" />
              Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storage Vault (iCloud) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-sky-500" />
              <CardTitle className="text-lg">Storage Vault</CardTitle>
            </div>
            <FeatureStatus available={true} />
          </div>
          <CardDescription>
            Secure storage with iCloud sync on iOS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-input">Test Value</Label>
            <div className="flex gap-2">
              <Input
                id="vault-input"
                placeholder="Enter a value..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
              />
              <Button
                onClick={async () => {
                  const success = await saveToVault(testInput);
                  if (success) {
                    haptics.success();
                    showToast.success({ title: 'Saved to vault!' });
                    setTestInput('');
                  }
                }}
                disabled={!testInput || vaultLoading}
              >
                {vaultLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>

          {vaultValue && (
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Stored Value:</span>
              <p className="font-medium">{vaultValue}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera & Media */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-pink-500" />
              <CardTitle className="text-lg">Camera & Media</CardTitle>
            </div>
            <FeatureStatus available={media.isAvailable} />
          </div>
          <CardDescription>
            Native camera and photo library access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                haptics.impact();
                const photo = await media.capturePhoto();
                if (photo) {
                  haptics.success();
                  showToast.success({ title: 'Photo captured!' });
                }
              }}
              disabled={!media.isAvailable || media.isCapturing}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                haptics.impact();
                const photo = await media.pickPhoto();
                if (photo) {
                  haptics.success();
                  showToast.success({ title: 'Photo selected!' });
                }
              }}
              disabled={!media.isAvailable || media.isCapturing}
            >
              Photo Library
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                haptics.impact();
                const screenshot = await media.captureScreenshot();
                if (screenshot) {
                  haptics.success();
                  showToast.success({ title: 'Screenshot captured!' });
                }
              }}
              disabled={!media.isAvailable || media.isCapturing}
              className="col-span-2"
            >
              Take Screenshot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Native Share</CardTitle>
            </div>
            <FeatureStatus available={share.isAvailable} />
          </div>
          <CardDescription>
            Share content via native share sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              haptics.impact();
              const success = await share.share({
                title: 'Caberu - Dental Practice Management',
                message: 'Check out this amazing dental practice management app!',
                url: window.location.origin,
              });
              if (success) {
                haptics.success();
              }
            }}
            disabled={!share.isAvailable || share.isSharing}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Caberu
          </Button>
        </CardContent>
      </Card>

      {/* Safe Area Info */}
      {safeArea.insets.top > 0 || safeArea.insets.bottom > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">Safe Area Insets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Top</span>
                <span className="font-mono">{safeArea.insets.top}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bottom</span>
                <span className="font-mono">{safeArea.insets.bottom}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Left</span>
                <span className="font-mono">{safeArea.insets.left}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Right</span>
                <span className="font-mono">{safeArea.insets.right}px</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default NativeFeatures;
