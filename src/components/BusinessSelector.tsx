import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function BusinessSelector() {
  const { businessName, memberships, loading, switchBusiness } = useBusinessContext();
  const navigate = useNavigate();

  const handleSwitchBusiness = async (businessId: string, role: string) => {
    await switchBusiness(businessId);

    // Redirect based on role in that business
    const isProvider = role === 'dentist' || role === 'admin' || role === 'owner';
    if (isProvider) {
      navigate('/dentist/dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  if (loading) {
    return <Skeleton className="h-10 w-48" />;
  }

  if (memberships.length === 0) {
    return null;
  }

  if (memberships.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{businessName}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span>{businessName || 'Select Business'}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Business</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((membership) => (
          <DropdownMenuItem
            key={membership.id}
            onClick={() => handleSwitchBusiness(membership.business_id, membership.role)}
            className="gap-2"
          >
            <Check
              className={`h-4 w-4 ${membership.business?.name === businessName ? 'opacity-100' : 'opacity-0'
                }`}
            />
            <div className="flex flex-col">
              <span className="font-medium">{membership.business?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{membership.role}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

