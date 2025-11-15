import { useState } from "react";
import { TrendingUp, TrendingDown, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Token } from "@/types/trading";

interface MarketFeedProps {
  tokens: Token[];
  onBuy: (token: Token) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
}

const MarketFeed = ({ tokens, onBuy, isSimulating, onToggleSimulation }: MarketFeedProps) => {
  return (
    <div className="glass-card rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-orbitron font-bold text-foreground">
          🔥 Market Feed
        </h2>
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
                      {token.name}
                    </h3>
                    <span className="text-sm text-muted-foreground font-inter">
                      {token.symbol}
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
