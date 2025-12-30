import React from "react";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/30">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="pt-12 pb-10 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-orange-600 dark:text-orange-400" />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">You're offline</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Please check your internet connection and try again. 
              Some features may not work without a connection.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          {/* Connection Status Hint */}
          <p className="text-xs text-muted-foreground/70">
            If the problem persists, try reconnecting to Wi-Fi or mobile data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
