import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ServerCrash,
  Home,
  RefreshCw,
  Clock,
  AlertTriangle,
  Wrench
} from "lucide-react";

interface DowntimePageProps {
  /**
   * Type of downtime: 'maintenance' or 'error'
   * @default 'maintenance'
   */
  type?: 'maintenance' | 'error';
  /**
   * Custom title for the page
   */
  title?: string;
  /**
   * Custom message to display
   */
  message?: string;
  /**
   * Estimated time until service is restored (optional)
   */
  estimatedTime?: string;
  /**
   * Whether to show the refresh button
   * @default true
   */
  showRefresh?: boolean;
}

const DowntimePage = ({
  type = 'maintenance',
  title,
  message,
  estimatedTime,
  showRefresh = true
}: DowntimePageProps) => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  // Determine content based on type
  const isMaintenance = type === 'maintenance';
  const Icon = isMaintenance ? Wrench : ServerCrash;
  const iconBgColor = isMaintenance
    ? "bg-amber-100 dark:bg-amber-900/30"
    : "bg-red-100 dark:bg-red-900/30";
  const iconColor = isMaintenance
    ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";
  const gradientFrom = isMaintenance ? "from-amber-50" : "from-red-50";
  const gradientTo = isMaintenance ? "to-orange-50" : "to-rose-50";

  const defaultTitle = isMaintenance
    ? "We'll Be Right Back"
    : "Service Temporarily Unavailable";

  const defaultMessage = isMaintenance
    ? "We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly."
    : "We're experiencing technical difficulties. Our team has been notified and is working to resolve the issue.";

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${gradientFrom} via-white ${gradientTo} dark:from-background dark:via-background dark:to-muted/30 px-4 py-8`}>
      <div className="max-w-2xl w-full space-y-8 animate-fade-in">
        {/* Main Card */}
        <Card className="border-2 shadow-xl">
          <CardContent className="pt-12 pb-10 text-center space-y-8">
            {/* Icon with Animation */}
            <div className="relative inline-block">
              <div className={`absolute inset-0 ${iconBgColor} rounded-full blur-2xl opacity-40 animate-pulse`}></div>
              <div className={`relative z-10 mx-auto w-24 h-24 rounded-full ${iconBgColor} flex items-center justify-center`}>
                <Icon className={`h-12 w-12 ${iconColor}`} />
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {title || defaultTitle}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                  {message || defaultMessage}
                </p>
              </div>

              {/* Estimated Time */}
              {estimatedTime && (
                <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-3 text-blue-900 dark:text-blue-100">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Estimated Restoration Time</p>
                      <p className="text-lg font-semibold">{estimatedTime}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {showRefresh && (
                <Button
                  size="lg"
                  onClick={handleRefresh}
                  className={`w-full sm:w-auto gap-2 ${
                    isMaintenance
                      ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
              <Button
                size="lg"
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full sm:w-auto gap-2"
              >
                <Home className="h-4 w-4" />
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <div className="space-y-4">
          <Card className="p-6 bg-white/50 dark:bg-muted/50 backdrop-blur-sm border-dashed">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    What's happening?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isMaintenance
                      ? "Our team is performing essential updates and maintenance to ensure the best possible experience for you."
                      : "Our technical team is actively investigating and working to restore full service as quickly as possible."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    What should I do?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Please check back in a few minutes. Your data is safe and will be available when we're back online.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Status Updates Hint */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              For real-time updates, you can refresh this page periodically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DowntimePage;
