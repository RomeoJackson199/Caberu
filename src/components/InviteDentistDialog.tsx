import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail } from "lucide-react";
import { logger } from '@/lib/logger';

interface InviteDentistDialogProps {
  businessId: string;
  businessName: string;
}

export const InviteDentistDialog = ({ businessId, businessName }: InviteDentistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Check if user already has an invitation
      const { data: existingInvite } = await supabase
        .from("dentist_invitations")
        .select("id, status")
        .eq("invitee_email", email)
        .eq("business_id", businessId)
        .eq("status", "pending")
        .single();

      if (existingInvite) {
        toast({
          title: "Already Invited",
          description: "This user already has a pending invitation",
          variant: "destructive"
        });
        return;
      }

      // Create invitation
      const { error: inviteError } = await supabase
        .from("dentist_invitations")
        .insert({
          business_id: businessId,
          inviter_profile_id: profile.id,
          invitee_email: email.toLowerCase().trim()
        });

      if (inviteError) throw inviteError;

      // Send invitation email (optional - can be implemented later)
      try {
        await supabase.functions.invoke("send-invite-email", {
          body: {
            to_email: email,
            business_name: businessName
          }
        });
      } catch (emailError) {
        logger.error("Failed to send invitation email:", emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Invitation Sent! 📧",
        description: `Invitation sent to ${email}`,
      });

      setEmail("");
      setOpen(false);
    } catch (error: any) {
      logger.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Dentist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Dentist to {businessName}</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite as a dentist.
            They'll receive an invitation the next time they log in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="dentist@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
