import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, Square } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  isLoading: boolean;
  isRecording: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onVoiceToggle,
  isLoading,
  isRecording
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleButtonClick = () => {
    if (value.trim()) {
      onSend();
    } else {
      onVoiceToggle();
    }
  };

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="pr-12 rounded-full border-border focus:border-primary focus:ring-primary"
            disabled={isLoading}
          />
          {isRecording && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse-soft"></div>
            </div>
          )}
        </div>
        <Button
          onClick={handleButtonClick}
          disabled={isLoading || (!value.trim() && !isRecording)}
          className="rounded-full w-10 h-10 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isRecording ? (
            <Square className="w-4 h-4" />
          ) : value.trim() ? (
            <Send className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
