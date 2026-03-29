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
  Pill, 
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
  Activity
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface EnhancedPrescriptionManagerProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  onPrescriptionCreated?: () => void;
}

interface PrescriptionSuggestion {
  medication: string;
  dosage: string;
  frequency: string;
  duration: number;
  instructions: string;
  reason: string;
}

export function EnhancedPrescriptionManager({ 
  appointmentId, 
  patientId, 
  dentistId, 
  onPrescriptionCreated 
}: EnhancedPrescriptionManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<PrescriptionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration_days: [7],
    instructions: '',
    is_urgent: false,
    requires_monitoring: false,
    side_effects: '',
    contraindications: '',
    refills_allowed: [0],
    expiry_date: ''
  });
  const { toast } = useToast();

  // Common medication suggestions based on dental procedures
  const commonMedications = [
    { name: "Amoxicillin", dosage: "500mg", frequency: "three times daily", duration: 7, type: "antibiotic" },
    { name: "Ibuprofen", dosage: "400mg", frequency: "as needed", duration: 5, type: "pain_relief" },
    { name: "Paracetamol", dosage: "500mg", frequency: "four times daily", duration: 3, type: "pain_relief" },
    { name: "Chlorhexidine", dosage: "0.12%", frequency: "twice daily", duration: 10, type: "mouthwash" },
    { name: "Metronidazole", dosage: "400mg", frequency: "three times daily", duration: 7, type: "antibiotic" }
  ];

  const generateAISuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      // Simulate AI analysis based on patient history and common dental procedures
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const suggestions: PrescriptionSuggestion[] = [
        {
          medication: "Amoxicillin 500mg",
          dosage: "500mg",
          frequency: "three times daily",
          duration: 7,
          instructions: "Take with food. Complete full course. Contact if rash develops.",
          reason: "Standard antibiotic for dental infections"
        },
        {
          medication: "Ibuprofen 400mg",
          dosage: "400mg",
          frequency: "as needed",
          duration: 5,
          instructions: "Take for pain relief. Maximum 4 times daily. Take with food.",
          reason: "Pain management post-procedure"
        },
        {
          medication: "Chlorhexidine 0.12%",
          dosage: "15ml",
          frequency: "twice daily",
          duration: 10,
          instructions: "Rinse for 30 seconds. Do not eat or drink for 30 minutes after use.",
          reason: "Antiseptic mouthwash for oral hygiene"
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

  const applySuggestion = (suggestion: PrescriptionSuggestion) => {
    setFormData({
      ...formData,
      medication_name: suggestion.medication,
      dosage: suggestion.dosage,
      frequency: suggestion.frequency,
      duration_days: [suggestion.duration],
      instructions: suggestion.instructions
    });
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.medication_name || !formData.dosage || !formData.frequency) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const prescriptionData = {
        patient_id: patientId,
        dentist_id: dentistId,
        medication_name: formData.medication_name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: `${formData.duration_days[0]} days`,
        instructions: formData.instructions,
        side_effects: formData.side_effects,
        contraindications: formData.contraindications,
        refills_allowed: formData.refills_allowed[0],
        is_urgent: formData.is_urgent,
        requires_monitoring: formData.requires_monitoring,
        prescribed_date: new Date().toISOString().split('T')[0],
        expiry_date: formData.expiry_date || null,
        status: 'active'
      };

      const { error } = await supabase
        .from('prescriptions')
        .insert(prescriptionData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prescription created successfully",
      });

      setOpen(false);
      setFormData({
        medication_name: '',
        dosage: '',
        frequency: '',
        duration_days: [7],
        instructions: '',
        is_urgent: false,
        requires_monitoring: false,
        side_effects: '',
        contraindications: '',
        refills_allowed: [0],
        expiry_date: ''
      });
      setShowSuggestions(false);
      onPrescriptionCreated?.();
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
          <Pill className="h-4 w-4" />
          <Plus className="h-4 w-4" />
          Add Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Create New Prescription
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* AI Suggestions Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-blue-600" />
                AI-Powered Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showSuggestions ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered prescription suggestions based on common dental procedures and best practices.
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
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get AI Suggestions
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Suggested Prescriptions</h4>
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
                      <Card key={index} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{suggestion.medication}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {suggestion.dosage} • {suggestion.frequency}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                            <p className="text-xs text-muted-foreground">{suggestion.instructions}</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => applySuggestion(suggestion)}
                            className="ml-2"
                          >
                            Use
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

          {/* Prescription Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medication_name">Medication Name *</Label>
                <Input
                  id="medication_name"
                  placeholder="e.g., Amoxicillin"
                  value={formData.medication_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, medication_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage *</Label>
                <Input
                  id="dosage"
                  placeholder="e.g., 500mg"
                  value={formData.dosage}
                  onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select 
                  value={formData.frequency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once daily">Once daily</SelectItem>
                    <SelectItem value="twice daily">Twice daily</SelectItem>
                    <SelectItem value="three times daily">Three times daily</SelectItem>
                    <SelectItem value="four times daily">Four times daily</SelectItem>
                    <SelectItem value="as needed">As needed</SelectItem>
                    <SelectItem value="before meals">Before meals</SelectItem>
                    <SelectItem value="after meals">After meals</SelectItem>
                    <SelectItem value="every 6 hours">Every 6 hours</SelectItem>
                    <SelectItem value="every 8 hours">Every 8 hours</SelectItem>
                    <SelectItem value="every 12 hours">Every 12 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_days">Duration: {formData.duration_days[0]} days</Label>
                <Slider
                  id="duration_days"
                  value={formData.duration_days}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, duration_days: value }))}
                  max={90}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 day</span>
                  <span>90 days</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Special instructions, side effects to watch for, dietary restrictions..."
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                className="min-h-[80px]"
              />
              <AIWritingAssistant 
                onImprove={(improvedText) => setFormData(prev => ({ ...prev, instructions: improvedText }))}
                currentText={formData.instructions}
                placeholder="prescription instructions"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="side_effects">Side Effects to Monitor</Label>
                <Textarea
                  id="side_effects"
                  placeholder="Common side effects to watch for..."
                  value={formData.side_effects}
                  onChange={(e) => setFormData(prev => ({ ...prev, side_effects: e.target.value }))}
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contraindications">Contraindications</Label>
                <Textarea
                  id="contraindications"
                  placeholder="Allergies, drug interactions, conditions..."
                  value={formData.contraindications}
                  onChange={(e) => setFormData(prev => ({ ...prev, contraindications: e.target.value }))}
                  className="min-h-[60px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refills_allowed">Refills Allowed: {formData.refills_allowed[0]}</Label>
                <Slider
                  id="refills_allowed"
                  value={formData.refills_allowed}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, refills_allowed: value }))}
                  max={5}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 refills</span>
                  <span>5 refills</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                />
              </div>
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
                  Urgent Prescription
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_monitoring"
                  checked={formData.requires_monitoring}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_monitoring: checked }))}
                />
                <Label htmlFor="requires_monitoring" className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Requires Monitoring
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
                    Create Prescription
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