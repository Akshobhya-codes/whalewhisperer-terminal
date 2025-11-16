import { useState, useEffect } from "react";
import { Token } from "@/types/trading";

const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/search?q=";

// Popular meme coins to search for
const MEME_COINS = [
  "PEPE", "DOGE", "SHIB", "FLOKI", "BONK", 
  "WIF", "PEPE2", "WOJAK", "TURBO", "MEME"
];

// Generate phonetically distinct display names (stable per token id)
const generateDisplayName = (symbol: string, name: string, id?: string): string => {
  // Pool of aliases per common symbol to avoid collisions
  const pools: Record<string, string[]> = {
    PEPE: ["Pepper", "Piper", "Peppy", "Pebble", "Poppy", "Peepo", "Pepo"],
    DOGE: ["Dojo", "Dodger", "Dozie", "Doja", "Dozy"],
    SHIB: ["Shibu", "Shiba", "Shibo", "Shivu", "Shivy"],
    FLOKI: ["Floki", "Floky", "Flora", "Floro"],
    BONK: ["Banker", "Bonker", "Bonnie", "Bongo"],
    WIF: ["Wiffy", "Whiffy", "Wiffy Hat", "Wifer"],
    PEPE2: ["Papaya", "Pepper Two", "Peppy Two"],
    WOJAK: ["Wojack", "Wozak", "Wajak"],
    TURBO: ["Turbo", "Turbine", "Torb"],
    MEME: ["Mimo", "Mimi", "Memo"],
  };

  const pool = pools[symbol] || [];
  if (pool.length === 0) return name || symbol;

  // Deterministic index based on id fallback to name+symbol
  const key = (id || `${name}:${symbol}`);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const idx = hash % pool.length;
  return pool[idx];
};

const FALLBACK_TOKENS: Token[] = [
  { id: "1", name: "Pepe", symbol: "PEPE", displayName: "Pepper", price: 0.000012, change24h: 15.32, volume: 1250000 },
  { id: "2", name: "Dogecoin", symbol: "DOGE", displayName: "Dojo", price: 0.082, change24h: -3.21, volume: 8900000 },
  { id: "3", name: "Shiba Inu", symbol: "SHIB", displayName: "Shibu", price: 0.000008, change24h: 8.45, volume: 3400000 },
  { id: "4", name: "Floki", symbol: "FLOKI", displayName: "Floki", price: 0.000023, change24h: -12.11, volume: 890000 },
  { id: "5", name: "Bonk", symbol: "BONK", displayName: "Banker", price: 0.000018, change24h: 25.67, volume: 560000 },
  { id: "6", name: "Dogwifhat", symbol: "WIF", displayName: "Wiffy", price: 0.45, change24h: -8.92, volume: 2430000 },
  { id: "7", name: "Pepe 2.0", symbol: "PEPE2", displayName: "Papaya", price: 0.00000031, change24h: 18.23, volume: 720000 },
  { id: "8", name: "Wojak", symbol: "WOJAK", displayName: "Wojack", price: 0.00000041, change24h: 5.88, volume: 290000 },
  { id: "9", name: "Turbo", symbol: "TURBO", displayName: "Turbo", price: 0.000045, change24h: -15.44, volume: 180000 },
  { id: "10", name: "Meme", symbol: "MEME", displayName: "Mimo", price: 0.0084, change24h: 32.11, volume: 650000 },
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
          .map((pair: any, index: number) => {
            const symbol = pair.baseToken?.symbol || "???";
            const name = pair.baseToken?.name || "Unknown";
            const id = pair.pairAddress || String(index + 1);
            // Generate phonetically distinct display names (stable per id)
            const displayName = generateDisplayName(symbol, name, id);
            return {
              id,
              name,
              symbol,
              displayName,
              price: parseFloat(pair.priceUsd) || 0,
              change24h: parseFloat(pair.priceChange?.h24) || 0,
              volume: parseFloat(pair.volume?.h24) || 0,
            };
          })
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
        // Variable volatility between 2% and 20%
        const baseVolatility = 2 + Math.random() * 18;
        
        // 5% chance of micro-crash or micro-pump
        const extremeEvent = Math.random() < 0.05;
        let changePercent: number;
        
        if (extremeEvent) {
          // Micro-crash (-15% to -25%) or micro-pump (+15% to +25%)
          const isCrash = Math.random() < 0.5;
          changePercent = isCrash ? -(15 + Math.random() * 10) : (15 + Math.random() * 10);
        } else {
          // Normal volatility
          changePercent = (Math.random() - 0.5) * baseVolatility;
        }
        
        const newPrice = token.price * (1 + changePercent / 100);
        return {
          ...token,
          price: newPrice,
          change24h: token.change24h + changePercent * 0.5,
          isExtremeMove: extremeEvent,
        };
      })
    );
  };

  return { tokens, isLive, isLoading, error, simulatePriceChange };
};
