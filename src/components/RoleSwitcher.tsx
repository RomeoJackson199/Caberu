import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserCog, User, Stethoscope } from "lucide-react";
import { logger } from '@/lib/logger';

export interface RoleSwitcherState {
  loading: boolean;
  canSwitch: boolean;
  currentRole: 'patient' | 'dentist';
  switchToPatient: () => void;
  switchToDentist: () => void;
}

export function useRoleSwitcher(): RoleSwitcherState {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasBusiness, setHasBusiness] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkBusiness = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('secure_profiles_view')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        const { data: businesses } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('profile_id', profile.id)
          .limit(1);

        setHasBusiness((businesses?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking business:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBusiness();
  }, []);

  const isOnDentistRoute = location.pathname === '/dentist' || location.pathname.startsWith('/dentist/');
  const currentRole = isOnDentistRoute ? 'dentist' : 'patient';

  const switchToPatient = React.useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const switchToDentist = React.useCallback(() => {
    navigate('/dentist');
  }, [navigate]);

  return {
    loading,
    canSwitch: hasBusiness,
    currentRole,
    switchToPatient,
    switchToDentist
  };
}

export function RoleSwitcherMenu({
  state
}: {
  state?: RoleSwitcherState;
}) {
  const roleState = state ?? useRoleSwitcher();

  if (roleState.loading || !roleState.canSwitch) {
    return null;
  }

  const {
    currentRole,
    switchToDentist,
    switchToPatient
  } = roleState;

  return <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <UserCog className="h-4 w-4" />
        <span className="flex-1 text-left">
          {currentRole === 'dentist' ? 'Dentist View' : 'Patient View'}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-48">
        <DropdownMenuItem onSelect={event => {
        event.preventDefault();
        if (currentRole !== 'patient') {
          switchToPatient();
        }
      }} disabled={currentRole === 'patient'} className="gap-2">
          <User className="h-4 w-4" />
          Patient View
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={event => {
        event.preventDefault();
        if (currentRole !== 'dentist') {
          switchToDentist();
        }
      }} disabled={currentRole === 'dentist'} className="gap-2">
          <Stethoscope className="h-4 w-4" />
          Dentist View
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>;
}

export function RoleSwitcher() {
  const roleState = useRoleSwitcher();

  if (roleState.loading || !roleState.canSwitch) {
    return null;
  }

  const {
    currentRole,
    switchToDentist,
    switchToPatient
  } = roleState;

  return <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCog className="h-4 w-4" />
          {currentRole === 'dentist' ? 'Dentist View' : 'Patient View'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={switchToPatient} disabled={currentRole === 'patient'} className="gap-2">
          <User className="h-4 w-4" />
          Patient View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={switchToDentist} disabled={currentRole === 'dentist'} className="gap-2">
          <Stethoscope className="h-4 w-4" />
          Dentist View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>;
}
