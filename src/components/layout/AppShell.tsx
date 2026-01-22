import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLanguage } from "@/hooks/useLanguage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/translations";
import {
  Stethoscope,
  Calendar,
  Users,
  Clock,
  Wallet,
  BarChart3,
  FileBarChart,
  Boxes,
  Upload,
  CalendarCog,
  Globe,
  Shield,
  Languages,
  Search,
  Building2,
  ChevronDown,
  ChevronRight,
  Home,
  PanelLeft,
  Stethoscope as ToothIcon,
  Plus,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { emitAnalyticsEvent } from "@/lib/analyticsEvents";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { BusinessSelector } from "@/components/BusinessSelector";
import { useClinicBranding } from "@/hooks/useClinicBranding";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { BusinessSelectionForPatients } from "@/components/BusinessSelectionForPatients";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logger } from '@/lib/logger';

const STORAGE = {
  lastItem: "dnav:last-item",
  openGroups: "dnav:open-groups",
};

function readSidebarCookie(): boolean {
  try {
    const match = document.cookie.match(/(?:^|; )sidebar:state=([^;]+)/);
    if (match) return match[1] === "true";
  } catch { }
  return true;
}

type NavItem = {
  label: string;
  icon: React.ReactNode;
  to: string;
  badge?: string | number;
  isActive?: (path: string) => boolean;
  id: string;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

function TopBar() {
  const navigate = useNavigate();
  const [openSearch, setOpenSearch] = useState(false);
  const [openPatientPicker, setOpenPatientPicker] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { setTheme, theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { state, toggleSidebar } = useSidebar();
  const { switchBusiness, memberships, businessId } = useBusinessContext();
  const { toast } = useToast();
  const location = useLocation();
  const { branding } = useClinicBranding();

  const breadcrumbLabels = React.useMemo<Record<string, string>>(
    () => ({
      dentist: t.navDashboard ?? "Dashboard",
      dashboard: t.navDashboard ?? "Dashboard",
      clinical: t.navClinical ?? "Clinical",
      business: t.navBusiness ?? "Business",
      appointments: t.navAppointments ?? "Appointments",
      payments: t.navPayments ?? "Payments",
      analytics: t.navAnalytics ?? "Analytics",
      reports: t.navReports ?? "Reports",
      operations: t.navOperations ?? "Operations",
      ops: t.navOperations ?? "Operations",
      inventory: t.navInventory ?? "Inventory",
      imports: t.navImport ?? "Imports",
      admin: t.navAdmin ?? "Admin",
      schedule: t.navSchedule ?? "Schedule",
      patients: t.navPatients ?? "Patients",
      settings: "Settings",
      security: t.navSecurity ?? "Security",
      branding: t.navBrandingLoc ?? "Branding",
      details: "Details",
    }),
    [t]
  );

  const formatSegment = React.useCallback(
    (segment: string) => {
      const normalized = segment.toLowerCase();
      const direct = breadcrumbLabels[normalized];
      if (direct) return direct;
      const cleaned = normalized.replace(/-/g, " ");
      return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
    },
    [breadcrumbLabels]
  );

  const breadcrumbs = React.useMemo(() => {
    const rawSegments = location.pathname.split("/").filter(Boolean);
    const hasDentistPrefix = rawSegments[0] === "dentist";
    const segments = hasDentistPrefix ? rawSegments.slice(1) : rawSegments;
    const items: { href: string; label: string }[] = [];

    const baseHref = hasDentistPrefix ? "/dentist" : "/";
    items.push({ href: baseHref, label: formatSegment(hasDentistPrefix ? "dentist" : "dashboard") });

    segments.forEach((segment, index) => {
      const hrefSegments = hasDentistPrefix
        ? ["dentist", ...segments.slice(0, index + 1)]
        : segments.slice(0, index + 1);
      if (hrefSegments.length === 0) return;
      const href = `/${hrefSegments.join("/")}`;
      items.push({ href, label: formatSegment(segment) });
    });

    return items.filter(
      (item, index, arr) => index === arr.findIndex((candidate) => candidate.href === item.href)
    );
  }, [formatSegment, location.pathname]);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setUserId(data.session?.user?.id ?? null))
      .catch((error) => {
        console.error('Error getting session:', error);
        setUserId(null);
      });
  }, []);

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b shadow-sm supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        <SidebarTrigger className="md:hidden h-8 w-8" aria-label="Collapse or expand sidebar" title="Collapse/Expand" />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="hidden md:inline-flex gap-2 text-muted-foreground hover:text-foreground"
          aria-label={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
          title={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Home className="h-4 w-4" aria-hidden="true" />
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-xs">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={`${crumb.href}-${index}`}>
                {index > 0 && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden="true" />}
                {index < breadcrumbs.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => navigate(crumb.href)}
                    className="rounded px-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
          <Separator orientation="vertical" className="h-4 mx-2" />
          <Button variant="outline" size="sm" onClick={() => setOpenSearch(true)} className="gap-2 bg-background/50 border-dashed">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t.topSearch}</span>
            <span className="text-xs text-muted-foreground hidden md:inline">⌘K</span>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {memberships.length === 0 ? (
            <Button variant="outline" size="sm" onClick={() => setOpenPatientPicker(true)}>
              <Building2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Change clinic</span>
            </Button>
          ) : (
            <BusinessSelector />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-medium shadow-md">
                  {branding.clinicName?.[0]?.toUpperCase() || 'U'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Preferences</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{t.theme}: {theme}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t.language || 'Language'}</DropdownMenuLabel>
              {SUPPORTED_LANGUAGES.map(({ code, flag, name }) => (
                <DropdownMenuItem key={code} onClick={() => setLanguage(code as Language)}>
                  {flag} {name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dentist/settings?tab=users')}>
                <Users className="h-4 w-4 mr-2" />
                Team Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = 'mailto:romeo@caberu.be'}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => supabase.auth.signOut()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <GlobalSearch open={openSearch} onOpenChange={setOpenSearch} />

        <Dialog open={openPatientPicker} onOpenChange={setOpenPatientPicker}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Your Clinic</DialogTitle>
              <DialogDescription>Choose which clinic you want to access.</DialogDescription>
            </DialogHeader>
            <BusinessSelectionForPatients
              selectedBusinessId={businessId ?? undefined}
              onSelectBusiness={async (businessId) => {
                await switchBusiness(businessId);
                setOpenPatientPicker(false);
                toast({
                  title: "Clinic changed",
                  description: "You've switched to a different clinic.",
                });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        onOpenChange(true);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search patients, payments, inventory..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/dashboard"); }}>Dashboard</CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/analytics"); }}>Analytics</CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/schedule"); }}>Schedule</CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/dashboard#inventory"); }}>Inventory</CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/dashboard#payments"); }}>Payments</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Helper component to use useSidebar inside SidebarProvider
function SidebarLogoToggle({ branding }: { branding: { logoUrl?: string | null; clinicName?: string | null; tagline?: string | null } }) {
  const { toggleSidebar } = useSidebar();
  
  return (
    <button
      onClick={toggleSidebar}
      className="shrink-0 hover:opacity-80 transition-opacity cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label="Toggle sidebar"
      title="Click to expand/collapse sidebar"
    >
      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt={branding.clinicName || "Clinic"}
          className="h-8 w-8 rounded-lg object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center font-semibold shadow-md">
          {branding.clinicName?.[0]?.toUpperCase() || 'D'}
        </div>
      )}
    </button>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { businessId } = useBusinessContext();
  const { dentistId, userId } = useCurrentDentist(businessId);
  const { branding } = useClinicBranding();

  useScrollRestoration();

  // Default open: expanded on >=1024px, collapsed on 768–1023px, drawer on <768px handled by component
  const [defaultOpen, setDefaultOpen] = useState(true);
  useEffect(() => {
    const cookieOpen = readSidebarCookie();
    const w = window.innerWidth;
    const computed = w >= 1024 ? true : w >= 768 ? false : false;
    setDefaultOpen(typeof cookieOpen === 'boolean' ? cookieOpen : computed);
    try { emitAnalyticsEvent('nav_state_persisted', '', { collapsed: !cookieOpen }); } catch { }
  }, []);

  // Persisted open groups (multi-expand)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE.openGroups);
      return raw ? JSON.parse(raw) : { clinical: true };
    } catch {
      return { clinical: true };
    }
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE.openGroups, JSON.stringify(openGroups)); } catch { }
  }, [openGroups]);

  // Critical badges
  const [paymentsOverdue, setPaymentsOverdue] = useState<number>(0);
  const [inventoryLow, setInventoryLow] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!dentistId) return;
        const { data: overdue } = await (supabase as any)
          .from('payment_requests')
          .select('id, status')
          .eq('dentist_id', dentistId)
          .eq('status', 'overdue');
        const overdueCount = (overdue || []).length;
        const { data: items } = await (supabase as any)
          .from('inventory_items')
          .select('quantity, min_threshold')
          .eq('dentist_id', dentistId);
        const lowCount = (items || []).filter((i: any) => (i.quantity ?? 0) < (i.min_threshold ?? 0)).length;
        if (!cancelled) {
          setPaymentsOverdue(overdueCount);
          setInventoryLow(lowCount);
        }
      } catch (error) {
        logger.error('Failed to fetch badge counts:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [dentistId]);

  const groups: NavGroup[] = useMemo(() => [
    {
      id: "clinical",
      label: t.navClinical,
      items: [
        { id: 'clinical-dashboard', label: t.navDashboard, icon: <Stethoscope className="h-4 w-4" />, to: "/clinical" },
        { id: 'clinical-schedule', label: t.navSchedule, icon: <Calendar className="h-4 w-4" />, to: "/clinical/schedule" },
        { id: 'clinical-patients', label: t.navPatients, icon: <Users className="h-4 w-4" />, to: "/clinical/patients" },
        { id: 'clinical-appointments', label: t.navAppointments, icon: <Clock className="h-4 w-4" />, to: "/clinical/appointments" },
      ],
    },
    {
      id: "business",
      label: t.navBusiness,
      items: [
        { id: 'business-payments', label: t.navPayments, icon: <Wallet className="h-4 w-4" />, to: "/business/payments", badge: paymentsOverdue || undefined },
        { id: 'business-analytics', label: t.navAnalytics, icon: <BarChart3 className="h-4 w-4" />, to: "/business/analytics" },
        { id: 'business-reports', label: t.navReports, icon: <FileBarChart className="h-4 w-4" />, to: "/business/reports" },
      ],
    },
    {
      id: "operations",
      label: t.navOperations,
      items: [
        { id: 'ops-inventory', label: t.navInventory, icon: <Boxes className="h-4 w-4" />, to: "/ops/inventory", badge: inventoryLow || undefined },
        { id: 'ops-imports', label: t.navImport, icon: <Upload className="h-4 w-4" />, to: "/ops/imports" },
      ],
    },
    {
      id: "admin",
      label: t.navAdmin,
      items: [
        { id: 'admin-schedule', label: t.navSchedule + " Settings", icon: <CalendarCog className="h-4 w-4" />, to: "/admin/schedule" },
        { id: 'admin-branding', label: t.navBrandingLoc ?? 'Branding & Localization', icon: <Globe className="h-4 w-4" />, to: "/admin/branding" },
        { id: 'admin-security', label: t.navSecurity ?? 'Security', icon: <Shield className="h-4 w-4" />, to: "/admin/security" },
      ],
    },
  ], [t, paymentsOverdue, inventoryLow]);

  const handleNav = (to: string) => {
    try { localStorage.setItem(STORAGE.lastItem, to); } catch { }
    try { emitAnalyticsEvent('nav_click', '', { role: 'dentist', path: to, group: groups.find(g => g.items.some(i => i.to === to))?.id }); } catch { }
    navigate(to);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try { localStorage.setItem(STORAGE.openGroups, JSON.stringify(next)); } catch { }
      try { emitAnalyticsEvent('nav_toggle_group', '', { group: groupId, expanded: !!next[groupId] }); } catch { }
      return next;
    });
  };

  // Deep-linking auto-expand
  useEffect(() => {
    const full = location.pathname + location.search + location.hash;
    for (const g of groups) {
      if (g.items.some(i => full.startsWith(i.to))) {
        setOpenGroups(prev => ({ ...prev, [g.id]: true }));
      }
    }
    // Special case: overdue payments query
    const params = new URLSearchParams(location.search);
    if (location.pathname.startsWith('/business/payments') && params.get('status') === 'overdue') {
      setOpenGroups(prev => ({ ...prev, business: true }));
    }
  }, [location.pathname, location.search]);

  // Restore last visited on initial mount when landing on dashboard root
  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE.lastItem);
      const isRootDashboard = location.pathname === '/dashboard' || location.pathname === '/';
      if (last && isRootDashboard) {
        navigate(last, { replace: true });
      }
    } catch { }
    // run only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation within nav
  const navRef = useRef<HTMLDivElement | null>(null);
  const onKeyDownNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = navRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("[data-sidebar='menu-button']"));
    const activeEl = document.activeElement as HTMLElement | null;
    const index = buttons.findIndex(b => b === activeEl);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = buttons[Math.min(buttons.length - 1, index + 1)] || buttons[0];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = buttons[Math.max(0, index - 1)] || buttons[buttons.length - 1];
      prev?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Collapse/expand groups
      const groupId = activeEl?.getAttribute('data-group-id') || '';
      if (groupId) {
        e.preventDefault();
        const wantExpand = e.key === 'ArrowRight';
        const isExpanded = !!openGroups[groupId];
        if ((wantExpand && !isExpanded) || (!wantExpand && isExpanded)) {
          toggleGroup(groupId);
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (activeEl && activeEl.getAttribute('data-sidebar') === 'menu-button') {
        e.preventDefault();
        (activeEl as HTMLButtonElement).click();
      }
    }
  };

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{
        ["--sidebar-width" as any]: "18rem",
        ["--sidebar-width-icon" as any]: "4.5rem",
        ["--sidebar-transition" as any]: "220ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      <Sidebar variant="floating" collapsible={isMobile ? "offcanvas" : "icon"} className="border-r-0 bg-background/50 backdrop-blur-xl">
        <SidebarHeader className="px-4 py-4 transition-[padding] duration-200 group-data-[state=collapsed]:px-3 group-data-[state=collapsed]:py-5">
          <div className="flex items-center gap-3 px-1">
            <SidebarLogoToggle branding={branding} />
            <div className="leading-tight flex-1 min-w-0 transition-opacity duration-200 group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none">
              <div className="font-semibold truncate">{branding.clinicName || "Dental Practice"}</div>
              <div className="text-xs text-muted-foreground truncate">{branding.tagline || "Dashboard"}</div>
            </div>
          </div>
          <div className="mt-2 transition-opacity duration-200 group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none">
            <SidebarInput placeholder="Search…" aria-label="Search" className="group-data-[state=collapsed]:hidden bg-background/50" />
          </div>
        </SidebarHeader>
        <SidebarContent className="pt-3 transition-[padding] duration-200 group-data-[state=collapsed]:pt-4">
          {/* Quick Actions */}
          <SidebarGroup className="px-3">
            <div className="grid grid-cols-2 gap-2">
              <SidebarMenuButton
                size="sm"
                variant="outline"
                onClick={() => handleNav("/clinical/schedule")}
                aria-label={t.navSchedule}
                className="group-data-[state=collapsed]:h-10 group-data-[state=collapsed]:w-10 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:[&>span]:sr-only bg-background/50 hover:bg-background/80"
              >
                <Calendar className="h-4 w-4" />
                <span>{t.navSchedule}</span>
              </SidebarMenuButton>
              <SidebarMenuButton
                size="sm"
                variant="outline"
                onClick={() => handleNav("/clinical/patients")}
                aria-label={t.navPatients}
                className="group-data-[state=collapsed]:h-10 group-data-[state=collapsed]:w-10 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:[&>span]:sr-only bg-background/50 hover:bg-background/80"
              >
                <Users className="h-4 w-4" />
                <span>{t.navPatients}</span>
              </SidebarMenuButton>
            </div>
          </SidebarGroup>
          <SidebarSeparator className="bg-border/50" />
          <nav aria-label="Primary" onKeyDown={onKeyDownNav} ref={navRef}>
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`group-${group.id}`}>
                <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center justify-between pr-8 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider" role="button" tabIndex={0} aria-expanded={!!openGroups[group.id]} aria-controls={`group-content-${group.id}`} onClick={() => toggleGroup(group.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(group.id); } }}>
                    <span className="flex items-center gap-2" id={`group-${group.id}`}>
                      {group.id === "clinical" && <Stethoscope className="h-3 w-3" />}
                      {group.id === "business" && <BarChart3 className="h-3 w-3" />}
                      {group.id === "operations" && <Boxes className="h-3 w-3" />}
                      {group.id === "admin" && <Shield className="h-3 w-3" />}
                      <span>{group.label}</span>
                    </span>
                    <SidebarGroupAction aria-hidden="true">
                      <ChevronDown className={cn("h-3 w-3 transition-transform opacity-50", openGroups[group.id] ? "rotate-0" : "-rotate-90")} />
                    </SidebarGroupAction>
                  </SidebarGroupLabel>
                  <div
                    id={`group-content-${group.id}`}
                    role="region"
                    aria-labelledby={`group-${group.id}`}
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      openGroups[group.id] ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    {openGroups[group.id] && (
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.items.map((item) => {
                            const active = (location.pathname + location.search + location.hash).startsWith(item.to);
                            const ariaLabel = typeof item.badge === 'number' && item.badge > 0
                              ? `Group: ${group.label}, item: ${item.label}, ${item.badge} due.`
                              : `Group: ${group.label}, item: ${item.label}.`;
                            return (
                              <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton
                                  data-group-id={group.id}
                                  tooltip={item.label}
                                  isActive={active}
                                  aria-label={ariaLabel}
                                  onClick={() => handleNav(item.to)}
                                  className={cn(
                                    "rounded-md transition-all duration-200",
                                    active ? "bg-primary/10 text-primary font-medium shadow-sm" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {item.icon}
                                  <span>{item.label}</span>
                                </SidebarMenuButton>
                                {typeof item.badge === 'number' && item.badge > 0 && (
                                  <SidebarMenuBadge className="bg-red-500 text-white animate-pulse" aria-label={`${item.label}, ${item.badge} due`}>{item.badge}</SidebarMenuBadge>
                                )}
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    )}
                  </div>
                </SidebarGroup>
              </section>
            ))}
          </nav>
        </SidebarContent>
        <SidebarSeparator className="bg-border/50" />
        <SidebarFooter className="transition-[padding] duration-200 group-data-[state=collapsed]:px-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start transition-opacity duration-200 group-data-[state=collapsed]:hidden text-muted-foreground hover:text-foreground"
            >
              <Languages className="h-4 w-4 mr-2" />EN/FR/NL
            </Button>
            <SidebarTrigger
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Collapse or expand sidebar"
              title="Collapse/Expand"
            />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-transparent">
        <TopBar />
        <div className="p-4 md:p-6 lg:p-8 xl:p-10 min-h-[calc(100vh-4rem)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname + location.search}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppShell;
