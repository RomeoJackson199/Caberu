import { Button } from '@/components/ui/button';
import { Bot, Mic } from 'lucide-react';

interface ChatHeaderProps {
  isRecording: boolean;
  onToggleRecording: () => void;
}

export function ChatHeader({ isRecording, onToggleRecording }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Caberu Assistant</h3>
          <p className="text-sm text-gray-600">How can I help you today?</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRecording}
          className={`${isRecording ? 'bg-red-100 text-red-600' : ''}`}
        >
          <Mic className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
