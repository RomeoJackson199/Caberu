import { useState, memo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReviewDialogProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  onSubmitted: () => void;
}

export const ReviewDialog = memo(function ReviewDialog({ 
  appointmentId, 
  patientId, 
  dentistId, 
  onSubmitted 
}: ReviewDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const submitReview = useCallback(async () => {
    const { error } = await supabase.from("dentist_ratings").insert({
      patient_id: patientId,
      dentist_id: dentistId,
      appointment_id: appointmentId,
      rating,
      review: comment || null,
    });

    if (error) {
      toast({ description: "Failed to submit feedback", variant: "destructive" });
    } else {
      toast({ description: "Thank you for sharing your experience!" });
      setOpen(false);
      onSubmitted();
    }
  }, [patientId, dentistId, appointmentId, rating, comment, toast, onSubmitted]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Share Your Experience</Button>
      </DialogTrigger>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Share Your Experience</DialogTitle>
        </DialogHeader>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-6 w-6 cursor-pointer ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-400"}`}
              onClick={() => setRating(star)}
            />
          ))}
        </div>
        <Textarea
          placeholder="Write your feedback (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button onClick={submitReview} disabled={rating === 0}>
          Submit Feedback
        </Button>
      </DialogContent>
    </Dialog>
  );
});
