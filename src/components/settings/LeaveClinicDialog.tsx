import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentBusinessId } from "@/lib/businessUtils";
import { logger } from "@/lib/logger";

interface LeaveClinicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for leaving a clinic with password confirmation
 * Extracted from DentistSettings.tsx for reusability
 */
export function LeaveClinicDialog({ open, onOpenChange }: LeaveClinicDialogProps) {
  const [password, setPassword] = useState("");
  const [leaving, setLeaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLeaveClinic = async () => {
    if (!password.trim()) {
      toast({
        title: t.passwordRequired || "Password required",
        description: t.enterPasswordLeave || "Please enter your password to confirm leaving the clinic.",
        variant: "destructive",
      });
      return;
    }

    setLeaving(true);
    try {
      // Verify password first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not authenticated');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        throw new Error('Incorrect password');
      }

      // Password verified, now leave the clinic
      const businessId = await getCurrentBusinessId();
      const { data, error } = await supabase.rpc('leave_clinic', { p_business_id: businessId });
      if (error) throw error;

      const remaining = (data as any)?.remaining_businesses ?? null;
      const businessDeleted = (data as any)?.business_deleted ?? false;

      onOpenChange(false);
      setPassword('');

      if (businessDeleted) {
        toast({
          title: t.businessDeleted || "Business deleted",
          description: t.lastMemberDeletedDesc || "You were the last member. The business has been permanently deleted.",
          variant: "default",
        });
      } else {
        toast({
          title: t.leftClinic || "Left clinic",
          description: remaining === 0
            ? (t.leftRoleRemoved || "You left the clinic and your provider role was removed.")
            : (t.stillBelongOther || "You left the clinic. You still belong to other clinics."),
        });
      }

      // Navigate home to update role and UI
      navigate('/', { replace: true });
      window.location.reload();
    } catch (error) {
      logger.error('Error leaving clinic:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to leave clinic. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLeaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-destructive">{t.leaveClinic || "Leave Clinic"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.leaveClinicConfirm || "This action is irreversible. You will lose access to all clinic data, appointments, and patient records."}
          </p>
          <p className="text-sm text-destructive font-medium">
            ⚠️ {t.lastMemberWarning || "If you are the last member, the entire business will be permanently deleted."}
          </p>
          <div>
            <Label htmlFor="leave-password">{t.enterPasswordConfirm || "Enter your password to confirm"}</Label>
            <Input
              id="leave-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.yourPassword || "Your password"}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => { 
                onOpenChange(false); 
                setPassword(''); 
              }}
            >
              {t.cancel}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLeaveClinic} 
              disabled={leaving || !password.trim()}
            >
              {leaving ? (t.leaving || 'Leaving...') : (t.leaveClinic || 'Leave Clinic')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LeaveClinicDialog;
