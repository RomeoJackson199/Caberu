import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface AppointmentPreferencesCardProps {
  dentistId: string | null;
}

/**
 * Appointment preferences card for dentist settings
 * Extracted from DentistSettings.tsx for reusability
 */
export function AppointmentPreferencesCard({ dentistId }: AppointmentPreferencesCardProps) {
  const [requireApproval, setRequireApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (!dentistId) return;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('dentists')
          .select('require_appointment_approval')
          .eq('id', dentistId)
          .single();

        if (error) throw error;
        setRequireApproval(data?.require_appointment_approval || false);
      } catch (error) {
        logger.error('Failed to load appointment settings', error);
        toast({
          title: t.couldntLoadSettings || "Couldn't load appointment settings",
          description: t.refreshOrTryAgain || "Please refresh the page or try again in a moment.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [dentistId, toast, t]);

  const handleSave = async () => {
    if (!dentistId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('dentists')
        .update({ require_appointment_approval: requireApproval })
        .eq('id', dentistId);

      if (error) {
        throw error;
      }

      toast({
        title: t.appointmentRulesUpdated || "Appointment rules updated",
        description: t.rulesUpdatedDesc || "Patients will see the new approval rules immediately.",
      });
    } catch (error) {
      logger.error('Failed to save appointment settings', error);
      toast({
        title: t.couldntSaveSettings || "Couldn't save appointment settings",
        description: t.refreshOrTryAgain || "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.appointmentPreferences || "Appointment preferences"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border rounded-lg p-4">
          <div className="space-y-1">
            <Label htmlFor="require-approval">
              {t.requireApprovalBefore || "Require approval before confirming"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t.approveNewPatientRequests || "Approve new patient requests to prevent double booking or missing prep time."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="require-approval"
              checked={requireApproval}
              disabled={loading || saving}
              onCheckedChange={setRequireApproval}
            />
            <span className="text-sm text-muted-foreground">
              {requireApproval 
                ? (t.manualReviewRequired || 'Manual review required') 
                : (t.requestsAutoConfirmed || 'Requests auto-confirmed')
              }
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t.saveImmediately || "Save changes so patients see the right booking rules immediately."}
          </p>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="min-w-[140px]"
          >
            {saving ? (t.savingChanges || 'Saving...') : (t.saveChanges || 'Save changes')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default AppointmentPreferencesCard;
