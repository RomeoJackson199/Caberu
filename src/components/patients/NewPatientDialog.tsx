import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, UserPlus, ArrowLeft } from "lucide-react";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface NewPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentistId: string;
  onPatientCreated: () => void;
}

type Mode = 'select' | 'quick' | 'full';

export function NewPatientDialog({ open, onOpenChange, dentistId, onPatientCreated }: NewPatientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('select');
  const { toast } = useToast();
  const { businessId } = useBusinessContext();
  
  const [quickFormData, setQuickFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
  });

  const [fullFormData, setFullFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    address: "",
    medical_history: "",
    emergency_contact: "",
  });

  const resetForms = () => {
    setQuickFormData({ email: "", first_name: "", last_name: "" });
    setFullFormData({
      email: "", first_name: "", last_name: "", phone: "",
      date_of_birth: "", address: "", medical_history: "", emergency_contact: "",
    });
    setMode('select');
  };

  const handleQuickInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      toast({ title: "Error", description: "Business context not found", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-patient-profile', {
        body: {
          email: quickFormData.email,
          first_name: quickFormData.first_name,
          last_name: quickFormData.last_name,
          business_id: businessId,
          quick_invite_only: true,
          send_invite_email: true,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Invitation Sent!",
        description: `An email has been sent to ${quickFormData.email} to claim their profile.`,
      });

      onPatientCreated();
      onOpenChange(false);
      resetForms();
    } catch (error: any) {
      logger.error('Error sending invite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFullSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      toast({ title: "Error", description: "Business context not found", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-patient-profile', {
        body: {
          ...fullFormData,
          business_id: businessId,
          quick_invite_only: false,
          send_invite_email: true, // Also send claim email
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Patient Created!",
        description: `${fullFormData.first_name} ${fullFormData.last_name} has been added. They will receive an email to claim their account.`,
      });

      onPatientCreated();
      onOpenChange(false);
      resetForms();
    } catch (error: any) {
      logger.error('Error creating patient:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create patient",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForms();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' && 'Add New Patient'}
            {mode === 'quick' && 'Quick Invite'}
            {mode === 'full' && 'Create Full Profile'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'select' && 'Choose how you want to add a new patient.'}
            {mode === 'quick' && 'Send an email invitation for the patient to register themselves.'}
            {mode === 'full' && 'Enter complete patient information. They will receive an email to claim their account.'}
          </DialogDescription>
        </DialogHeader>

        {mode !== 'select' && (
          <Button variant="ghost" size="sm" onClick={() => setMode('select')} className="w-fit">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        )}

        {mode === 'select' && (
          <div className="grid gap-4 py-4">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode('quick')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  Quick Invite
                </CardTitle>
                <CardDescription>
                  Send an email invitation. The patient will register themselves with their own information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Fastest option</li>
                  <li>Patient fills in their own details</li>
                  <li>They receive an email to create their account</li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode('full')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Create Full Profile
                </CardTitle>
                <CardDescription>
                  Enter all patient information yourself. Good for importing existing patients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>You enter all patient details</li>
                  <li>Profile is created immediately</li>
                  <li>Patient receives email to claim their account</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === 'quick' && (
          <form onSubmit={handleQuickInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quick_first_name">First Name</Label>
                <Input
                  id="quick_first_name"
                  value={quickFormData.first_name}
                  onChange={(e) => setQuickFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick_last_name">Last Name</Label>
                <Input
                  id="quick_last_name"
                  value={quickFormData.last_name}
                  onChange={(e) => setQuickFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick_email">Email *</Label>
              <Input
                id="quick_email"
                type="email"
                value={quickFormData.email}
                onChange={(e) => setQuickFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                placeholder="patient@email.com"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              <p>📧 The patient will receive an email with a link to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create their own account</li>
                <li>Fill in their personal information</li>
                <li>Access your practice portal</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        )}

        {mode === 'full' && (
          <form onSubmit={handleFullSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={fullFormData.first_name}
                  onChange={(e) => setFullFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={fullFormData.last_name}
                  onChange={(e) => setFullFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={fullFormData.email}
                onChange={(e) => setFullFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={fullFormData.phone}
                  onChange={(e) => setFullFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={fullFormData.date_of_birth}
                  onChange={(e) => setFullFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={fullFormData.address}
                onChange={(e) => setFullFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medical_history">Medical History</Label>
              <Textarea
                id="medical_history"
                value={fullFormData.medical_history}
                onChange={(e) => setFullFormData(prev => ({ ...prev, medical_history: e.target.value }))}
                placeholder="Allergies, medications, medical conditions..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact">Emergency Contact</Label>
              <Input
                id="emergency_contact"
                value={fullFormData.emergency_contact}
                onChange={(e) => setFullFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                placeholder="Name and phone number"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              <p>📧 The patient will receive an email to claim their account and set a password.</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Patient
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
