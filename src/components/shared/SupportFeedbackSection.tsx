import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUPPORT_EMAIL = "romeo@caberu.be";

export const SupportFeedbackSection: React.FC = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!message.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      // Open mailto with pre-filled subject and body
      const mailtoSubject = encodeURIComponent(subject || "Feedback from Caberu");
      const mailtoBody = encodeURIComponent(message);
      window.open(`mailto:${SUPPORT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`, "_blank");
      toast({ title: "Opening your email client…", description: "Complete sending in your email app." });
      setSubject("");
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Support & Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Direct email link */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Support
            </p>
            <p className="text-sm text-muted-foreground">
              Reach us directly at <span className="font-medium text-foreground">{SUPPORT_EMAIL}</span>
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>Send Email</a>
          </Button>
        </div>

        {/* Feedback form */}
        <div className="space-y-3 rounded-lg border p-4">
          <p className="font-medium">Send Feedback</p>
          <div className="space-y-1">
            <Label htmlFor="feedback-subject">Subject</Label>
            <Input
              id="feedback-subject"
              placeholder="e.g. Feature request, Bug report…"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              placeholder="Tell us what's on your mind…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmitFeedback} disabled={sending || !message.trim()} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : "Send Feedback"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
