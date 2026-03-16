import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Home as HomeIcon, Calendar, CreditCard, Settings as SettingsIcon, Bot, LogOut, Info, PanelLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FloatingBookingButton } from "@/components/patients/FloatingBookingButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMobileOptimizations } from "@/components/mobile/MobileOptimizations";
import { useClinicBranding } from "@/hooks/useClinicBranding";
import { LanguageSelectorMenu } from "@/components/shared/LanguagePicker";
import { RoleSwitcherMenu } from "@/components/RoleSwitcher";
import { UserTour, useUserTour } from "@/components/UserTour";
import { useBusinessContext } from "@/hooks/useBusinessContext";

export type PatientSection = 'home' | 'assistant' | 'appointments' | 'payments' | 'settings';

interface PatientAppShellProps {
  activeSection: PatientSection;
  onChangeSection: (section: PatientSection) => void;
  children: React.ReactNode;
  badges?: Partial<Record<PatientSection, boolean>>;
  userId: string;
  onBookAppointment?: () => void;
  hasAIChat?: boolean;
}

const getNavItems = (hasAIChat: boolean): Array<{
  id: PatientSection;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<any>;
  color: string;
}> => {
  const items = [{
    id: 'home' as PatientSection,
    label: 'Home',
    icon: HomeIcon,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
  }, {
    id: 'assistant' as PatientSection,
    label: 'Booking',
    shortLabel: 'Booking',
    icon: hasAIChat ? Bot : Calendar,
    color: hasAIChat ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
  }];

  items.push(
    {
      id: 'appointments' as PatientSection,
      label: 'Appointments',
      shortLabel: 'Appts',
      icon: Calendar,
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
    },
    {
      id: 'payments' as PatientSection,
      label: 'Payments',
      icon: CreditCard,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30'
    }
  );

  return items;
};
export const PatientAppShell: React.FC<PatientAppShellProps> = ({
  activeSection,
  onChangeSection,
  children,
  badges = {},
  userId,
  onBookAppointment,
  hasAIChat = false
}) => {
  const NAV_ITEMS = getNavItems(hasAIChat);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    isMobile
  } = useMobileOptimizations();
  const {
    branding
  } = useClinicBranding();
  const {
    showTour,
    closeTour
  } = useUserTour("patient");

  const [userName, setUserName] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("?");
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('secure_profiles_view')
        .select('first_name, last_name, email, profile_picture_url')
        .eq('user_id', user.id)
        .maybeSingle();
      const full = `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.trim();
      setUserName(full || data?.email || '');
      const fi = (data?.first_name?.[0] || '').toUpperCase();
      const li = (data?.last_name?.[0] || '').toUpperCase();
      setUserInitials((fi + li || user.email?.[0] || '?').toString().toUpperCase());
      setUserProfilePicture(data?.profile_picture_url || null);
    })();
  }, []);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('psidebar:collapsed') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('psidebar:collapsed', collapsed ? '1' : '0');
    } catch { }
  }, [collapsed]);
  const isActive = (id: PatientSection) => activeSection === id;
  const toggleSidebar = () => setCollapsed(prev => !prev);
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleSettingsClick = () => {
    onChangeSection('settings');
  };
  if (isMobile) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-x-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b" role="banner">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2 flex-1">
            {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.clinicName || "Clinic Logo"} className="h-8 w-8 rounded-lg object-cover" /> : <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>}
            <span className="font-semibold text-lg">{branding.clinicName || "Patient Portal"}</span>
          </div>

          {activeSection === 'assistant' && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/book-appointment')} className="text-xs text-muted-foreground hover:text-primary">
              <Calendar className="h-4 w-4 mr-1" />
              Switch to Classic Booking
            </Button>
          )}

          <div className="flex items-center gap-2 flex-1 justify-end">
            {onBookAppointment && activeSection !== 'assistant' && <Button variant="gradient" size="icon" onClick={onBookAppointment} className="min-h-[44px] min-w-[44px]" aria-label="Book appointment">
              <Calendar className="h-5 w-5" />
              <span className="sr-only">Book appointment</span>
            </Button>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("hover:bg-primary/10 transition-colors touch-target min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", activeSection === 'settings' && "bg-primary/10 text-primary")} aria-label="Open menu">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={userProfilePicture || undefined} className="object-cover" />
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Menu</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <div className="space-y-1">
                    <RoleSwitcherMenu />
                    <LanguageSelectorMenu />
                  </div>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSettingsClick} aria-label="Settings">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/about')} aria-label="About">
                  <Info className="mr-2 h-4 w-4" />
                  About Caberu
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600" aria-label="Logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "mobile-header-offset mobile-bottom-nav-offset",
        activeSection === 'assistant' ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      )}>
        <AnimatePresence mode="wait">
          <motion.div key={activeSection} initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} transition={{
            duration: 0.2
          }} className={activeSection === 'assistant' ? "h-full" : "min-h-[calc(100vh-8rem)]"}>
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Book Button for Mobile - hidden on AI assistant section since user is already there */}
      {onBookAppointment && activeSection !== 'assistant' && <FloatingBookingButton onBookAppointment={onBookAppointment} />}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t safe-bottom">
        <nav className="flex items-center justify-around py-2" role="navigation" aria-label="Primary">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.id);
            const hasBadge = badges[item.id];
            return <button key={item.id} onClick={() => { if (item.id === 'assistant' && !hasAIChat) { onChangeSection('assistant'); } else { onChangeSection(item.id); } }} className={cn("flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all relative touch-target min-h-[44px] min-w-[44px]", active ? "text-primary" : "text-muted-foreground hover:text-foreground")} aria-current={active ? 'page' : undefined} aria-label={item.label}>
              <div className="relative">
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                {hasBadge && <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />}
              </div>
              <span className="text-xs mt-1">{item.shortLabel || item.label}</span>
            </button>;
          })}
        </nav>
      </div>
    </div>;
  }

  // Desktop Layout with Sidebar
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex" role="main">
    {/* Desktop Sidebar */}
    <div className={cn("fixed left-0 top-0 bottom-0 bg-card/80 backdrop-blur-lg border-r border-border/50 z-40 transition-[width] duration-200 ease-linear overflow-hidden", collapsed ? "w-16" : "w-64")}>
      {/* Sidebar Header */}
      <div className={cn("flex items-center border-b border-border/50 gap-3", collapsed ? "p-2" : "p-4")}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="relative h-9 w-9 shrink-0 rounded-lg group"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {/* Logo / fallback */}
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding.clinicName || "Clinic Logo"} className="h-9 w-9 rounded-lg object-cover group-hover:opacity-0 transition-opacity" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center group-hover:opacity-0 transition-opacity">
                    <span className="text-primary-foreground font-bold text-sm">P</span>
                  </div>
                )}
                {/* Collapse icon on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PanelLeft className="h-4 w-4 text-foreground" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!collapsed && <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-base leading-tight truncate">{branding.clinicName || "Patient Portal"}</h1>
          <p className="text-xs text-muted-foreground">{branding.tagline || "Healthcare Dashboard"}</p>
        </div>}
      </div>

      {/* Sidebar edge – collapse/expand on hover */}
      <div
        className="absolute top-0 -right-1 w-3 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-50"
        onClick={toggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        role="button"
        tabIndex={0}
      />

      {/* Navigation */}
      <nav className={cn("p-2", collapsed ? "space-y-1" : "space-y-2 p-4")} role="navigation" aria-label="Primary">
        <TooltipProvider>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.id);
            const hasBadge = badges[item.id];
            return <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button onClick={() => { if (item.id === 'assistant' && !hasAIChat) { onChangeSection('assistant'); } else { onChangeSection(item.id); } }} className={cn("w-full flex items-center px-3 py-3 rounded-xl transition-all relative group touch-target min-h-[40px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", active ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-[1.01]", collapsed ? "justify-center" : "gap-3")} aria-current={active ? 'page' : undefined} aria-label={item.label}>
                  <div className="relative shrink-0">
                    <Icon className="h-5 w-5" />
                    {hasBadge && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />}
                  </div>
                  {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>}
            </Tooltip>;
          })}

        </TooltipProvider>
      </nav>

      {/* Sidebar Footer */}
      <div className={cn("absolute bottom-0 left-0 right-0 border-t border-border/50", collapsed ? "p-2" : "p-4")}>
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? 'icon' : 'default'}
                  onClick={handleSettingsClick}
                  className={cn(
                    "w-full",
                    collapsed ? "justify-center" : "justify-start gap-3"
                  )}
                  aria-label="Settings"
                >
                  <SettingsIcon className="h-5 w-5" />
                  {!collapsed && <span>Settings</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p>Settings</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? 'icon' : 'default'}
                  onClick={handleSignOut}
                  className={cn(
                    "w-full text-destructive hover:text-destructive hover:bg-destructive/10",
                    collapsed ? "justify-center" : "justify-start gap-3"
                  )}
                  aria-label="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                  {!collapsed && <span>Sign Out</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p>Sign Out</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>

    {/* Main Content Area */}
    <div className={cn("flex-1 transition-[margin-left] duration-200 ease-linear", collapsed ? "ml-16" : "ml-64")}>

      <AnimatePresence mode="wait">
        <motion.div key={activeSection} initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: -20
        }} transition={{
          duration: 0.3
        }} className={activeSection === 'assistant' ? "h-screen overflow-hidden" : "p-6"}>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>

    {/* User Tour */}
    <UserTour isOpen={showTour} onClose={closeTour} userRole="patient" />
  </div>;
};
export default PatientAppShell;