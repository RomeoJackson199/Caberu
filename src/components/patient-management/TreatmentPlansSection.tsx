import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ClipboardList as ClipboardListIcon, Edit, Trash2 } from "lucide-react";
import { TreatmentPlan } from "./types";
import { getStatusColor } from "./utils";
import { sanitizeText } from '@/utils/sanitize';

interface TreatmentPlansSectionProps {
  treatmentPlans: TreatmentPlan[];
  onEdit: (plan: TreatmentPlan) => void;
  onDelete: (id: string) => void;
}

export function TreatmentPlansSection({ treatmentPlans, onEdit, onDelete }: TreatmentPlansSectionProps) {
  return (
    <AccordionItem value="treatments">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardListIcon className="h-5 w-5 text-dental-primary" />
              <span>Treatment Plans</span>
              <Badge variant="outline">{treatmentPlans.length}</Badge>
            </div>
            <AccordionTrigger className="py-0" />
          </CardTitle>
        </CardHeader>
        <AccordionContent>
          <CardContent>
            {treatmentPlans.length > 0 ? (
              <div className="space-y-3">
                {treatmentPlans
                  .slice()
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((plan) => (
                    <div key={plan.id} className="p-3 border rounded-lg group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{plan.title}</h4>
                            <Badge className={getStatusColor(plan.status)}>
                              {plan.status}
                            </Badge>
                          </div>
                          {plan.description && (
                            <p className="text-sm text-muted-foreground mt-1">{sanitizeText(plan.description)}</p>
                          )}
                          {plan.diagnosis && (
                            <p className="text-sm mt-2 bg-muted p-2 rounded">
                              <span className="font-medium">Diagnosis:</span> {sanitizeText(plan.diagnosis)}
                            </p>
                          )}
                          <div className="flex space-x-4 mt-2 text-sm">
                            {plan.estimated_cost && (
                              <span>Cost: ${plan.estimated_cost}</span>
                            )}
                            {plan.estimated_duration_weeks && (
                              <span>Duration: {plan.estimated_duration_weeks} weeks</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                          <Button size="icon" variant="ghost" onClick={() => onEdit(plan)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete treatment plan?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(plan.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No treatment plans found
              </p>
            )}
            <div className="pt-3 flex justify-end">
              <Button size="sm" variant="ghost">View All</Button>
            </div>
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}
