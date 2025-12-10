import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList as ClipboardListIcon,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Target,
  DollarSign,
  Calendar as CalendarIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { logger } from '@/lib/logger';
import { useBusinessContext } from "@/contexts/BusinessContext";

interface TreatmentPlanManagerProps {
  patientId: string;
  dentistId: string;
}

export function TreatmentPlanManager({ patientId, dentistId }: TreatmentPlanManagerProps) {
  const { businessId } = useBusinessContext();
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [filteredTreatmentPlans, setFilteredTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'priority'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'completed' | 'cancelled'>('all');
  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<NewTreatmentPlanForm>({
    title: '',
    description: '',
    diagnosis: '',
    treatment_goals: [],
    procedures: [],
    estimated_cost: undefined,
    estimated_duration: '',
    priority: 'normal',
    target_completion_date: '',
    notes: ''
  });
  const [newGoal, setNewGoal] = useState('');
  const [newProcedure, setNewProcedure] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTreatmentPlans();
  }, [patientId, dentistId]);

  useEffect(() => {
    filterAndSortTreatmentPlans();
  }, [searchTerm, treatmentPlans, sortBy, sortOrder, filterStatus]);

  const fetchTreatmentPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('dentist_id', dentistId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching treatment plans:', error);
        throw error;
      }

      setTreatmentPlans(data || []);
    } catch (error) {
      console.error('Error in fetchTreatmentPlans:', error);
      toast({
        title: "Error",
        description: "Failed to fetch treatment plans. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTreatmentPlans = () => {
    let filtered = [...treatmentPlans];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(plan =>
        plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(plan => plan.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority': {
          const priorityOrder = { 'low': 0, 'normal': 1, 'high': 2, 'urgent': 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredTreatmentPlans(filtered);
  };

  const handleCreateTreatmentPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .insert({
          patient_id: patientId,
          dentist_id: dentistId,
          business_id: businessId,
          ...formData,
          start_date: new Date().toISOString(),
          status: 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating treatment plan:', error);
        throw error;
      }

      // Send notification to patient
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', patientId)
        .single();

      if (patientProfile?.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: patientProfile.user_id,
            patient_id: patientId,
            dentist_id: dentistId,
            type: 'treatment_plan',
            title: 'New Treatment Plan Created',
            message: `Your dentist has created a new treatment plan: ${formData.title}. ${formData.description || ''}`,
            priority: 'high',
            action_url: '/dashboard?tab=health',
            action_label: 'View Treatment Plan'
          });
      }

      toast({
        title: "Success",
        description: "Treatment plan created and patient notified.",
      });

      setIsDialogOpen(false);
      resetForm();
      fetchTreatmentPlans();
    } catch (error) {
      console.error('Error in handleCreateTreatmentPlan:', error);
      toast({
        title: "Error",
        description: "Failed to create treatment plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTreatmentPlan = async () => {
    if (!selectedTreatmentPlan) return;

    try {
      const { error } = await supabase
        .from('treatment_plans')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTreatmentPlan.id);

      if (error) {
        console.error('Error updating treatment plan:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Treatment plan updated successfully.",
      });

      setIsDialogOpen(false);
      setIsEditMode(false);
      setSelectedTreatmentPlan(null);
      resetForm();
      fetchTreatmentPlans();
    } catch (error) {
      console.error('Error in handleUpdateTreatmentPlan:', error);
      toast({
        title: "Error",
        description: "Failed to update treatment plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTreatmentPlan = async (treatmentPlanId: string) => {
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .delete()
        .eq('id', treatmentPlanId);

      if (error) {
        console.error('Error deleting treatment plan:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Treatment plan deleted successfully.",
      });

      fetchTreatmentPlans();
    } catch (error) {
      console.error('Error in handleDeleteTreatmentPlan:', error);
      toast({
        title: "Error",
        description: "Failed to delete treatment plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (treatmentPlanId: string, newStatus: 'draft' | 'active' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', treatmentPlanId);

      if (error) {
        console.error('Error updating treatment plan status:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Treatment plan status updated successfully.",
      });

      fetchTreatmentPlans();
    } catch (error) {
      console.error('Error in handleStatusChange:', error);
      toast({
        title: "Error",
        description: "Failed to update treatment plan status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (treatmentPlan: TreatmentPlan) => {
    setSelectedTreatmentPlan(treatmentPlan);
    setFormData({
      title: treatmentPlan.title,
      description: treatmentPlan.description || '',
      diagnosis: treatmentPlan.diagnosis || '',
      treatment_goals: treatmentPlan.treatment_goals,
      procedures: treatmentPlan.procedures,
      estimated_cost: treatmentPlan.estimated_cost,
      estimated_duration: treatmentPlan.estimated_duration || '',
      priority: (['low', 'normal', 'high', 'urgent'] as const).includes(treatmentPlan.priority as any)
        ? (treatmentPlan.priority as any)
        : 'normal',
      target_completion_date: treatmentPlan.target_completion_date || '',
      notes: treatmentPlan.notes || ''
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleView = (treatmentPlan: TreatmentPlan) => {
    setSelectedTreatmentPlan(treatmentPlan);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      diagnosis: '',
      treatment_goals: [],
      procedures: [],
      estimated_cost: undefined,
      estimated_duration: '',
      priority: 'normal',
      target_completion_date: '',
      notes: ''
    });
    setNewGoal('');
    setNewProcedure('');
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setFormData({
        ...formData,
        treatment_goals: [...formData.treatment_goals, newGoal.trim()]
      });
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    setFormData({
      ...formData,
      treatment_goals: formData.treatment_goals.filter((_, i) => i !== index)
    });
  };

  const addProcedure = () => {
    if (newProcedure.trim()) {
      setFormData({
        ...formData,
        procedures: [...formData.procedures, newProcedure.trim()]
      });
      setNewProcedure('');
    }
  };

  const removeProcedure = (index: number) => {
    setFormData({
      ...formData,
      procedures: formData.procedures.filter((_, i) => i !== index)
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'draft': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading treatment plans...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Treatment Plans</h2>
          <p className="text-gray-600">Manage patient treatment plans</p>
        </div>
        <Button onClick={() => {
          setSelectedTreatmentPlan(null);
          setIsEditMode(false);
          resetForm();
          setIsDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Treatment Plan
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search treatment plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={sortBy} onValueChange={(value: 'name' | 'date' | 'status' | 'priority') => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
          <Select value={filterStatus} onValueChange={(value: 'all' | 'draft' | 'active' | 'completed' | 'cancelled') => setFilterStatus(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Treatment Plans List */}
      <div className="space-y-2">
        {filteredTreatmentPlans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <ClipboardListIcon className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">{plan.title}</p>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                    <p className="text-xs text-gray-500">
                      Started: {formatDate(plan.start_date)} | Duration: {plan.estimated_duration}
                    </p>
                    {plan.estimated_cost && (
                      <p className="text-xs text-gray-500">
                        Estimated Cost: ${plan.estimated_cost}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(plan.status)}>
                    {getStatusIcon(plan.status)}
                    <span className="ml-1">{plan.status}</span>
                  </Badge>
                  <Badge className={getPriorityColor(plan.priority)}>
                    {plan.priority}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleView(plan)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTreatmentPlan(plan.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTreatmentPlans.length === 0 && !loading && (
        <div className="text-center py-8">
          <ClipboardListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No treatment plans found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms.' : 'No treatment plans have been added yet.'}
          </p>
        </div>
      )}

      {/* Treatment Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Treatment Plan' : selectedTreatmentPlan ? 'View Treatment Plan' : 'New Treatment Plan'}
            </DialogTitle>
          </DialogHeader>

          {!selectedTreatmentPlan || isEditMode ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Plan Name</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter treatment plan name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the treatment plan"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="estimated_duration">Estimated Duration</Label>
                  <Input
                    id="estimated_duration"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                    placeholder="e.g., 6 months"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => setFormData({ ...formData, priority: value })}>
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
                    onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Plan Name</Label>
                <p className="text-sm">{selectedTreatmentPlan.title}</p>
              </div>
              {selectedTreatmentPlan.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <p className="text-sm">{selectedTreatmentPlan.description}</p>
                </div>
              )}
              {selectedTreatmentPlan.diagnosis && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Diagnosis</Label>
                  <p className="text-sm">{selectedTreatmentPlan.diagnosis}</p>
                </div>
              )}
              {selectedTreatmentPlan.treatment_goals.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Treatment Goals</Label>
                  <div className="space-y-1">
                    {selectedTreatmentPlan.treatment_goals.map((goal, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Target className="h-3 w-3 text-blue-600" />
                        <span className="text-sm">{goal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedTreatmentPlan.procedures.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Procedures</Label>
                  <div className="space-y-1">
                    {selectedTreatmentPlan.procedures.map((procedure, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <ClipboardListIcon className="h-3 w-3 text-orange-600" />
                        <span className="text-sm">{procedure}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {selectedTreatmentPlan.estimated_cost && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Estimated Cost</Label>
                    <p className="text-sm">${selectedTreatmentPlan.estimated_cost}</p>
                  </div>
                )}
                {selectedTreatmentPlan.estimated_duration && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Estimated Duration</Label>
                    <p className="text-sm">{selectedTreatmentPlan.estimated_duration}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Priority</Label>
                  <Badge className={getPriorityColor(selectedTreatmentPlan.priority)}>
                    {selectedTreatmentPlan.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Badge className={getStatusColor(selectedTreatmentPlan.status)}>
                    {selectedTreatmentPlan.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Start Date</Label>
                <p className="text-sm">{formatDate(selectedTreatmentPlan.start_date)}</p>
              </div>
              {selectedTreatmentPlan.target_completion_date && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Target Completion Date</Label>
                  <p className="text-sm">{formatDate(selectedTreatmentPlan.target_completion_date)}</p>
                </div>
              )}
              {selectedTreatmentPlan.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Notes</Label>
                  <p className="text-sm">{selectedTreatmentPlan.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            {!selectedTreatmentPlan && (
              <Button onClick={handleCreateTreatmentPlan}>
                Create Treatment Plan
              </Button>
            )}
            {isEditMode && (
              <Button onClick={handleUpdateTreatmentPlan}>
                Update Treatment Plan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}