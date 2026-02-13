import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  AlertCircle,
  LogOut,
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  Phone,
  Server,
  ShieldCheck,
  Flag,
  DollarSign,
  ScrollText,
  Menu,
  X,
  Globe,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'main' | 'system' | 'tools';
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/admin', icon: LayoutDashboard, section: 'main' },
  { id: 'practices', label: 'Practices', path: '/admin/practices', icon: Building2, section: 'main' },
  { id: 'users', label: 'Users', path: '/admin/users', icon: Users, section: 'main' },
  { id: 'appointments', label: 'Appointments', path: '/admin/appointments', icon: Calendar, section: 'main' },
  { id: 'communications', label: 'Communications', path: '/admin/communications', icon: Phone, section: 'main' },
  { id: 'status', label: 'Status Management', path: '/admin/status', icon: Globe, section: 'system' },
  { id: 'system', label: 'System Health', path: '/admin/system', icon: Server, section: 'system' },
  { id: 'compliance', label: 'GDPR & Compliance', path: '/admin/compliance', icon: ShieldCheck, section: 'system' },
  { id: 'features', label: 'Feature Flags', path: '/admin/features', icon: Flag, section: 'tools' },
  { id: 'revenue', label: 'Revenue & Billing', path: '/admin/revenue', icon: DollarSign, section: 'tools' },
  { id: 'audit', label: 'Audit Log', path: '/admin/audit', icon: ScrollText, section: 'tools' },
];

const sectionLabels: Record<string, string> = {
  main: 'Main',
  system: 'System',
  tools: 'Tools',
};

function NavContent({
  activePath,
  onSelect,
}: {
  activePath: string;
  onSelect: (path: string) => void;
}) {
  const sections = ['main', 'system', 'tools'] as const;

  return (
    <div className="flex flex-col gap-1 p-2">
      {sections.map((section, sIdx) => (
        <div key={section}>
          {sIdx > 0 && <Separator className="my-2" />}
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {sectionLabels[section]}
          </p>
          {navItems
            .filter((item) => item.section === section)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.path || (item.path !== '/admin' && activePath.startsWith(item.path));
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.path)}
                  className={cn(
                    'flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: isSuperAdmin, isLoading, error } = useIsSuperAdmin();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: 'Signed out', description: 'You have been signed out successfully' });
      navigate('/');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to sign out.', variant: 'destructive' });
    }
  };

  const handleNavSelect = (path: string) => {
    navigate(path);
    setMobileNavOpen(false);
  };

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/');
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to verify super admin status.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  const activeNavItem = navItems.find(
    (item) => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
  ) || navItems[0];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r bg-card">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b">
          <div className="p-1.5 bg-destructive rounded-md">
            <Shield className="h-4 w-4 text-destructive-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">Super Admin</h1>
            <p className="text-xs text-muted-foreground">Caberu Healthcare</p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <NavContent activePath={location.pathname} onSelect={handleNavSelect} />
        </ScrollArea>
        <div className="border-t p-3">
          <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" size="sm">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex items-center gap-2.5 px-4 py-4 border-b">
                  <div className="p-1.5 bg-destructive rounded-md">
                    <Shield className="h-4 w-4 text-destructive-foreground" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold">Super Admin</h1>
                    <p className="text-xs text-muted-foreground">Caberu Healthcare</p>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <NavContent activePath={location.pathname} onSelect={handleNavSelect} />
                </ScrollArea>
                <div className="border-t p-3">
                  <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" size="sm">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              {activeNavItem && <activeNavItem.icon className="h-5 w-5 text-muted-foreground hidden sm:block" />}
              <h2 className="text-lg font-semibold">{activeNavItem?.label || 'Overview'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <Shield className="h-3 w-3" />
              Actions are audited
            </span>
            <Button variant="ghost" onClick={handleSignOut} size="icon" className="md:hidden h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <main className="p-4 md:p-6 max-w-7xl">
            <Outlet />
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
