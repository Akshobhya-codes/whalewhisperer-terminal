import { Mic } from "lucide-react";

const VoiceConsole = () => {
  const exampleCommands = [
    { user: "Buy 1000 PEPE", ai: "Executed: Bought 1,000 PEPE at $0.000012" },
    { user: "What's my portfolio?", ai: "Portfolio Value: $12,450.32 | P/L: +24.5%" },
    { user: "Sell all DOGE", ai: "Executed: Sold 5,000 DOGE at $0.082" },
  ];

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Mic className="w-5 h-5 text-primary animate-pulse" />
        <h2 className="text-lg font-orbitron font-bold text-foreground">
          Voice Command Log
        </h2>
        <span className="text-xs text-muted-foreground font-inter">
          (Coming soon with Hathora integration)
        </span>
      </div>

      <div className="space-y-3">
        {exampleCommands.map((cmd, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-primary text-sm font-inter">You:</span>
              <span className="text-foreground text-sm font-inter">{cmd.user}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-secondary text-sm font-inter">AI:</span>
              <span className="text-muted-foreground text-sm font-inter">{cmd.ai}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceConsole;
