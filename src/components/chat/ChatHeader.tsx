import { Button } from '@/components/ui/button';
import { Bot, Mic } from 'lucide-react';

interface ChatHeaderProps {
  isRecording: boolean;
  onToggleRecording: () => void;
}

export function ChatHeader({ isRecording, onToggleRecording }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-card backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-foreground">Caberu Assistant</h3>
          <p className="text-sm text-muted-foreground">How can I help you today?</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRecording}
          className={`${isRecording ? 'bg-destructive/10 text-destructive' : ''}`}
        >
          <Mic className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
