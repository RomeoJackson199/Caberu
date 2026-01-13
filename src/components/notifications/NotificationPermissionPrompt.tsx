import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pushNotificationService } from "@/lib/pushNotifications";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkNotificationStatus = async () => {
      // Check if push notifications are supported
      if (!pushNotificationService.isSupported()) {
        return;
      }

      const currentPermission = pushNotificationService.getPermission();
      setPermission(currentPermission);

      // Check if already subscribed
      const subscribed = await pushNotificationService.isSubscribed();
      setIsSubscribed(subscribed);

      // Show prompt if permission is default and not already dismissed
      const dismissed = localStorage.getItem("notification-prompt-dismissed");
      if (currentPermission === "default" && !dismissed && !subscribed) {
        // Show prompt after a delay to not overwhelm the user on page load
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    };

    checkNotificationStatus();
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const subscription = await pushNotificationService.subscribe();

      if (subscription) {
        setPermission("granted");
        setIsSubscribed(true);
        setShowPrompt(false);

        toast({
          title: "Notifications enabled!",
          description: "You'll now receive push notifications for important updates.",
        });

        // Show a test notification
        await pushNotificationService.showNotification(
          "Notifications Enabled",
          {
            body: "You'll receive notifications for appointments, prescriptions, and important updates.",
            icon: "/logo.png",
            tag: "welcome-notification"
          }
        );
      } else {
        toast({
          title: "Permission denied",
          description: "You can enable notifications later in your browser settings.",
          variant: "destructive"
        });
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
      toast({
        title: "Failed to enable notifications",
        description: "Please try again or check your browser settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("notification-prompt-dismissed", "true");
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      const success = await pushNotificationService.unsubscribe();

      if (success) {
        setIsSubscribed(false);
        toast({
          title: "Notifications disabled",
          description: "You won't receive push notifications anymore.",
        });
      }
    } catch (error) {
      console.error("Failed to disable notifications:", error);
      toast({
        title: "Failed to disable notifications",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if notifications aren't supported
  if (!pushNotificationService.isSupported()) {
    return null;
  }

  return (
    <>
      {/* Floating prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50 max-w-md"
          >
            <Card className="shadow-lg border-2">
              <CardHeader className="relative pb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Enable Notifications?</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm">
                  Stay updated with:
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>Appointment reminders</li>
                    <li>Prescription updates</li>
                    <li>Treatment plan changes</li>
                    <li>Important messages from your dentist</li>
                  </ul>
                </CardDescription>
                <div className="flex gap-2">
                  <Button
                    onClick={handleEnableNotifications}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Enabling..." : "Enable Notifications"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDismiss}
                    disabled={loading}
                  >
                    Not Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings control - shown when permission is granted */}
      {permission === "granted" && isSubscribed && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisableNotifications}
            disabled={loading}
            className="text-muted-foreground"
          >
            <BellOff className="h-4 w-4 mr-2" />
            {loading ? "Disabling..." : "Disable Push Notifications"}
          </Button>
        </div>
      )}

      {/* Re-enable button if permission granted but not subscribed */}
      {permission === "granted" && !isSubscribed && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnableNotifications}
            disabled={loading}
          >
            <Bell className="h-4 w-4 mr-2" />
            {loading ? "Enabling..." : "Enable Push Notifications"}
          </Button>
        </div>
      )}
    </>
  );
}
