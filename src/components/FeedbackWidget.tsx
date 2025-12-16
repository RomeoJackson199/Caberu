import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  ThumbsUp,
  Send,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useEffect } from "react";

type FeedbackType = "bug" | "feature" | "improvement" | "general";

interface FeedbackFormData {
  type: FeedbackType;
  title: string;
  description: string;
  email: string;
  page?: string;
}

const feedbackTypes = [
  {
    value: "bug" as FeedbackType,
    label: "Bug Report",
    description: "Report a problem or issue",
    icon: Bug,
    color: "text-red-600 bg-red-50",
  },
  {
    value: "feature" as FeedbackType,
    label: "Feature Request",
    description: "Suggest a new feature",
    icon: Lightbulb,
    color: "text-yellow-600 bg-yellow-50",
  },
  {
    value: "improvement" as FeedbackType,
    label: "Improvement",
    description: "Suggest an enhancement",
    icon: ThumbsUp,
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: "general" as FeedbackType,
    label: "General Feedback",
    description: "Share your thoughts",
    icon: MessageSquare,
    color: "text-purple-600 bg-purple-50",
  },
];

interface FeedbackWidgetProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  showLabel?: boolean;
}

export function FeedbackWidget({
  position = "bottom-right",
  showLabel = false,
}: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const [formData, setFormData] = useState<FeedbackFormData>({
    type: "general",
    title: "",
    description: "",
    email: "",
    page: window.location.pathname,
  });

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setFormData(prev => ({ ...prev, email: user.email || '' }));
      }
    };
    loadUser();
  }, []);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  const selectedType = feedbackTypes.find((t) => t.value === formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info("Feedback submitted:", {
        ...formData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      });

      setSubmitted(true);
      toast.success("Thank you for your feedback!");

      // Reset form after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setFormData({
          type: "general",
          title: "",
          description: "",
          email: userEmail || "",
          page: window.location.pathname,
        });
      }, 2000);
    } catch (error) {
      logger.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed ${positionClasses[position]} z-50
                   flex items-center gap-2 px-4 py-3
                   bg-gradient-to-r from-blue-600 to-purple-600
                   text-white font-semibold rounded-full shadow-lg
                   hover:shadow-xl hover:scale-105
                   transition-all duration-200
                   group`}
        aria-label="Send feedback"
      >
        <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
        {showLabel && <span>Feedback</span>}
      </button>

      {/* Feedback dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {!submitted ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  Send Feedback
                </DialogTitle>
                <DialogDescription>
                  Help us improve Caberu by sharing your thoughts, reporting bugs,
                  or suggesting new features.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                {/* Feedback type selection */}
                <div className="space-y-3">
                  <Label>What would you like to share?</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedbackTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, type: type.value })
                        }
                        className={`p-4 rounded-lg border-2 transition-all text-left
                                   ${formData.type === type.value
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${formData.type === type.value
                              ? type.color
                              : "bg-gray-100 text-gray-600"
                              }`}
                          >
                            <type.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {type.label}
                            </div>
                            <div className="text-sm text-gray-600">
                              {type.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder={
                      formData.type === "bug"
                        ? "Brief description of the issue"
                        : "What would you like us to know?"
                    }
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    maxLength={100}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {formData.title.length}/100
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={
                      formData.type === "bug"
                        ? "Steps to reproduce:\n1. Go to...\n2. Click on...\n3. See error\n\nExpected behavior:\nWhat should happen\n\nActual behavior:\nWhat actually happens"
                        : "Please provide as much detail as possible..."
                    }
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                    rows={8}
                    maxLength={1000}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {formData.description.length}/1000
                  </div>
                </div>

                {/* Email (optional if logged out) */}
                {!userEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-gray-500">(optional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      We'll only use this to follow up on your feedback
                    </p>
                  </div>
                )}

                {/* Current page badge */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Current page:</span>
                  <Badge variant="secondary">{formData.page}</Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-pulse">Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Feedback
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            // Success state
            <div className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Thank You!
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your feedback has been submitted successfully. We appreciate you
                taking the time to help us improve Caberu.
              </p>
              <Button
                onClick={() => {
                  setOpen(false);
                  setSubmitted(false);
                }}
                variant="outline"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Inline feedback button (for embedding in UI)
 */
interface InlineFeedbackButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  label?: string;
}

export function InlineFeedbackButton({
  variant = "outline",
  size = "default",
  label = "Send Feedback",
}: InlineFeedbackButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        {label}
      </Button>
      <FeedbackWidget position="bottom-right" showLabel={false} />
    </>
  );
}
