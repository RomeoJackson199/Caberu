import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Shield } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';

interface AddUserDialogProps {
  onUserAdded?: () => void;
}

export function AddUserDialog({ onUserAdded }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"patient" | "dentist" | "staff" | "admin">("patient");
  const { toast } = useToast();
  const { isAdmin, isDentist, loading: roleLoading } = useUserRole();

  // Security check - admins and dentists can add users
  if (roleLoading) {
    return null;
  }

  if (!isAdmin && !isDentist) {
    return null;
  }

  const { businessId, businessName } = useBusinessContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === 'dentist') {
        if (!businessId) {
          toast({
            title: 'Select a clinic',
            description: 'Please select a business before inviting a dentist.',
            variant: 'destructive',
          });
          return;
        }

        // Get inviter profile id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!inviterProfile?.id) throw new Error('Profile not found');

        // Check for existing pending invite
        const { data: existingInvite } = await supabase
          .from('dentist_invitations')
          .select('id')
          .eq('invitee_email', email)
          .eq('business_id', businessId)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingInvite?.id) {
          toast({
            title: 'Invitation already pending',
            description: `${email} already has a pending invite for this clinic.`,
          });
        } else {
          const { error: inviteError } = await supabase
            .from('dentist_invitations')
            .insert({
              business_id: businessId,
              inviter_profile_id: inviterProfile.id,
              invitee_email: email,
            });

          if (inviteError) throw inviteError;

          toast({
            title: 'Invitation sent',
            description: `An invitation was sent to ${email} to join ${businessName || 'the clinic'} as a dentist.`,
          });
        }

        // Reset form and close dialog
        setOpen(false);
        setEmail('');
        setFirstName('');
        setLastName('');
        setRole('patient');
        onUserAdded?.();
        return;
      }

      // For non-dentist roles, we currently do not create accounts directly for security.
      toast({
        title: 'Action not available',
        description: 'Please ask the user to sign up directly. Admin account creation is restricted.',
      });

      setOpen(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('patient');
      onUserAdded?.();
    } catch (error: any) {
      console.error('Error adding user:', error);
      const msg = error?.message || 'Failed to add user';
      // Provide clearer message for RLS denial (only owners can invite)
      const hint = msg.includes('row-level security')
        ? 'Only the business owner can invite dentists to this clinic.'
        : undefined;
      toast({
        title: 'Error',
        description: hint ? `${msg} ${hint}` : msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Shield className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Add a new user to the system. For dentists, an invitation will be sent and they will confirm on next login.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            This action is logged for security purposes. Only add users you have verified.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="dentist">Dentist</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin (Full Access)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
