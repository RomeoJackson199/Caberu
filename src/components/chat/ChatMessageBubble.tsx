import { Bot, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChatMessage } from "@/types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  const timestamp = message.created_at ? new Date(message.created_at) : null;
  const timestampAlignment = message.is_bot
    ? "self-start text-left"
    : "self-end text-right";

  return (
    <div
      className={`flex ${message.is_bot ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`flex items-start gap-3 max-w-[85%] ${
          message.is_bot ? "" : "flex-row-reverse"
        }`}
      >
        <div className="flex-shrink-0 mt-1">
          {message.is_bot ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
              <Bot className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/80 to-secondary flex items-center justify-center shadow-sm">
              <UserIcon className="w-5 h-5 text-secondary-foreground" />
            </div>
          )}
        </div>
        <Card className={`border-none shadow-md ${
          message.is_bot
            ? "bg-card/80 backdrop-blur-sm"
            : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
        }`}>
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</div>
            {timestamp && (
              <time
                dateTime={timestamp.toISOString()}
                title={format(timestamp, "PPpp")}
                className={`text-xs text-muted-foreground ${timestampAlignment}`}
              >
                {format(timestamp, "p")}
              </time>
            )}
            {message.message_type === 'success' && (
              <Badge
                variant="secondary"
                className={`bg-success/10 text-success border-success/20 ${
                  message.is_bot ? "self-start" : "self-end"
                }`}
              >
                <span aria-hidden="true" className="mr-1">
                  ✓
                </span>
                Success
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
