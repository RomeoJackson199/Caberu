import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { logger } from '@/lib/logger';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Home,
  Calendar,
  Users,
  MessageSquare,
  HelpCircle,
  ArrowLeft,
  Search,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    logger.warn("404 Error: User attempted to access non-existent route:", location.pathname);

    // Get user role for personalized suggestions
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("secure_profiles_view")
          .select("role")
          .eq("id", user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    };
    getUserRole();
  }, [location.pathname]);

  const quickLinks = [
    {
      icon: Home,
      label: "Dashboard",
      path: "/dashboard",
      description: "Return to your dashboard",
      show: !!userRole
    },
    {
      icon: Calendar,
      label: "Appointments",
      path: userRole === "patient" ? "/dashboard" : "/dentist/appointments",
      description: "View or manage appointments",
      show: !!userRole
    },
    {
      icon: Users,
      label: userRole === "dentist" ? "Patients" : "Find Dentists",
      path: userRole === "dentist" ? "/dentist/patients" : "/dentists",
      description: userRole === "dentist" ? "Manage patient records" : "Browse dentist profiles",
      show: true
    },
    {
      icon: MessageSquare,
      label: "Messages",
      path: "/messages",
      description: "Check your messages",
      show: !!userRole
    },
    {
      icon: HelpCircle,
      label: "Support",
      path: "/support",
      description: "Get help and support",
      show: true
    },
    {
      icon: Home,
      label: "Home",
      path: "/",
      description: "Go to homepage",
      show: !userRole
    }
  ].filter(link => link.show);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="max-w-3xl w-full space-y-8 animate-fade-in">
        {/* Error Icon and Message */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-200 rounded-full blur-3xl opacity-30 animate-float"></div>
            <AlertCircle className="h-24 w-24 text-blue-600 relative z-10 mx-auto" />
          </div>

          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-gray-900">404</h1>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">
              Page Not Found
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Show the attempted path */}
          {location.pathname && (
            <Card className="p-3 bg-gray-50 border-gray-200 max-w-md mx-auto">
              <code className="text-sm text-gray-700 break-all">
                {location.pathname}
              </code>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full sm:w-auto gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button
            size="lg"
            onClick={() => navigate("/")}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Home className="h-4 w-4" />
            Go to Homepage
          </Button>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            Quick Links
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Card
                  key={index}
                  className="p-4 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group"
                  onClick={() => navigate(link.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(link.path);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {link.label}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? Try using{" "}
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              Cmd+K
            </kbd>{" "}
            or{" "}
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              Ctrl+K
            </kbd>{" "}
            to open the command palette
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
