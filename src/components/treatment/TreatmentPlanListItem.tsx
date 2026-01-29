import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList as ClipboardListIcon,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { TreatmentPlan } from "@/types/dental";

interface TreatmentPlanListItemProps {
  plan: TreatmentPlan;
  onView: (plan: TreatmentPlan) => void;
  onEdit: (plan: TreatmentPlan) => void;
  onDelete: (planId: string) => void;
}

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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export function TreatmentPlanListItem({ plan, onView, onEdit, onDelete }: TreatmentPlanListItemProps) {
  return (
    <Card>
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
            <Button variant="ghost" size="sm" onClick={() => onView(plan)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(plan)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(plan.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { getStatusColor, getPriorityColor, getStatusIcon, formatDate };
