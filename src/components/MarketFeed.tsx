import { TrendingUp, TrendingDown, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Token } from "@/types/trading";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MarketFeedProps {
  tokens: Token[];
  onBuy: (token: Token) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  isLive: boolean;
  isLoading: boolean;
}

const MarketFeed = ({ tokens, onBuy, isSimulating, onToggleSimulation, isLive, isLoading }: MarketFeedProps) => {
  return (
    <div className="glass-card rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-orbitron font-bold text-foreground">
            🔥 Market Feed
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isLive ? "bg-success animate-pulse glow-cyan" : "bg-muted"
                    }`}
                  />
                  <span className="text-xs font-inter text-muted-foreground uppercase">
                    {isLoading ? "Loading..." : isLive ? "Live" : "Simulation"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">
                  {isLive
                    ? "Pulling real-time data from Dexscreener API"
                    : "Using simulated market data"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          onClick={onToggleSimulation}
          variant={isSimulating ? "destructive" : "default"}
          className="font-orbitron"
        >
          {isSimulating ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Stop Simulation
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Simulation
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="glass-card rounded-lg p-4 hover:glow-cyan transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-orbitron font-semibold text-foreground">
                      {token.displayName}
                    </h3>
                    <span className="text-xs text-muted-foreground font-inter">
                      ({token.symbol})
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-orbitron font-bold text-primary">
                      ${token.price.toFixed(6)}
                    </div>

                    <div
                      className={`flex items-center gap-1 text-sm font-inter ${
                        token.change24h >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {token.change24h >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {token.change24h >= 0 ? "+" : ""}
                      {token.change24h.toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-1 font-inter">
                    Vol: ${token.volume.toLocaleString()}
                  </div>
                </div>

                <Button
                  onClick={() => onBuy(token)}
                  className="font-orbitron bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Buy
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketFeed;
