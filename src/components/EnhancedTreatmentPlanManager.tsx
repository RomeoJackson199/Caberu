import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { AIWritingAssistant } from "@/components/AIWritingAssistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Plus, 
  Sparkles, 
  Brain, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Calendar,
  Zap,
  Target,
  Activity,
  DollarSign,
  TrendingUp,
  FileText,
  Stethoscope
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface EnhancedTreatmentPlanManagerProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  onTreatmentPlanCreated?: () => void;
}

interface TreatmentSuggestion {
  plan_name: string;
  description: string;
  diagnosis: string;
  procedures: string[];
  estimated_cost: number;
  estimated_duration: number;
  priority: string;
  reason: string;
}

export function EnhancedTreatmentPlanManager({ 
  appointmentId, 
  patientId, 
  dentistId, 
  onTreatmentPlanCreated 
}: EnhancedTreatmentPlanManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<TreatmentSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    plan_name: '',
    description: '',
    diagnosis: '',
    treatment_goals: [''],
    procedures: [''],
    estimated_cost: [150],
    estimated_duration_weeks: [4],
    priority: 'normal' as const,
    target_completion_date: '',
    notes: '',
    is_urgent: false,
    requires_specialist: false,
    insurance_covered: false,
    payment_plan_available: false
  });
  const { toast } = useToast();

  // Common treatment plan suggestions
  const commonTreatments = [
    {
      name: "Root Canal Treatment",
      description: "Complete root canal therapy for infected tooth",
      procedures: ["Root canal therapy", "Crown placement"],
      cost: 800,
      duration: 2,
      priority: "high"
    },
    {
      name: "Dental Implant",
      description: "Single tooth replacement with implant",
      procedures: ["Implant placement", "Crown attachment"],
      cost: 2500,
      duration: 6,
      priority: "normal"
    },
    {
      name: "Orthodontic Treatment",
      description: "Comprehensive teeth alignment treatment",
      procedures: ["Braces installation", "Regular adjustments"],
      cost: 3500,
      duration: 18,
      priority: "normal"
    }
  ];

  const generateAISuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      // Simulate AI analysis based on patient symptoms and dental history
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const suggestions: TreatmentSuggestion[] = [
        {
          plan_name: "Root Canal Treatment",
          description: "Complete root canal therapy for infected tooth with crown restoration",
          diagnosis: "Severe tooth decay with pulp involvement",
          procedures: ["Root canal therapy", "Crown placement", "Follow-up care"],
          estimated_cost: 800,
          estimated_duration: 2,
          priority: "high",
          reason: "Based on symptoms of severe tooth pain and sensitivity"
        },
        {
          plan_name: "Comprehensive Dental Cleaning",
          description: "Deep cleaning and periodontal treatment",
          diagnosis: "Gingivitis and plaque buildup",
          procedures: ["Scaling", "Root planing", "Antibiotic treatment"],
          estimated_cost: 300,
          estimated_duration: 1,
          priority: "normal",
          reason: "Recommended for gum health maintenance"
        },
        {
          plan_name: "Crown Restoration",
          description: "Porcelain crown placement for damaged tooth",
          diagnosis: "Cracked tooth with compromised structure",
          procedures: ["Crown preparation", "Crown placement"],
          estimated_cost: 600,
          estimated_duration: 2,
          priority: "normal",
          reason: "To restore tooth function and prevent further damage"
        }
      ];
      
      setAiSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI suggestions",
        variant: "destructive",
      });
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: TreatmentSuggestion) => {
    setFormData({
      ...formData,
      plan_name: suggestion.plan_name,
      description: suggestion.description,
      diagnosis: suggestion.diagnosis,
      procedures: suggestion.procedures,
      estimated_cost: [suggestion.estimated_cost],
      estimated_duration_weeks: [suggestion.estimated_duration],
      priority: suggestion.priority as any
    });
    setShowSuggestions(false);
  };

  const addGoal = () => {
    setFormData(prev => ({
      ...prev,
      treatment_goals: [...prev.treatment_goals, '']
    }));
  };

  const removeGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      treatment_goals: prev.treatment_goals.filter((_, i) => i !== index)
    }));
  };

  const updateGoal = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      treatment_goals: prev.treatment_goals.map((goal, i) => i === index ? value : goal)
    }));
  };

  const addProcedure = () => {
    setFormData(prev => ({
      ...prev,
      procedures: [...prev.procedures, '']
    }));
  };

  const removeProcedure = (index: number) => {
    setFormData(prev => ({
      ...prev,
      procedures: prev.procedures.filter((_, i) => i !== index)
    }));
  };

  const updateProcedure = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      procedures: prev.procedures.map((proc, i) => i === index ? value : proc)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.plan_name || !formData.description) {
      toast({
        title: "Missing information",
        description: "Please fill in plan name and description",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const planData = {
        patient_id: patientId,
        dentist_id: dentistId,
        plan_name: formData.plan_name,
        description: formData.description,
        diagnosis: formData.diagnosis,
        treatment_goals: formData.treatment_goals.filter(goal => goal.trim() !== ''),
        procedures: formData.procedures.filter(proc => proc.trim() !== ''),
        estimated_cost: formData.estimated_cost[0] || null,
        estimated_duration: `${formData.estimated_duration_weeks[0]} weeks`,
        priority: formData.priority,
        target_completion_date: formData.target_completion_date || null,
        notes: formData.notes,
        is_urgent: formData.is_urgent,
        requires_specialist: formData.requires_specialist,
        insurance_covered: formData.insurance_covered,
        payment_plan_available: formData.payment_plan_available,
        status: 'draft',
        start_date: new Date().toISOString()
      };

      const { error } = await supabase
        .from('treatment_plans')
        .insert(planData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Treatment plan created successfully",
      });

      setOpen(false);
      setFormData({
        plan_name: '',
        description: '',
        diagnosis: '',
        treatment_goals: [''],
        procedures: [''],
        estimated_cost: [150],
        estimated_duration_weeks: [4],
        priority: 'normal',
        target_completion_date: '',
        notes: '',
        is_urgent: false,
        requires_specialist: false,
        insurance_covered: false,
        payment_plan_available: false
      });
      setShowSuggestions(false);
      onTreatmentPlanCreated?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          <Plus className="h-4 w-4" />
          Add Treatment Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Create Treatment Plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* AI Suggestions Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-blue-600" />
                AI-Powered Treatment Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showSuggestions ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered treatment plan suggestions based on patient symptoms and dental best practices.
                  </p>
                  <Button 
                    onClick={generateAISuggestions}
                    disabled={generatingSuggestions}
                    variant="outline"
                    className="w-full"
                  >
                    {generatingSuggestions ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing Patient Data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get AI Treatment Suggestions
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Suggested Treatment Plans</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowSuggestions(false)}
                    >
                      Hide
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{suggestion.plan_name}</Badge>
                              <Badge variant={suggestion.priority === 'high' ? 'destructive' : 'outline'}>
                                {suggestion.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                            <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>€{suggestion.estimated_cost}</span>
                              <span>{suggestion.estimated_duration} weeks</span>
                              <span>{suggestion.procedures.length} procedures</span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => applySuggestion(suggestion)}
                            className="ml-2"
                          >
                            Use Plan
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Treatment Plan Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan_name">Treatment Plan Name *</Label>
                <Input
                  id="plan_name"
                  placeholder="e.g., Root Canal Treatment"
                  value={formData.plan_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                >
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Detailed treatment description..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px]"
                required
              />
              <AIWritingAssistant 
                onImprove={(improvedText) => setFormData(prev => ({ ...prev, description: improvedText }))}
                currentText={formData.description}
                placeholder="treatment plan description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Clinical Diagnosis</Label>
              <Textarea
                id="diagnosis"
                placeholder="Clinical diagnosis and findings..."
                value={formData.diagnosis}
                onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                className="min-h-[60px]"
              />
              <AIWritingAssistant 
                onImprove={(improvedText) => setFormData(prev => ({ ...prev, diagnosis: improvedText }))}
                currentText={formData.diagnosis}
                placeholder="clinical diagnosis"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Treatment Goals</Label>
                <Button type="button" variant="outline" size="sm" onClick={addGoal}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Goal
                </Button>
              </div>
              <div className="space-y-2">
                {formData.treatment_goals.map((goal, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Enter treatment goal..."
                      value={goal}
                      onChange={(e) => updateGoal(index, e.target.value)}
                    />
                    {formData.treatment_goals.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeGoal(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Procedures</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProcedure}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Procedure
                </Button>
              </div>
              <div className="space-y-2">
                {formData.procedures.map((procedure, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Enter procedure..."
                      value={procedure}
                      onChange={(e) => updateProcedure(index, e.target.value)}
                    />
                    {formData.procedures.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeProcedure(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">Estimated Cost: €{formData.estimated_cost[0]}</Label>
                <Slider
                  id="estimated_cost"
                  value={formData.estimated_cost}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, estimated_cost: value }))}
                  max={10000}
                  min={50}
                  step={50}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>€50</span>
                  <span>€10,000</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_duration_weeks">Duration: {formData.estimated_duration_weeks[0]} weeks</Label>
                <Slider
                  id="estimated_duration_weeks"
                  value={formData.estimated_duration_weeks}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, estimated_duration_weeks: value }))}
                  max={52}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 week</span>
                  <span>52 weeks</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_completion_date">Target Completion Date</Label>
              <Input
                id="target_completion_date"
                type="date"
                value={formData.target_completion_date}
                onChange={(e) => setFormData(prev => ({ ...prev, target_completion_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes and considerations..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[60px]"
              />
              <AIWritingAssistant 
                onImprove={(improvedText) => setFormData(prev => ({ ...prev, notes: improvedText }))}
                currentText={formData.notes}
                placeholder="treatment notes"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_urgent"
                  checked={formData.is_urgent}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_urgent: checked }))}
                />
                <Label htmlFor="is_urgent" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Urgent Treatment
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_specialist"
                  checked={formData.requires_specialist}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_specialist: checked }))}
                />
                <Label htmlFor="requires_specialist" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-500" />
                  Requires Specialist
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="insurance_covered"
                  checked={formData.insurance_covered}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, insurance_covered: checked }))}
                />
                <Label htmlFor="insurance_covered" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Insurance Covered
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="payment_plan_available"
                  checked={formData.payment_plan_available}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, payment_plan_available: checked }))}
                />
                <Label htmlFor="payment_plan_available" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Payment Plan Available
                </Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Create Treatment Plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}