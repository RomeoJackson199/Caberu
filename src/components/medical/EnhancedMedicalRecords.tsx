import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Upload, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EnhancedMedicalRecordsProps {
  patientId: string;
  dentistId: string;
  viewMode?: "patient" | "dentist";
}

export function EnhancedMedicalRecords({ patientId, dentistId, viewMode = "dentist" }: EnhancedMedicalRecordsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: records, isLoading } = useQuery({
    queryKey: ["medical-records", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", patientId)
        .order("record_date", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("medical_records")
        .insert({
          ...data,
          patient_id: patientId,
          dentist_id: dentistId
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      toast({ title: "Medical record created successfully" });
      setCreateOpen(false);
    }
  });

  const handleFileUpload = async (recordId: string) => {
    if (!selectedFile) return;

    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${recordId}/${Date.now()}.${fileExt}`;

    if (fileName.includes('..')) {
      throw new Error('Invalid file name');
    }

    const { error } = await supabase.storage
      .from("dental-photos")
      .upload(fileName, selectedFile);

    if (error) {
      toast({ title: "Error uploading file", variant: "destructive" });
    } else {
      toast({ title: "File uploaded successfully" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Medical Records</h2>
        {viewMode === "dentist" && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Medical Record</DialogTitle>
              </DialogHeader>
              <MedicalRecordForm
                onSubmit={(data: { title: string; record_type: string; findings: string; treatment_provided: string }) => createMutation.mutate(data)}
                isSubmitting={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {records?.map((record) => (
          <Card key={record.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{record.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(record.record_date), "PPP")}
                  </p>
                </div>
                <Badge>{record.record_type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {record.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{record.description}</p>
                </div>
              )}
              
              {record.findings && (
                <div>
                  <Label className="text-sm font-medium">Findings</Label>
                  <p className="text-sm text-muted-foreground">{record.findings}</p>
                </div>
              )}

              {record.recommendations && (
                <div>
                  <Label className="text-sm font-medium">Recommendations</Label>
                  <p className="text-sm text-muted-foreground">{record.recommendations}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                {viewMode === "dentist" && (
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Attach File
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MedicalRecordForm({ onSubmit, isSubmitting }: any) {
  const [formData, setFormData] = useState({
    record_type: "consultation",
    title: "",
    description: "",
    findings: "",
    recommendations: "",
    record_date: new Date().toISOString().split('T')[0]
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Record Type</Label>
        <Select value={formData.record_type} onValueChange={(v) => setFormData({ ...formData, record_type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consultation">Consultation</SelectItem>
            <SelectItem value="treatment">Treatment</SelectItem>
            <SelectItem value="x-ray">X-Ray</SelectItem>
            <SelectItem value="lab_result">Lab Result</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Findings</Label>
        <Textarea
          value={formData.findings}
          onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Recommendations</Label>
        <Textarea
          value={formData.recommendations}
          onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <Input
          type="date"
          value={formData.record_date}
          onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
          required
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Create Record"}
      </Button>
    </form>
  );
}

function Badge({ children, className ="" }: { children: React.ReactNode; className?: string }) {
  return <span className={`px-2 py-1 text-xs rounded-full bg-primary/10 text-primary ${className}`}>{children}</span>;
}
