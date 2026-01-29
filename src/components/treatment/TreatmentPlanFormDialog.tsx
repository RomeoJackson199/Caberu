import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList as ClipboardListIcon,
  Plus,
  Trash2,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TreatmentPlan, NewTreatmentPlanForm } from "@/types/dental";
import { getStatusColor, getPriorityColor, formatDate } from "./TreatmentPlanListItem";

interface TreatmentPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: TreatmentPlan | null;
  isEditMode: boolean;
  formData: NewTreatmentPlanForm;
  onFormDataChange: (data: NewTreatmentPlanForm) => void;
  onCreate: () => void;
  onUpdate: () => void;
}

export function TreatmentPlanFormDialog({
  open,
  onOpenChange,
  selectedPlan,
  isEditMode,
  formData,
  onFormDataChange,
  onCreate,
  onUpdate,
}: TreatmentPlanFormDialogProps) {
  const [newGoal, setNewGoal] = useState('');
  const [newProcedure, setNewProcedure] = useState('');

  const addGoal = () => {
    if (newGoal.trim()) {
      onFormDataChange({
        ...formData,
        treatment_goals: [...formData.treatment_goals, newGoal.trim()]
      });
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    onFormDataChange({
      ...formData,
      treatment_goals: formData.treatment_goals.filter((_, i) => i !== index)
    });
  };

  const addProcedure = () => {
    if (newProcedure.trim()) {
      onFormDataChange({
        ...formData,
        procedures: [...formData.procedures, newProcedure.trim()]
      });
      setNewProcedure('');
    }
  };

  const removeProcedure = (index: number) => {
    onFormDataChange({
      ...formData,
      procedures: formData.procedures.filter((_, i) => i !== index)
    });
  };

  const isViewMode = selectedPlan && !isEditMode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Treatment Plan' : selectedPlan ? 'View Treatment Plan' : 'New Treatment Plan'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modify the treatment plan details.' : selectedPlan ? 'View treatment plan information.' : 'Create a new treatment plan for the patient.'}
          </DialogDescription>
        </DialogHeader>

        {!isViewMode ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Plan Name</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
                placeholder="Enter treatment plan name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                placeholder="Describe the treatment plan"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => onFormDataChange({ ...formData, diagnosis: e.target.value })}
                placeholder="Enter diagnosis"
                rows={2}
              />
            </div>
            <div>
              <Label>Treatment Goals</Label>
              <div className="space-y-2">
                {formData.treatment_goals.map((goal, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="flex-1 text-sm">{goal}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGoal(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <Input
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Add treatment goal"
                    onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                  />
                  <Button size="sm" onClick={addGoal}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label>Procedures</Label>
              <div className="space-y-2">
                {formData.procedures.map((procedure, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <ClipboardListIcon className="h-4 w-4 text-orange-600" />
                    <span className="flex-1 text-sm">{procedure}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProcedure(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <Input
                    value={newProcedure}
                    onChange={(e) => setNewProcedure(e.target.value)}
                    placeholder="Add procedure"
                    onKeyPress={(e) => e.key === 'Enter' && addProcedure()}
                  />
                  <Button size="sm" onClick={addProcedure}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_cost">Estimated Cost</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  value={formData.estimated_cost || ''}
                  onChange={(e) => onFormDataChange({ ...formData, estimated_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="estimated_duration">Estimated Duration</Label>
                <Input
                  id="estimated_duration"
                  value={formData.estimated_duration}
                  onChange={(e) => onFormDataChange({ ...formData, estimated_duration: e.target.value })}
                  placeholder="e.g., 6 months"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => onFormDataChange({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target_completion_date">Target Completion Date</Label>
                <Input
                  id="target_completion_date"
                  type="date"
                  value={formData.target_completion_date}
                  onChange={(e) => onFormDataChange({ ...formData, target_completion_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Plan Name</Label>
              <p className="text-sm">{selectedPlan.title}</p>
            </div>
            {selectedPlan.description && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Description</Label>
                <p className="text-sm">{selectedPlan.description}</p>
              </div>
            )}
            {selectedPlan.diagnosis && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Diagnosis</Label>
                <p className="text-sm">{selectedPlan.diagnosis}</p>
              </div>
            )}
            {(selectedPlan.treatment_goals?.length ?? 0) > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Treatment Goals</Label>
                <div className="space-y-1">
                  {selectedPlan.treatment_goals?.map((goal, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Target className="h-3 w-3 text-blue-600" />
                      <span className="text-sm">{goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(selectedPlan.procedures?.length ?? 0) > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Procedures</Label>
                <div className="space-y-1">
                  {selectedPlan.procedures?.map((procedure, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <ClipboardListIcon className="h-3 w-3 text-orange-600" />
                      <span className="text-sm">{procedure}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {selectedPlan.estimated_cost && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Estimated Cost</Label>
                  <p className="text-sm">${selectedPlan.estimated_cost}</p>
                </div>
              )}
              {selectedPlan.estimated_duration && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Estimated Duration</Label>
                  <p className="text-sm">{selectedPlan.estimated_duration}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Priority</Label>
                <Badge className={getPriorityColor(selectedPlan.priority)}>
                  {selectedPlan.priority}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Status</Label>
                <Badge className={getStatusColor(selectedPlan.status)}>
                  {selectedPlan.status}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Start Date</Label>
              <p className="text-sm">{formatDate(selectedPlan.start_date)}</p>
            </div>
            {selectedPlan.target_completion_date && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Target Completion Date</Label>
                <p className="text-sm">{formatDate(selectedPlan.target_completion_date)}</p>
              </div>
            )}
            {selectedPlan.notes && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Notes</Label>
                <p className="text-sm">{selectedPlan.notes}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!selectedPlan && (
            <Button onClick={onCreate}>
              Create Treatment Plan
            </Button>
          )}
          {isEditMode && (
            <Button onClick={onUpdate}>
              Update Treatment Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
