import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Bot, X, Check } from "lucide-react";

interface AiOptOutPromptProps {
  user: User;
}

export const AiOptOutPrompt = ({ user }: AiOptOutPromptProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkAiOptOutStatus = useCallback(async () => {
    try {
      // Use local preference to avoid DB column mismatch
      const disabled = localStorage.getItem(`ai_features_disabled_${user.id}`) === 'true';
      const lastPromptDate = localStorage.getItem(`ai_opt_out_prompt_${user.id}`);
      const today = new Date().toDateString();
      if (disabled && lastPromptDate !== today) {
        setShowPrompt(true);
      }
    } catch (error) {
      console.error('Error checking AI opt-out status:', error);
    }
  }, [user.id]);

  useEffect(() => {
    checkAiOptOutStatus();
  }, [checkAiOptOutStatus]);

  const handleEnableAi = async () => {
    setLoading(true);
    try {
      // Clear local preference and mark as prompted today
      localStorage.setItem(`ai_features_disabled_${user.id}`, 'false');
      localStorage.setItem(`ai_opt_out_prompt_${user.id}`, new Date().toDateString());
      setShowPrompt(false);
      toast({
        title: "AI Features Enabled",
        description: "AI features have been re-enabled for your account.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to enable AI features",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Mark as prompted today
    localStorage.setItem(`ai_opt_out_prompt_${user.id}`, new Date().toDateString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-500" />
            <span>AI Features Disabled</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We noticed that AI features are currently disabled for your account. Would you like to re-enable them?
          </p>
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">•</span>
              <span className="text-sm">AI chat functionality</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">•</span>
              <span className="text-sm">Photo analysis features</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">•</span>
              <span className="text-sm">AI-powered appointment suggestions</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You can always disable AI features again in your settings.
          </p>
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Maybe Later
            </Button>
            <Button
              onClick={handleEnableAi}
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Enable AI
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};