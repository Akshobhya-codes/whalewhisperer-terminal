import { MessageSquare } from "lucide-react";
import { VoiceLog } from "@/types/trading";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VoiceConsoleProps {
  logs: VoiceLog[];
}

const VoiceConsole = ({ logs }: VoiceConsoleProps) => {
  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-orbitron font-bold text-foreground">
          Voice Command Log
        </h2>
        {logs.length > 0 && (
          <span className="text-xs text-muted-foreground font-inter">
            ({logs.length} {logs.length === 1 ? "command" : "commands"})
          </span>
        )}
      </div>

      <ScrollArea className="h-[200px]">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground font-inter text-sm">
            No voice commands yet. Click the microphone to start!
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="space-y-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <span className="text-primary text-sm font-inter font-semibold">
                    You:
                  </span>
                  <span className="text-foreground text-sm font-inter">
                    {log.userText}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary text-sm font-inter font-semibold">
                    AI:
                  </span>
                  <span className="text-muted-foreground text-sm font-inter">
                    {log.aiResponse}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-inter">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default VoiceConsole;
