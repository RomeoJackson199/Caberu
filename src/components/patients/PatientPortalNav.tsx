import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/hooks/useLanguage";
import { Home, Calendar, Pill, FileText, CreditCard, Folder, User, IdCard, Shield, HelpCircle, ChevronDown, MoreHorizontal, PanelLeft, LogOut, Info } from "lucide-react";
import { usePatientBadgeCounts } from "@/hooks/usePatientBadges";
import { cn } from "@/lib/utils";
import { emitAnalyticsEvent } from "@/lib/analyticsEvents";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSelector } from "@/components/LanguageSelector";
import { FloatingBookingButton } from "./FloatingBookingButton";
import { BusinessSelector } from "@/components/BusinessSelector";
import { useClinicBranding } from "@/hooks/useClinicBranding";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  to: string;
  badge?: number;
  tooltip?: string;
  onClick?: (e?: React.MouseEvent) => void;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const STORAGE_KEYS = {
  sidebarState: 'pnav:state',
  lastVisited: 'pnav:last',
  lastGroup: 'pnav:group',
};

function readSidebarCookie(): boolean {
  try {
    const match = document.cookie.match(/(?:^|; )sidebar:state=([^;]+)/);
    if (match) {
      return match[1] === 'true';
    }
  } catch (error) {
    console.debug('Failed to read sidebar cookie:', error);
  }
  return true;
}

