import React from "react";
import { User } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { User as SbUser } from "@supabase/supabase-js";
import { SettingsPage } from "@/components/patients/SettingsPage";

export default function PatientAccountProfilePage() {
  const { t } = useLanguage();
  const [user, setUser] = React.useState<SbUser | null>(null);
  React.useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setUser(data.user as any) })() }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2"><User className="h-5 w-5" /> {t.pnav.account.profile}</h1>
      {user && <SettingsPage user={user} />}
    </div>
  );
}

