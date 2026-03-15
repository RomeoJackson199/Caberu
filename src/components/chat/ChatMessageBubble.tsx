import { Bot, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChatMessage } from "@/types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  const timestamp = message.created_at ? new Date(message.created_at) : null;

  if (message.is_bot) {
    return (
      <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 px-2">
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="flex flex-col gap-1 max-w-[85%]">
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {message.message}
          </div>
          {timestamp && (
            <time
              dateTime={timestamp.toISOString()}
              title={format(timestamp, "PPpp")}
              className="text-xs text-muted-foreground"
            >
              {format(timestamp, "p")}
            </time>
          )}
          {message.message_type === "success" && (
            <Badge
              variant="secondary"
              className="self-start bg-success/10 text-success border-success/20"
            >
              <span aria-hidden="true" className="mr-1">✓</span>
              Success
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end items-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 px-2">
      <div className="flex flex-col items-end gap-1 max-w-[75%]">
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-3xl rounded-br-md text-sm leading-relaxed whitespace-pre-wrap">
          {message.message}
        </div>
        {timestamp && (
          <time
            dateTime={timestamp.toISOString()}
            title={format(timestamp, "PPpp")}
            className="text-xs text-muted-foreground"
          >
            {format(timestamp, "p")}
          </time>
        )}
        {message.message_type === "success" && (
          <Badge
            variant="secondary"
            className="bg-success/10 text-success border-success/20"
          >
            <span aria-hidden="true" className="mr-1">✓</span>
            Success
          </Badge>
        )}
      </div>
      <div className="flex-shrink-0 mb-1">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <UserIcon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );
};
