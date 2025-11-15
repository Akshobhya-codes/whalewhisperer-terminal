import { useState, useEffect } from "react";
import { Token } from "@/types/trading";

const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/search?q=";

// Popular meme coins to search for
const MEME_COINS = [
  "PEPE", "DOGE", "SHIB", "FLOKI", "BONK", 
  "WIF", "PEPE2", "WOJAK", "TURBO", "MEME"
];

const FALLBACK_TOKENS: Token[] = [
  { id: "1", name: "Pepe", symbol: "PEPE", price: 0.000012, change24h: 15.32, volume: 1250000 },
  { id: "2", name: "Dogecoin", symbol: "DOGE", price: 0.082, change24h: -3.21, volume: 8900000 },
  { id: "3", name: "Shiba Inu", symbol: "SHIB", price: 0.000008, change24h: 8.45, volume: 3400000 },
  { id: "4", name: "Floki", symbol: "FLOKI", price: 0.000023, change24h: -12.11, volume: 890000 },
  { id: "5", name: "Bonk", symbol: "BONK", price: 0.000018, change24h: 25.67, volume: 560000 },
  { id: "6", name: "Dogwifhat", symbol: "WIF", price: 0.45, change24h: -8.92, volume: 2430000 },
  { id: "7", name: "Pepe 2.0", symbol: "PEPE2", price: 0.00000031, change24h: 18.23, volume: 720000 },
  { id: "8", name: "Wojak", symbol: "WOJAK", price: 0.00000041, change24h: 5.88, volume: 290000 },
  { id: "9", name: "Turbo", symbol: "TURBO", price: 0.000045, change24h: -15.44, volume: 180000 },
  { id: "10", name: "Meme", symbol: "MEME", price: 0.0084, change24h: 32.11, volume: 650000 },
];

export const useMarketData = () => {
  const [tokens, setTokens] = useState<Token[]>(FALLBACK_TOKENS);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch data for multiple meme coins
      const searchTerm = MEME_COINS[0]; // Start with first coin
      const response = await fetch(`${DEXSCREENER_API}${searchTerm}`);
      
      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        // Process and sort by volume
        const processedTokens: Token[] = data.pairs
          .slice(0, 10)
          .map((pair: any, index: number) => ({
            id: pair.pairAddress || String(index + 1),
            name: pair.baseToken?.name || "Unknown",
            symbol: pair.baseToken?.symbol || "???",
            price: parseFloat(pair.priceUsd) || 0,
            change24h: parseFloat(pair.priceChange?.h24) || 0,
            volume: parseFloat(pair.volume?.h24) || 0,
          }))
          .filter((token) => token.price > 0)
          .sort((a, b) => b.volume - a.volume);

        if (processedTokens.length > 0) {
          setTokens(processedTokens);
          setIsLive(true);
        } else {
          throw new Error("No valid tokens found");
        }
      } else {
        throw new Error("No pairs found");
      }
    } catch (err) {
      console.error("Failed to fetch live data:", err);
      setError("Using simulation mode");
      setIsLive(false);
      // Keep using fallback tokens
      setTokens(FALLBACK_TOKENS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const simulatePriceChange = () => {
    setTokens((prevTokens) =>
      prevTokens.map((token) => {
        const changePercent = (Math.random() - 0.5) * 10;
        const newPrice = token.price * (1 + changePercent / 100);
        return {
          ...token,
          price: newPrice,
          change24h: token.change24h + changePercent * 0.5,
        };
      })
    );
  };

  return { tokens, isLive, isLoading, error, simulatePriceChange };
};
