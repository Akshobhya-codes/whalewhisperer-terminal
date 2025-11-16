import { useState, useCallback } from "react";
import { Token } from "@/types/trading";

// Custom meme coins with easy pronunciation and high volatility
const CUSTOM_COINS: Token[] = [
  { id: "1", name: "Blop", symbol: "BLP", displayName: "Blop", price: 0.10, change24h: 0, volume: 1250000, volatility: 0.25 },
  { id: "2", name: "Zuga", symbol: "ZGA", displayName: "Zuga", price: 1.50, change24h: 0, volume: 890000, volatility: 0.18 },
  { id: "3", name: "Floop", symbol: "FLP", displayName: "Floop", price: 0.005, change24h: 0, volume: 560000, volatility: 0.35 },
  { id: "4", name: "Toku", symbol: "TKU", displayName: "Toku", price: 0.70, change24h: 0, volume: 340000, volatility: 0.20 },
  { id: "5", name: "Rambo", symbol: "RMB", displayName: "Rambo", price: 2.30, change24h: 0, volume: 780000, volatility: 0.22 },
  { id: "6", name: "Mika", symbol: "MIK", displayName: "Mika", price: 0.25, change24h: 0, volume: 430000, volatility: 0.28 },
];

export const useMarketData = () => {
  const [tokens, setTokens] = useState<Token[]>(CUSTOM_COINS);
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulatePriceChange = useCallback(() => {
    setTokens((prevTokens) =>
      prevTokens.map((token) => {
        const volatility = token.volatility || 0.2;
        let newPrice = token.price;
        
        // 3% chance of micro-pump or micro-crash
        const extremeEventChance = Math.random();
        if (extremeEventChance < 0.015) {
          // Mini-crash: -15% to -25%
          const crashPercent = -(0.15 + Math.random() * 0.10);
          newPrice = token.price * (1 + crashPercent);
          console.log(`🔥 MICRO-CRASH: ${token.symbol} ${(crashPercent * 100).toFixed(1)}%`);
        } else if (extremeEventChance < 0.03) {
          // Mini-pump: +15% to +25%
          const pumpPercent = 0.15 + Math.random() * 0.10;
          newPrice = token.price * (1 + pumpPercent);
          console.log(`🚀 MICRO-PUMP: ${token.symbol} +${(pumpPercent * 100).toFixed(1)}%`);
        } else {
          // Normal volatility swing
          const changePercent = (Math.random() - 0.5) * 2 * volatility;
          newPrice = token.price * (1 + changePercent);
        }
        
        // Clamp price to minimum
        newPrice = Math.max(0.0001, newPrice);
        
        const change24h = ((newPrice - token.price) / token.price) * 100;
        
        return {
          ...token,
          price: newPrice,
          change24h,
          isExtremeMove: extremeEventChance < 0.03
        };
      })
    );
  }, []);

  return { tokens, isLive, isLoading, error, simulatePriceChange };
};
