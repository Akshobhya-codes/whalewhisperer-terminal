import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Holding } from "@/types/trading";
import { useToast } from "./use-toast";

const INITIAL_BALANCE = 10000;

export const usePortfolio = (userId: string | undefined) => {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load portfolio from database
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadPortfolio();
  }, [userId]);

  const loadPortfolio = async () => {
    if (!userId) return;

    try {
      // Load holdings
      const { data: holdingsData, error: holdingsError } = await supabase
        .from("holdings")
        .select("*")
        .eq("user_id", userId);

      if (holdingsError) throw holdingsError;

      // Convert database holdings to app holdings
      const convertedHoldings: Holding[] = (holdingsData || []).map((h) => ({
        tokenId: h.token_symbol,
        tokenName: h.token_display_name,
        symbol: h.token_symbol,
        displayName: h.token_display_name,
        quantity: Number(h.quantity),
        buyPrice: Number(h.buy_price),
        currentPrice: Number(h.buy_price),
      }));

      setHoldings(convertedHoldings);

      // Calculate balance from trades
      const { data: tradesData, error: tradesError } = await supabase
        .from("trades")
        .select("action, total_value")
        .eq("user_id", userId);

      if (tradesError) throw tradesError;

      let calculatedBalance = INITIAL_BALANCE;
      (tradesData || []).forEach((trade) => {
        if (trade.action === "buy") {
          calculatedBalance -= Number(trade.total_value);
        } else {
          calculatedBalance += Number(trade.total_value);
        }
      });

      setBalance(calculatedBalance);
    } catch (error: any) {
      console.error("Error loading portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to load portfolio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveHolding = async (holding: Holding) => {
    if (!userId) return;

    try {
      // Delete first then insert to avoid conflicts
      await supabase
        .from("holdings")
        .delete()
        .eq("user_id", userId)
        .eq("token_symbol", holding.symbol);

      const { error } = await supabase.from("holdings").insert({
        user_id: userId,
        token_symbol: holding.symbol,
        token_display_name: holding.displayName,
        quantity: holding.quantity,
        buy_price: holding.buyPrice,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving holding:", error);
      toast({
        title: "Error",
        description: "Failed to save holding",
        variant: "destructive",
      });
    }
  };

  const deleteHolding = async (symbol: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("holdings")
        .delete()
        .eq("user_id", userId)
        .eq("token_symbol", symbol);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error deleting holding:", error);
    }
  };

  const saveTrade = async (
    action: "buy" | "sell",
    tokenSymbol: string,
    tokenDisplayName: string,
    quantity: number,
    price: number,
    totalValue: number
  ) => {
    if (!userId) return;

    try {
      const { error } = await supabase.from("trades").insert({
        user_id: userId,
        token_symbol: tokenSymbol,
        token_display_name: tokenDisplayName,
        action,
        quantity,
        price,
        total_value: totalValue,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving trade:", error);
      toast({
        title: "Error",
        description: "Failed to save trade",
        variant: "destructive",
      });
    }
  };

  const updateHoldings = useCallback(
    async (newHoldings: Holding[]) => {
      setHoldings(newHoldings);
      if (userId) {
        // Save all holdings
        for (const holding of newHoldings) {
          await saveHolding(holding);
        }
      }
    },
    [userId]
  );

  const resetPortfolio = async () => {
    if (!userId) {
      setBalance(INITIAL_BALANCE);
      setHoldings([]);
      return;
    }

    try {
      // Delete all holdings and trades
      await supabase.from("holdings").delete().eq("user_id", userId);
      await supabase.from("trades").delete().eq("user_id", userId);

      setBalance(INITIAL_BALANCE);
      setHoldings([]);

      toast({
        title: "Portfolio Reset",
        description: "Your portfolio has been reset to initial state.",
      });
    } catch (error: any) {
      console.error("Error resetting portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to reset portfolio",
        variant: "destructive",
      });
    }
  };

  return {
    balance,
    setBalance,
    holdings,
    setHoldings,
    loading,
    saveHolding,
    deleteHolding,
    saveTrade,
    updateHoldings,
    resetPortfolio,
  };
};
