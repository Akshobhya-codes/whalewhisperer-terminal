import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceControlPanelProps {
  onCommand: (userText: string, aiResponse: string) => void;
}

const VoiceControlPanel = ({ onCommand }: VoiceControlPanelProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");

  const simulateVoiceCommand = () => {
    setIsListening(true);
    setTranscribedText("Listening...");

    // Simulate voice recognition after 3 seconds
    setTimeout(() => {
      const commands = [
        {
          user: "Buy 100 BONK",
          ai: "Simulating purchase of 100 BONK at current market price. Added to your portfolio.",
        },
        {
          user: "Sell all PEPE",
          ai: "Selling all PEPE holdings. Transaction complete.",
        },
        {
          user: "What's my portfolio worth?",
          ai: "Your current portfolio value is being calculated based on live market prices.",
        },
        {
          user: "Show me my biggest winner",
          ai: "Analyzing your holdings for the highest profit percentage...",
        },
        {
          user: "Buy 50 dollars of DOGE",
          ai: "Executing buy order for $50 worth of DOGE at current market price.",
        },
      ];

      const randomCommand = commands[Math.floor(Math.random() * commands.length)];
      setTranscribedText(randomCommand.user);

      setTimeout(() => {
        onCommand(randomCommand.user, randomCommand.ai);
        setIsListening(false);
        setTranscribedText("");
      }, 1000);
    }, 3000);
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-orbitron font-bold text-foreground">
            🎙️ Voice Control
          </h2>
          <span className="text-xs text-muted-foreground font-inter">
            (Hathora integration ready)
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={simulateVoiceCommand}
          disabled={isListening}
          className={`relative w-20 h-20 rounded-full font-orbitron transition-all duration-300 ${
            isListening
              ? "bg-secondary animate-pulse glow-purple"
              : "bg-primary hover:bg-primary/90 hover:glow-cyan"
          }`}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
          
          {isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-secondary animate-ping" />
          )}
        </Button>

        <div className="text-center">
          <div className="text-sm font-orbitron font-semibold text-foreground mb-1">
            {isListening ? "Listening..." : "Speak to WhaleWhisperer"}
          </div>
          {transcribedText && !isListening && (
            <div className="text-xs text-muted-foreground font-inter">
              "{transcribedText}"
            </div>
          )}
        </div>

        {isListening && (
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: Math.random() * 30 + 10 + "px",
                  animationDelay: i * 0.1 + "s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceControlPanel;
