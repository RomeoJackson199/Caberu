import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { getUserFriendlyErrorMessage } from "@/lib/error-handling/formatting";
import { logger } from "@/lib/logger";

export const GlobalDashboardErrorListener = () => {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = getUserFriendlyErrorMessage(
        event.reason,
        "Something went wrong while loading the dashboard. Please try again."
      );

      toast({
        title: "Dashboard error",
        description: message,
        variant: "destructive",
      });

      logger.error("Unhandled rejection in dashboard", {
        reason: event.reason,
      });
    };

    const handleWindowError = (event: ErrorEvent) => {
      const message = getUserFriendlyErrorMessage(
        event.error || event.message,
        "We hit a snag loading this dashboard view."
      );

      toast({
        title: "Unexpected error",
        description: message,
        variant: "destructive",
      });

      logger.error("Unhandled error in dashboard", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
    };
  }, []);

  return null;
};

export default GlobalDashboardErrorListener;