function PatientPortalNavContent({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar, open, setOpen } = useSidebar();
  const { counts } = usePatientBadgeCounts();
  const { branding } = useClinicBranding();
  const { businessName } = useBusinessContext();
  const [openGroupId, setOpenGroupId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.lastGroup));
  const [moreOpen, setMoreOpen] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('profile_picture_url').eq('user_id', user.id).maybeSingle();
      setUserProfilePicture(data?.profile_picture_url || null);
    };
    loadUserProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };


  useEffect(() => {
    if (openGroupId) localStorage.setItem(STORAGE_KEYS.lastGroup, openGroupId);
  }, [openGroupId]);

  // Groups and items per IA - all features enabled (no template restrictions)
  const groups: NavGroup[] = useMemo(() => {
    const careItems = [
      { id: 'care-home', label: t.pnav.care.home, icon: <Home className="h-4 w-4" />, to: '/care' },
      {
        id: 'care-booking',
        label: t.classicBooking,
        icon: <Calendar className="h-4 w-4" />,
        to: '/dashboard',
        onClick: (e?: React.MouseEvent) => {
          e?.preventDefault();
          localStorage.setItem('pd_section', 'assistant');
          window.dispatchEvent(new CustomEvent('dashboard:changeSection', { detail: { section: 'assistant' } }));
          if (location.pathname !== '/dashboard') {
            navigate('/dashboard');
          }
        }
      },
      { id: 'care-appointments', label: t.pnav.care.appointments, icon: <Calendar className="h-4 w-4" />, to: '/care/appointments', badge: counts.upcoming7d },
      { id: 'care-prescriptions', label: t.pnav.care.prescriptions, icon: <Pill className="h-4 w-4" />, to: '/care/prescriptions' },
      { id: 'care-history', label: t.pnav.care.history, icon: <FileText className="h-4 w-4" />, to: '/care/history' },
    ];

    const allGroups: NavGroup[] = [
      {
        id: 'care',
        label: t.pnav.group.care,
        items: careItems,
      },
      {
        id: 'billing',
        label: t.pnav.group.billing,
        items: [
          { id: 'billing-main', label: t.pnav.billing.main, icon: <CreditCard className="h-4 w-4" />, to: '/billing', badge: counts.unpaid },
        ],
      },
      {
        id: 'documents',
        label: t.pnav.group.documents,
        items: [
          { id: 'docs-main', label: t.pnav.docs.main, icon: <Folder className="h-4 w-4" />, to: '/docs' },
        ],
      },
      {
        id: 'account',
        label: t.pnav.group.account,
        items: [
          { id: 'account-profile', label: t.pnav.account.profile, icon: <User className="h-4 w-4" />, to: '/account/profile' },
          { id: 'account-insurance', label: t.pnav.account.insurance, icon: <IdCard className="h-4 w-4" />, to: '/account/insurance' },
          { id: 'account-privacy', label: t.pnav.account.privacy, icon: <Shield className="h-4 w-4" />, to: '/account/privacy' },
          { id: 'account-help', label: t.pnav.account.help, icon: <HelpCircle className="h-4 w-4" />, to: '/account/help' },
        ],
      },
    ];

    return allGroups;
  }, [t, counts.upcoming7d, counts.unpaid, location.pathname, navigate]);

  // Deep link behavior: /billing?status=unpaid expands Billing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (location.pathname.startsWith('/billing') && status) {
      setOpenGroupId('billing');
    }
  }, [location.pathname, location.search]);

  // Auto-expand correct group based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/care')) setOpenGroupId('care');
    else if (path.startsWith('/billing')) setOpenGroupId('billing');
    else if (path.startsWith('/docs')) setOpenGroupId('documents');
    else if (path.startsWith('/account')) setOpenGroupId('account');
  }, [location.pathname]);

  const handleNav = (groupId: string, item: NavItem, e: React.MouseEvent) => {
    try { localStorage.setItem(STORAGE_KEYS.lastVisited, item.to); } catch (error) { console.debug('Failed to save last visited:', error); }
    try { emitAnalyticsEvent('pnav_click', '', { role: 'patient', group: groupId, item: item.id, path: item.to }); } catch (error) { console.debug('Failed to emit analytics:', error); }
    if (isMobile) setMoreOpen(false);

    // Auto-collapse sidebar when navigating to booking
    if (item.to === '/dashboard' && item.id === 'care-booking' && state !== 'collapsed') {
      toggleSidebar();
    }
  };

  // Restore last item on mount
  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEYS.lastVisited);
    if (last && location.pathname === '/dashboard') {
      navigate(last);
    }
  }, []);

  // Keyboard navigation within nav (up/down to move, left/right to collapse/expand)
  const navRef = useRef<HTMLDivElement | null>(null);
  const onKeyDownNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = navRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("[data-sidebar='menu-button']"));
    const activeEl = document.activeElement as HTMLElement | null;
    const index = buttons.findIndex((b) => b === activeEl);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = buttons[Math.min(buttons.length - 1, index + 1)] || buttons[0];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = buttons[Math.max(0, index - 1)] || buttons[buttons.length - 1];
      prev?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const gid = activeEl?.getAttribute('data-group-id') || '';
      if (gid) {
        e.preventDefault();
        const wantExpand = e.key === 'ArrowRight';
        const isExpanded = openGroupId === gid;
        if ((wantExpand && !isExpanded) || (!wantExpand && isExpanded)) {
          setOpenGroupId((prev) => (prev === gid ? null : gid));
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (activeEl && activeEl.getAttribute('data-sidebar') === 'menu-button') {
        e.preventDefault();
        (activeEl as HTMLButtonElement).click();
      }
    }
  };

  const navContent = (
    <>
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2 px-1">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={t.clinicLogoAlt} className="h-7 w-7 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold flex-shrink-0">
              {(businessName || branding.clinicName)?.[0]?.toUpperCase() || 'P'}
            </span>
          )}
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm truncate">{businessName || branding.clinicName || t.patientPortal}</span>
            <BusinessSelector />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Primary" onKeyDown={onKeyDownNav} ref={navRef}>
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`group-${group.id}`}>
              <SidebarGroup>
                <SidebarGroupLabel
                  className="flex items-center justify-between pr-8"
                  role="button"
                  tabIndex={0}
                  aria-expanded={openGroupId === group.id}
                  aria-controls={`group-content-${group.id}`}
                  onClick={() => setOpenGroupId(prev => prev === group.id ? null : group.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenGroupId(prev => prev === group.id ? null : group.id); } }}
                >
                  <span id={`group-${group.id}`}>{group.label}</span>
                  <SidebarGroupAction aria-hidden="true">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openGroupId === group.id ? "rotate-0" : "-rotate-90")} />
                  </SidebarGroupAction>
                </SidebarGroupLabel>
                <div
                  id={`group-content-${group.id}`}
                  role="region"
                  aria-labelledby={`group-${group.id}`}
                  className={cn("overflow-hidden transition-all duration-200 ease-in-out", openGroupId === group.id ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}
                >
                  {openGroupId === group.id && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton asChild data-group-id={group.id} tooltip={item.label}>
                              {item.onClick ? (
                                <button
                                  onClick={(e) => {
                                    item.onClick?.(e);
                                    handleNav(group.id, item, e as any);
                                  }}
                                  aria-label={item.label}
                                >
                                  {item.icon}
                                  <span>{item.label}</span>
                                </button>
                              ) : (
                                <NavLink
                                  to={item.to}
                                  end={item.to === '/care'}
                                  onClick={(e) => handleNav(group.id, item, e)}
                                  aria-label={item.label}
                                  className={({ isActive }) => cn(
                                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                                  )}
                                >
                                  {item.icon}
                                  <span>{item.label}</span>
                                </NavLink>
                              )}
                            </SidebarMenuButton>
                            {typeof item.badge !== 'undefined' && item.badge > 0 && (
                              <SidebarMenuBadge aria-label={`${item.label}, ${item.badge} pending`}>{item.badge}</SidebarMenuBadge>
                            )}
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </div>
              </SidebarGroup>
            </section>
          ))}
        </nav>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <SidebarTrigger className="h-8 w-8" aria-label={t.collapseExpandSidebar} title={t.collapseExpandSidebar} />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </>
  );

  // Mobile: bottom tabs with More opening full-height drawer showing same content
  if (isMobile) {
    const haptic = () => { try { (navigator as any)?.vibrate?.(10); } catch (error) { console.debug('Haptic feedback failed:', error); } };
    return (
      <div className="min-h-screen flex flex-col">
        {/* Mobile top header with menu toggle */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b px-3 py-2 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMoreOpen(true)} aria-label={t.openMenu}>
            <PanelLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={t.clinicLogoAlt} className="h-6 w-6 rounded-lg object-cover" />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                {(businessName || branding.clinicName)?.[0]?.toUpperCase() || 'P'}
              </span>
            )}
            <span className="text-sm font-medium truncate">{businessName || branding.clinicName || t.patientPortal}</span>
          </div>
        </header>

        <div className="flex-1">{children ?? <Outlet />}</div>

        {/* Floating Book Appointment Button */}
        <FloatingBookingButton onBookAppointment={() => {
          localStorage.setItem('pd_section', 'assistant');
          window.dispatchEvent(new CustomEvent('dashboard:changeSection', { detail: { section: 'assistant' } }));
          if (location.pathname !== '/dashboard') {
            navigate('/dashboard');
          }
        }} />

        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t">
          <div className="grid grid-cols-4">
            <NavLink to="/care" end onClick={haptic} className={({ isActive }) => cn("py-2 flex flex-col items-center", isActive ? 'text-primary' : 'text-muted-foreground')} aria-label={t.pnav.care.home}>
              <Home className="h-5 w-5" />
              <span className="text-xs">{t.pnav.care.home}</span>
            </NavLink>
            <NavLink to="/care/appointments" onClick={haptic} className={({ isActive }) => cn("py-2 flex flex-col items-center relative", isActive ? 'text-primary' : 'text-muted-foreground')} aria-label={t.pnav.care.appointments}>
              <div className="relative">
                <Calendar className="h-5 w-5" />
                {counts.upcoming7d > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full" />}
              </div>
              <span className="text-xs">{t.pnav.care.appointments}</span>
            </NavLink>
            <NavLink to="/billing" onClick={haptic} className={({ isActive }) => cn("py-2 flex flex-col items-center relative", isActive ? 'text-primary' : 'text-muted-foreground')} aria-label={t.pnav.group.billing}>
              <div className="relative">
                <CreditCard className="h-5 w-5" />
                {counts.unpaid > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full" />}
              </div>
              <span className="text-xs">{t.pnav.group.billing}</span>
            </NavLink>
            <button className="py-2 flex flex-col items-center text-muted-foreground" onClick={() => { haptic(); setMoreOpen(true); }} aria-label={t.more}>
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs">{t.more}</span>
            </button>
          </div>
        </nav>
        <Drawer shouldScaleBackground={true} open={moreOpen} onOpenChange={setMoreOpen}>
          <DrawerContent>
            <div className="max-h-[90vh] overflow-auto p-2">
              <SidebarProvider defaultOpen style={{ ['--sidebar-width' as any]: '17.5rem', ['--sidebar-width-icon' as any]: '4.5rem' }}>
                <div className="md:hidden">
                  {navContent}
                  {/* Sign out button in mobile drawer */}
                  <div className="p-4 border-t mt-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.signOut}
                    </Button>
                  </div>
                </div>
              </SidebarProvider>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  // Desktop collapsible sidebar
  // Only enable hover on non-touch devices to prevent janky mobile experience
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        collapsible="icon"
        onMouseEnter={!isTouchDevice ? () => setOpen(true) : undefined}
        onMouseLeave={!isTouchDevice ? () => setOpen(false) : undefined}
      >
        {navContent}
      </Sidebar>
      <div className="flex-1">
          <div className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
            <SidebarTrigger aria-label={t.toggleSidebar} title={t.toggleSidebar} />
            </div>
            <div className="flex items-center gap-6">
            {/* Book Appointment Button - Desktop */}
            <Button
              onClick={() => {
                localStorage.setItem('pd_section', 'assistant');
                window.dispatchEvent(new CustomEvent('dashboard:changeSection', { detail: { section: 'assistant' } }));
                if (location.pathname !== '/dashboard') {
                  navigate('/dashboard');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              size="sm"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden lg:inline">{t.bookAppointment}</span>
            </Button>

            <LanguageSelector />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" aria-label={t.topProfile} title={t.topProfile}>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={userProfilePicture || undefined} />
                    <AvatarFallback className="text-xs">P</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{t.topProfile}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background">
                <DropdownMenuItem onClick={() => navigate('/account/profile')} aria-label={t.myProfile}>
                  <User className="mr-2 h-4 w-4" />
                  {t.myProfile}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/about')} aria-label={t.about}>
                  <Info className="mr-2 h-4 w-4" />
                  {t.about}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50" aria-label={t.signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="p-3 md:p-4">{children ?? <Outlet />}</div>
      </div>
    </div>
  );
}

export function PatientPortalNav({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false} style={{ ['--sidebar-width' as any]: '17.5rem', ['--sidebar-width-icon' as any]: '4.5rem' }}>
      <PatientPortalNavContent>{children}</PatientPortalNavContent>
    </SidebarProvider>
  );
}

