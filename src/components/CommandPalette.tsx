import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Calendar,
  Users,
  FileText,
  Settings,
  Home,
  CreditCard,
  Package,
  BarChart3,
  MessageSquare,
  Search,
  ClipboardList,
  Pill,
  FileBarChart,
  UserCircle,
  Shield,
  Clock,
  Palette,
  Bell,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch user role
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("secure_profiles_view")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    };
    getUserRole();
  }, []);

  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  }, [navigate]);

  // Define all available commands - all features enabled by default
  const allCommands: CommandItem[] = [
    // Navigation - General
    {
      id: "nav-home",
      label: "Go to Dashboard",
      icon: Home,
      action: () => navigate("/dashboard"),
      keywords: ["dashboard", "home", "main"],
      group: "Navigation",
    },
    {
      id: "nav-appointments",
      label: "View Appointments",
      icon: Calendar,
      action: () =>
        navigate(
          userRole === "patient" ? "/care/appointments" : "/dentist/appointments"
        ),
      keywords: ["appointments", "calendar", "schedule", "bookings"],
      group: "Navigation",
    },
    {
      id: "nav-messages",
      label: "View Messages",
      icon: MessageSquare,
      action: () => navigate("/messages"),
      keywords: ["messages", "chat", "communication"],
      group: "Navigation",
    },
    {
      id: "nav-notifications",
      label: "View Notifications",
      icon: Bell,
      action: () => navigate("/dashboard"),
      keywords: ["notifications", "alerts", "updates"],
      group: "Navigation",
    },

    // Patient-specific
    ...(userRole === "patient"
      ? [
        {
          id: "nav-prescriptions",
          label: "View Prescriptions",
          icon: Pill,
          action: () => navigate("/care/prescriptions"),
          keywords: ["prescriptions", "medications", "drugs"],
          group: "Medical",
        },
        {
          id: "nav-history",
          label: "View Treatment History",
          icon: FileBarChart,
          action: () => navigate("/care/history"),
          keywords: ["history", "treatments", "records"],
          group: "Medical",
        },
        {
          id: "nav-billing",
          label: "View Billing",
          icon: CreditCard,
          action: () => navigate("/billing"),
          keywords: ["billing", "payments", "invoices", "charges"],
          group: "Billing",
        },
        {
          id: "nav-profile",
          label: "Edit Profile",
          icon: UserCircle,
          action: () => navigate("/account/profile"),
          keywords: ["profile", "account", "settings", "personal"],
          group: "Account",
        },
        {
          id: "nav-insurance",
          label: "Manage Insurance",
          icon: Shield,
          action: () => navigate("/account/insurance"),
          keywords: ["insurance", "coverage", "provider"],
          group: "Account",
        },
      ]
      : []),

    // Dentist-specific
    ...(userRole === "dentist" || userRole === "provider"
      ? [
        {
          id: "nav-patients",
          label: "Manage Patients",
          icon: Users,
          action: () => navigate("/dentist/patients"),
          keywords: ["patients", "clients", "people"],
          group: "Management",
        },
        {
          id: "nav-clinical",
          label: "Clinical Records",
          icon: FileText,
          action: () => navigate("/dentist/clinical"),
          keywords: ["clinical", "records", "medical", "charts"],
          group: "Medical",
        },
        {
          id: "nav-schedule",
          label: "Manage Schedule",
          icon: Clock,
          action: () => navigate("/dentist/schedule"),
          keywords: ["schedule", "availability", "hours", "calendar"],
          group: "Management",
        },
        {
          id: "nav-payments",
          label: "Payment Requests",
          icon: CreditCard,
          action: () => navigate("/dentist/payments"),
          keywords: ["payments", "billing", "invoices", "charges"],
          group: "Billing",
        },
        {
          id: "nav-analytics",
          label: "View Analytics",
          icon: BarChart3,
          action: () => navigate("/dentist/analytics"),
          keywords: ["analytics", "reports", "statistics", "metrics"],
          group: "Analytics",
        },
        {
          id: "nav-inventory",
          label: "Manage Inventory",
          icon: Package,
          action: () => navigate("/dentist/inventory"),
          keywords: ["inventory", "supplies", "stock", "products"],
          group: "Management",
        },
        {
          id: "nav-services",
          label: "Manage Services",
          icon: ClipboardList,
          action: () => navigate("/dentist/services"),
          keywords: ["services", "treatments", "procedures"],
          group: "Management",
        },
        {
          id: "nav-branding",
          label: "Clinic Branding",
          icon: Palette,
          action: () => navigate("/dentist/branding"),
          keywords: ["branding", "theme", "colors", "logo"],
          group: "Settings",
        },
        {
          id: "nav-security",
          label: "Security Settings",
          icon: Shield,
          action: () => navigate("/dentist/security"),
          keywords: ["security", "permissions", "access", "roles"],
          group: "Settings",
        },
        {
          id: "nav-dentist-settings",
          label: "Practice Settings",
          icon: Settings,
          action: () => navigate("/dentist/settings"),
          keywords: ["settings", "configuration", "preferences"],
          group: "Settings",
        },
      ]
      : []),

    // Common actions
    {
      id: "action-book",
      label: "Book New Appointment",
      icon: Calendar,
      action: () => { try { localStorage.setItem('pd_section', 'assistant'); } catch { }; window.dispatchEvent(new CustomEvent('dashboard:changeSection', { detail: { section: 'assistant' } })); navigate('/dashboard'); },
      keywords: ["book", "appointment", "new", "schedule"],
      group: "Actions",
    },
    {
      id: "action-search",
      label: "Search",
      icon: Search,
      action: () => toast.info("Search functionality coming soon"),
      keywords: ["search", "find", "lookup"],
      group: "Actions",
    },
    {
      id: "action-help",
      label: "Get Help",
      icon: HelpCircle,
      action: () => navigate("/support"),
      keywords: ["help", "support", "faq", "documentation"],
      group: "Help",
    },
    {
      id: "action-signout",
      label: "Sign Out",
      icon: LogOut,
      action: handleSignOut,
      keywords: ["logout", "signout", "exit"],
      group: "Account",
    },
  ];

  // Group commands by category
  const groupedCommands = allCommands.reduce((acc, command) => {
    if (!acc[command.group]) {
      acc[command.group] = [];
    }
    acc[command.group].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {Object.entries(groupedCommands).map(([group, commands], index) => (
          <div key={group}>
            <CommandGroup heading={group}>
              {commands.map((command) => {
                const Icon = command.icon;
                return (
                  <CommandItem
                    key={command.id}
                    onSelect={() => handleSelect(command.action)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{command.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {index < Object.keys(groupedCommands).length - 1 && <CommandSeparator />}
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
