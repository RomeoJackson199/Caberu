import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    address?: string;
    medical_history?: string;
    emergency_contact?: string;
}

interface EditPatientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patient: Patient;
    onPatientUpdated: () => void;
}

export function EditPatientDialog({ open, onOpenChange, patient, onPatientUpdated }: EditPatientDialogProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        first_name: patient.first_name || "",
        last_name: patient.last_name || "",
        phone: patient.phone || "",
        date_of_birth: patient.date_of_birth || "",
        address: patient.address || "",
        medical_history: patient.medical_history || "",
        emergency_contact: patient.emergency_contact || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone: formData.phone || null,
                    date_of_birth: formData.date_of_birth || null,
                    address: formData.address || null,
                    medical_history: formData.medical_history || null,
                    emergency_contact: formData.emergency_contact || null,
                })
                .eq('id', patient.id);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Patient profile updated successfully",
            });

            onPatientUpdated();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error updating patient:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to update patient",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Patient Details</DialogTitle>
                    <DialogDescription>
                        Update information for {patient.first_name} {patient.last_name}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_first_name">First Name *</Label>
                            <Input
                                id="edit_first_name"
                                value={formData.first_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_last_name">Last Name *</Label>
                            <Input
                                id="edit_last_name"
                                value={formData.last_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            value={patient.email}
                            disabled
                            className="bg-muted text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed directly.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_phone">Phone Number</Label>
                            <Input
                                id="edit_phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_date_of_birth">Date of Birth</Label>
                            <Input
                                id="edit_date_of_birth"
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit_address">Address</Label>
                        <Textarea
                            id="edit_address"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit_medical_history">Medical History</Label>
                        <Textarea
                            id="edit_medical_history"
                            value={formData.medical_history}
                            onChange={(e) => setFormData(prev => ({ ...prev, medical_history: e.target.value }))}
                            placeholder="Allergies, medications, medical conditions..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit_emergency_contact">Emergency Contact</Label>
                        <Input
                            id="edit_emergency_contact"
                            value={formData.emergency_contact}
                            onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                            placeholder="Name and phone number"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
