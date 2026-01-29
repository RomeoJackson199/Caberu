import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccordionItem, AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
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
import { FileText, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PatientNote } from "./types";
import { sanitizeText } from '@/utils/sanitize';

interface NotesSectionProps {
  notes: PatientNote[];
  onEdit: (note: PatientNote) => void;
  onDelete: (id: string) => void;
}

export function NotesSection({ notes, onEdit, onDelete }: NotesSectionProps) {
  return (
    <AccordionItem value="notes">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-dental-primary" />
              <span>Notes</span>
              <Badge variant="outline">{notes.length}</Badge>
            </div>
            <AccordionTrigger className="py-0" />
          </CardTitle>
        </CardHeader>
        <AccordionContent>
          <CardContent>
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes
                  .slice()
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((note) => (
                    <div key={note.id} className="p-3 border rounded-lg group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{note.title}</h4>
                            {note.is_private && (
                              <Badge variant="secondary" className="text-xs">Private</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{sanitizeText(note.content)}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(note.created_at), 'PPP p')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                          <Button size="icon" variant="ghost" onClick={() => onEdit(note)}>
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
                                <AlertDialogTitle>Delete note?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(note.id)}>Delete</AlertDialogAction>
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
                No notes found
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
