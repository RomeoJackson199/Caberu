import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';
import {
  Shield,
  AlertCircle,
  LogOut,
  LayoutDashboard,
  Building2,
  Users,
  Bot,
  AlertTriangle,
  FlaskConical,
  Mail,
  MessageSquareText,
  ScrollText,
  ShieldCheck,
  FileText,
  Menu,
  X,
  Flag,
  BarChart3,
  Server,
  Phone,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Import tab components
import { OverviewTab } from '@/components/super-admin/OverviewTab';
import { BusinessesTab } from '@/components/super-admin/BusinessesTab';
import { UsersTab } from '@/components/super-admin/UsersTab';
import { ErrorsTab } from '@/components/super-admin/ErrorsTab';
import { AuditLogsTab } from '@/components/super-admin/AuditLogsTab';
import { EmailTestTab } from '@/components/super-admin/EmailTestTab';
import { TestStatusTab } from '@/components/super-admin/TestStatusTab';
import { GdprAdminDashboard } from '@/components/gdpr/GdprAdminDashboard';
import { DocumentationTab } from '@/components/super-admin/DocumentationTab';
import { AIPromptsTab } from '@/components/super-admin/AIPromptsTab';
import { FeatureFlagsTab } from '@/components/super-admin/FeatureFlagsTab';
import { AnalyticsTab } from '@/components/super-admin/AnalyticsTab';
import { SystemHealthTab } from '@/components/super-admin/SystemHealthTab';
import { CommsMonitorTab } from '@/components/super-admin/CommsMonitorTab';
import { ComplianceTab } from '@/components/super-admin/ComplianceTab';
import { SmsAdminTab } from '@/components/super-admin/SmsAdminTab';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'main' | 'system' | 'tools';
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, section: 'main' },
  { id: 'businesses', label: 'Practices', icon: Building2, section: 'main' },
  { id: 'users', label: 'Users', icon: Users, section: 'main' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'main' },
  { id: 'system-health', label: 'System Health', icon: Server, section: 'system' },
  { id: 'errors', label: 'Errors', icon: AlertTriangle, section: 'system' },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText, section: 'system' },
  { id: 'tests', label: 'Tests', icon: FlaskConical, section: 'system' },
  { id: 'comms', label: 'Comms Monitor', icon: Phone, section: 'tools' },
  { id: 'sms', label: 'SMS Management', icon: MessageSquareText, section: 'tools' },
  { id: 'feature-flags', label: 'Feature Flags', icon: Flag, section: 'tools' },
  { id: 'ai-prompts', label: 'AI Prompts', icon: Bot, section: 'tools' },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck, section: 'tools' },
  { id: 'email', label: 'Email Test', icon: Mail, section: 'tools' },
  { id: 'docs', label: 'Docs', icon: FileText, section: 'tools' },
];

const sectionLabels: Record<string, string> = {
  main: 'Main',
  system: 'System',
  tools: 'Tools',
};

function NavContent({
  activeTab,
  onSelect,
}: {
  activeTab: string;
  onSelect: (id: string) => void;
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
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
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

function TabContent({ activeTab, onNavigate }: { activeTab: string; onNavigate: (tab: string) => void }) {
  switch (activeTab) {
    case 'overview':
      return <OverviewTab onNavigate={onNavigate} />;
    case 'businesses':
      return <BusinessesTab />;
    case 'users':
      return <UsersTab />;
    case 'analytics':
      return <AnalyticsTab />;
    case 'system-health':
      return <SystemHealthTab />;
    case 'ai-prompts':
      return <AIPromptsTab />;
    case 'errors':
      return <ErrorsTab />;
    case 'tests':
      return <TestStatusTab />;
    case 'email':
      return <EmailTestTab />;
    case 'audit':
      return <AuditLogsTab />;
    case 'compliance':
      return <ComplianceTab />;
    case 'comms':
      return <CommsMonitorTab />;
    case 'sms':
      return <SmsAdminTab />;
    case 'feature-flags':
      return <FeatureFlagsTab />;
    case 'docs':
      return <DocumentationTab />;
    default:
      return <OverviewTab onNavigate={onNavigate} />;
  }
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { data: isSuperAdmin, isLoading, error } = useIsSuperAdmin();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: 'Signed out', description: 'You have been signed out successfully' });
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
      toast({ title: 'Error', description: 'Failed to sign out.', variant: 'destructive' });
    }
  };

  const handleNavSelect = (id: string) => {
    setActiveTab(id);
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

  const activeNavItem = navItems.find((item) => item.id === activeTab);

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
            <p className="text-xs text-muted-foreground">System Management</p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <NavContent activeTab={activeTab} onSelect={handleNavSelect} />
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
                    <p className="text-xs text-muted-foreground">System Management</p>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <NavContent activeTab={activeTab} onSelect={handleNavSelect} />
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
            <TabContent activeTab={activeTab} onNavigate={handleNavSelect} />
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
