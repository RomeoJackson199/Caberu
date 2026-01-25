import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Plus, Trash2, Edit } from "lucide-react";
import { usePatientAllergies, PatientAllergy } from "@/hooks/usePatientAllergies";

interface AllergyManagerProps {
  patientId: string;
  businessId: string;
  readOnly?: boolean;
}

const SEVERITY_COLORS = {
  mild: "bg-yellow-100 text-yellow-800 border-yellow-300",
  moderate: "bg-orange-100 text-orange-800 border-orange-300",
  severe: "bg-red-100 text-red-800 border-red-300",
  "life-threatening": "bg-red-200 text-red-900 border-red-500",
};

const COMMON_ALLERGIES = [
  "Penicillin",
  "Amoxicillin",
  "Aspirin",
  "Ibuprofen",
  "Codeine",
  "Latex",
  "Local Anesthetics (Lidocaine)",
  "Epinephrine",
  "Sulfonamides",
  "Tetracycline",
  "Erythromycin",
  "NSAIDs",
];

export function AllergyManager({ patientId, businessId, readOnly = false }: AllergyManagerProps) {
  const { allergies, isLoading, addAllergy, updateAllergy, deleteAllergy, hasSevereAllergies } =
    usePatientAllergies({ patientId, businessId });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState<PatientAllergy | null>(null);
  const [formData, setFormData] = useState({
    allergy_name: "",
    severity: "moderate" as PatientAllergy["severity"],
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      allergy_name: "",
      severity: "moderate",
      notes: "",
    });
    setEditingAllergy(null);
  };

  const handleSubmit = async () => {
    if (!formData.allergy_name.trim()) return;

    if (editingAllergy) {
      await updateAllergy(editingAllergy.id, {
        allergy_name: formData.allergy_name,
        severity: formData.severity,
        notes: formData.notes,
      });
    } else {
      await addAllergy({
        patient_id: patientId,
        business_id: businessId,
        allergy_name: formData.allergy_name,
        severity: formData.severity,
        notes: formData.notes,
      });
    }

    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (allergy: PatientAllergy) => {
    setEditingAllergy(allergy);
    setFormData({
      allergy_name: allergy.allergy_name,
      severity: allergy.severity,
      notes: allergy.notes || "",
    });
    setShowAddDialog(true);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading allergies...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${hasSevereAllergies ? "text-red-500" : "text-orange-500"}`} />
          <span className="font-medium text-sm">Allergies</span>
          {hasSevereAllergies && (
            <Badge variant="destructive" className="text-xs">Critical</Badge>
          )}
        </div>
        {!readOnly && (
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Allergy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAllergy ? "Edit Allergy" : "Add Allergy"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Allergy *</Label>
                  <div className="space-y-2">
                    <Input
                      value={formData.allergy_name}
                      onChange={(e) => setFormData({ ...formData, allergy_name: e.target.value })}
                      placeholder="Enter allergy name..."
                    />
                    <div className="flex flex-wrap gap-1">
                      {COMMON_ALLERGIES.map((allergy) => (
                        <Badge
                          key={allergy}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted text-xs"
                          onClick={() => setFormData({ ...formData, allergy_name: allergy })}
                        >
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Severity *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value: PatientAllergy["severity"]) =>
                      setFormData({ ...formData, severity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                      <SelectItem value="life-threatening">Life-threatening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Reaction details, alternatives, etc."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!formData.allergy_name.trim()}>
                    {editingAllergy ? "Save Changes" : "Add Allergy"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {allergies.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allergies.map((allergy) => (
            <Badge
              key={allergy.id}
              variant="outline"
              className={`${SEVERITY_COLORS[allergy.severity]} group relative pr-12`}
            >
              <span className="font-medium">{allergy.allergy_name}</span>
              <span className="ml-1 text-xs opacity-70">({allergy.severity})</span>
              {!readOnly && (
                <span className="absolute right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(allergy);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove allergy?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove &quot;{allergy.allergy_name}&quot; from this patient&apos;s allergies?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAllergy(allergy.id)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </span>
              )}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No allergies recorded</p>
      )}
    </div>
  );
}
