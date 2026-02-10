import { forwardRef } from 'react';
import { Bot, User as UserIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { RecommendedDentistWidget } from '@/components/chat/RecommendedDentistWidget';
import { ChatMessage } from '@/types/chat';
import { logger } from '@/lib/logger';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSelectDentist: (dentist: unknown) => void;
  onSeeAlternatives: () => void;
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  ({ messages, isLoading, onSelectDentist, onSeeAlternatives }, ref) => {
    return (
      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.map((message) => {
          // Check if this is a widget message
          if (message.message_type === 'widget' && message.is_bot) {
            try {
              const widgetData = JSON.parse(message.message);

              if (widgetData.type === 'recommended-dentist-widget') {
                return (
                  <div key={message.id} className="my-4">
                    <RecommendedDentistWidget
                      dentist={widgetData.dentist}
                      matchReason={widgetData.matchReason}
                      symptoms={widgetData.symptoms}
                      onSelectDentist={onSelectDentist}
                      onSeeAlternatives={onSeeAlternatives}
                    />
                  </div>
                );
              }
            } catch (e) {
              logger.error('Error parsing widget data:', e);
            }
          }

          // Regular message rendering
          return (
            <div
              key={message.id}
              className={`flex ${message.is_bot ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.is_bot
                  ? 'bg-card border border-border'
                  : 'bg-primary text-primary-foreground'
                  }`}
              >
                <div className="flex items-start gap-2">
                  {message.is_bot && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    {message.is_bot ? (
                      <MarkdownRenderer content={message.message} />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.message}
                      </p>
                    )}
                    {(message.metadata as Record<string, unknown>)?.ai_generated === true && (
                      <div className="mt-2 text-xs opacity-70">
                        AI Assistant
                      </div>
                    )}
                  </div>
                  {!message.is_bot && (
                    <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <UserIcon className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={ref} />
      </ScrollArea>
    );
  }
);

ChatMessageList.displayName = 'ChatMessageList';
