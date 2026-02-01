import { AlertTriangle, Plus, X, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, memo } from "react";
import { usePatientAllergies, PatientAllergy } from "@/hooks/usePatientAllergies";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MedicalAlertsBannerProps {
  patientId: string;
  businessId: string;
  compact?: boolean;
}

const severityConfig = {
  'mild': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
  'moderate': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
  'severe': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: 'text-orange-500' },
  'life-threatening': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: 'text-red-600' },
};

export const MedicalAlertsBanner = memo(function MedicalAlertsBanner({ patientId, businessId, compact = false }: MedicalAlertsBannerProps) {
  const { allergies, isLoading, addAllergy, deleteAllergy, hasSevereAllergies } = usePatientAllergies({ patientId, businessId });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAllergy, setNewAllergy] = useState({
    allergy_name: '',
    severity: 'moderate' as PatientAllergy['severity'],
    notes: '',
  });

  const handleAdd = async () => {
    if (!newAllergy.allergy_name.trim()) return;
    await addAllergy({
      patient_id: patientId,
      business_id: businessId,
      allergy_name: newAllergy.allergy_name,
      severity: newAllergy.severity,
      notes: newAllergy.notes || undefined,
    });
    setNewAllergy({ allergy_name: '', severity: 'moderate', notes: '' });
    setIsDialogOpen(false);
  };

  if (isLoading) return null;

  // Compact mode - just show badges
  if (compact) {
    if (allergies.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1">
        {allergies.map((allergy) => (
          <Badge 
            key={allergy.id} 
            variant="outline" 
            className={cn(
              "text-xs",
              severityConfig[allergy.severity].bg,
              severityConfig[allergy.severity].border,
              severityConfig[allergy.severity].text
            )}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {allergy.allergy_name}
          </Badge>
        ))}
      </div>
    );
  }

  // Full banner mode
  const hasAlerts = allergies.length > 0;

  return (
    <AnimatePresence>
      {hasAlerts ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className={cn(
            "border-2 mb-4 overflow-hidden",
            hasSevereAllergies 
              ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-300" 
              : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300"
          )}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    hasSevereAllergies ? "bg-red-100" : "bg-amber-100"
                  )}>
                    <ShieldAlert className={cn(
                      "h-4 w-4",
                      hasSevereAllergies ? "text-red-600" : "text-amber-600"
                    )} />
                  </div>
                  <div>
                    <h4 className={cn(
                      "font-semibold text-sm",
                      hasSevereAllergies ? "text-red-800" : "text-amber-800"
                    )}>
                      Medical Alerts
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {allergies.length} known allerg{allergies.length === 1 ? 'y' : 'ies'}
                    </p>
                  </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Allergy</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Allergy Name</label>
                        <Input
                          placeholder="e.g., Penicillin, Latex, Lidocaine"
                          value={newAllergy.allergy_name}
                          onChange={(e) => setNewAllergy(prev => ({ ...prev, allergy_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Severity</label>
                        <Select
                          value={newAllergy.severity}
                          onValueChange={(v) => setNewAllergy(prev => ({ ...prev, severity: v as PatientAllergy['severity'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mild">Mild</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="severe">Severe</SelectItem>
                            <SelectItem value="life-threatening">Life-Threatening</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Notes (optional)</label>
                        <Input
                          placeholder="Additional details..."
                          value={newAllergy.notes}
                          onChange={(e) => setNewAllergy(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                      <Button onClick={handleAdd} className="w-full">Add Allergy</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-wrap gap-2">
                {allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
                      severityConfig[allergy.severity].bg,
                      severityConfig[allergy.severity].border,
                      severityConfig[allergy.severity].text
                    )}
                  >
                    <AlertTriangle className={cn("h-3.5 w-3.5", severityConfig[allergy.severity].icon)} />
                    <span>{allergy.allergy_name}</span>
                    <span className="text-xs opacity-70 capitalize">({allergy.severity})</span>
                    <button
                      onClick={() => deleteAllergy(allergy.id)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2 mb-4 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-sm text-slate-500">No known allergies</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-600">
                <Plus className="h-3 w-3 mr-1" /> Add Allergy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Allergy</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Allergy Name</label>
                  <Input
                    placeholder="e.g., Penicillin, Latex, Lidocaine"
                    value={newAllergy.allergy_name}
                    onChange={(e) => setNewAllergy(prev => ({ ...prev, allergy_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <Select
                    value={newAllergy.severity}
                    onValueChange={(v) => setNewAllergy(prev => ({ ...prev, severity: v as PatientAllergy['severity'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                      <SelectItem value="life-threatening">Life-Threatening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Input
                    placeholder="Additional details..."
                    value={newAllergy.notes}
                    onChange={(e) => setNewAllergy(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full">Add Allergy</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AnimatePresence>
  );
});
