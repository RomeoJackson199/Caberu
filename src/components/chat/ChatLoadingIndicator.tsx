import { Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const ChatLoadingIndicator = () => {
  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <Card className="bg-card/80 backdrop-blur-sm border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
