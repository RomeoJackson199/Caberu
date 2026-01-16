import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pill, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Prescription } from "./types";
import { getStatusColor } from "./utils";
import { sanitizeText } from '@/utils/sanitize';

interface PrescriptionsSectionProps {
  prescriptions: Prescription[];
  onEdit: (prescription: Prescription) => void;
  onDelete: (id: string) => void;
}

export function PrescriptionsSection({ prescriptions, onEdit, onDelete }: PrescriptionsSectionProps) {
  return (
    <AccordionItem value="prescriptions">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-dental-primary" />
              <span>Prescriptions</span>
              <Badge variant="outline">{prescriptions.length}</Badge>
            </div>
            <AccordionTrigger className="py-0" />
          </CardTitle>
        </CardHeader>
        <AccordionContent>
          <CardContent>
            {prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions
                  .slice()
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((prescription) => (
                    <div key={prescription.id} className="p-3 border rounded-lg group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{prescription.medication_name}</h4>
                            <Badge className={getStatusColor(prescription.status)}>
                              {prescription.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {prescription.dosage} - {prescription.frequency}
                          </p>
                          {prescription.duration_days && (
                            <p className="text-sm">Duration: {prescription.duration_days} days</p>
                          )}
                          {prescription.instructions && (
                            <p className="text-sm mt-2 bg-muted p-2 rounded">
                              {sanitizeText(prescription.instructions)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Prescribed: {format(new Date(prescription.prescribed_date), 'PPP')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                          <Button size="icon" variant="ghost" onClick={() => onEdit(prescription)}>
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
                                <AlertDialogTitle>Delete prescription?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(prescription.id)}>Delete</AlertDialogAction>
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
                No prescriptions found
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
