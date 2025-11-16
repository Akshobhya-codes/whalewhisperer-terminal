import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMarketData } from "@/hooks/useMarketData";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useVoiceReactions } from "@/hooks/useVoiceReactions";
import Navbar from "@/components/Navbar";
import MarketFeed from "@/components/MarketFeed";
import Portfolio from "@/components/Portfolio";
import VoiceConsole from "@/components/VoiceConsole";
import VoiceControlPanel from "@/components/VoiceControlPanel";
import VoiceTutorial from "@/components/VoiceTutorial";
import BuyModal from "@/components/BuyModal";
import SellModal from "@/components/SellModal";
import SpectateModal from "@/components/SpectateModal";
import RiskGauge from "@/components/RiskGauge";
import { Token, Holding, VoiceLog } from "@/types/trading";
import { ParsedCommand } from "@/utils/voiceCommands";
import { Button } from "@/components/ui/button";
import { Eye, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading: authLoading, requireAuth } = useAuth();
  const { tokens, isLive, isLoading, simulatePriceChange } = useMarketData();
  const {
    balance,
    setBalance,
    holdings,
    setHoldings,
    loading: portfolioLoading,
    saveHolding,
    deleteHolding,
    saveTrade,
    resetPortfolio,
  } = usePortfolio(user?.id);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isSpectateModalOpen, setIsSpectateModalOpen] = useState(false);
  const [spectateMode, setSpectateMode] = useState<{ userId: string; username: string } | null>(null);
  const [spectateHoldings, setSpectateHoldings] = useState<Holding[]>([]);
  const [spectateBalance, setSpectateBalance] = useState(10000);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const { toast } = useToast();
  
  const totalPL = holdings.reduce((sum, h) => sum + ((h.currentPrice - h.buyPrice) * h.quantity), 0);
  const { triggerManualReaction } = useVoiceReactions(totalPL, !spectateMode);

  const loadSpectateData = async (userId: string) => {
    try {
      const { data: holdingsData } = await supabase.from('holdings').select('*').eq('user_id', userId);
      if (holdingsData) {
        const mappedHoldings: Holding[] = holdingsData.map(h => ({
          tokenId: h.id,
          tokenName: h.token_display_name,
          symbol: h.token_symbol,
          displayName: h.token_display_name,
          quantity: h.quantity,
          buyPrice: h.buy_price,
          currentPrice: h.buy_price,
        }));
        setSpectateHoldings(mappedHoldings);
      }
      const { data: trades } = await supabase.from('trades').select('*').eq('user_id', userId);
      if (trades) {
        const spent = trades.filter(t => t.action === 'buy').reduce((sum, t) => sum + t.total_value, 0);
        const gained = trades.filter(t => t.action === 'sell').reduce((sum, t) => sum + t.total_value, 0);
        setSpectateBalance(10000 - spent + gained);
      }
    } catch (error) {
      console.error('Error loading spectate data:', error);
    }
  };

  const handleSpectate = async (userId: string, username: string) => {
    setSpectateMode({ userId, username });
    await loadSpectateData(userId);
  };

  const exitSpectateMode = () => {
    setSpectateMode(null);
    setSpectateHoldings([]);
  };

  useEffect(() => { requireAuth(); }, [user, authLoading]);

  useEffect(() => {
    setHoldings((prevHoldings) =>
      prevHoldings.map((holding) => {
        const token = tokens.find((t) => t.id === holding.tokenId);
        return { ...holding, currentPrice: token ? token.price : holding.currentPrice };
      })
    );
  }, [tokens]);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => { simulatePriceChange(); }, 30000);
    return () => clearInterval(interval);
  }, [isSimulating, simulatePriceChange]);

  const handleVoiceCommand = useCallback((userText: string, aiResponse: string) => {
    setVoiceLogs((prev) => [{ id: Date.now().toString(), timestamp: new Date(), userText, aiResponse }, ...prev]);
    toast({ title: "Voice Command Received 🎙️", description: userText });
  }, [toast]);

  const handleExecuteVoiceCommand = useCallback(async (command: ParsedCommand) => {
    console.log('🔥 Executing:', command);
    switch (command.action) {
      case 'buy': {
        if (!command.token) break;
        const token = tokens.find(t => t.symbol === command.token);
        if (!token) break;
        let amount = command.amount || (command.quantity ? command.quantity * token.price : 0);
        if (!amount || amount > balance) break;
        const quantity = amount / token.price;
        const existingHolding = holdings.find((h) => h.tokenId === token.id);
        if (existingHolding) {
          const totalQuantity = existingHolding.quantity + quantity;
          const newAvgPrice = (existingHolding.buyPrice * existingHolding.quantity + token.price * quantity) / totalQuantity;
          const updatedHolding = { ...existingHolding, quantity: totalQuantity, buyPrice: newAvgPrice };
          setHoldings((prev) => prev.map((h) => h.tokenId === token.id ? updatedHolding : h));
          await saveHolding(updatedHolding);
        } else {
          const newHolding = { tokenId: token.id, tokenName: token.name, symbol: token.symbol, displayName: token.displayName, quantity, buyPrice: token.price, currentPrice: token.price };
          setHoldings((prev) => [...prev, newHolding]);
          await saveHolding(newHolding);
        }
        setBalance((prev) => prev - amount);
        await saveTrade('buy', token.symbol, token.displayName, quantity, token.price, amount);
        break;
      }
      case 'sell': {
        if (!command.token) break;
        const holding = holdings.find((h) => h.symbol === command.token);
        if (!holding) break;
        const quantity = command.quantity === -1 ? holding.quantity : (command.quantity || 0);
        if (quantity === holding.quantity) {
          setHoldings((prev) => prev.filter((h) => h.tokenId !== holding.tokenId));
          await deleteHolding(holding.symbol);
        } else {
          const updatedHolding = { ...holding, quantity: holding.quantity - quantity };
          setHoldings((prev) => prev.map((h) => h.tokenId === holding.tokenId ? updatedHolding : h));
          await saveHolding(updatedHolding);
        }
        const usdReceived = quantity * holding.currentPrice;
        setBalance((prev) => prev + usdReceived);
        await saveTrade('sell', holding.symbol, holding.displayName, quantity, holding.currentPrice, usdReceived);
        break;
      }
      case 'reset': { await resetPortfolio(); break; }
    }
  }, [tokens, holdings, balance, saveHolding, deleteHolding, saveTrade, resetPortfolio]);

  const handleBuy = (token: Token) => { setSelectedToken(token); setIsBuyModalOpen(true); };
  const handleConfirmBuy = async (amount: number) => {
    if (!selectedToken || amount > balance) return;
    const quantity = amount / selectedToken.price;
    const existingHolding = holdings.find((h) => h.tokenId === selectedToken.id);
    if (existingHolding) {
      const totalQuantity = existingHolding.quantity + quantity;
      const newAvgPrice = (existingHolding.buyPrice * existingHolding.quantity + selectedToken.price * quantity) / totalQuantity;
      const updatedHolding = { ...existingHolding, quantity: totalQuantity, buyPrice: newAvgPrice };
      setHoldings((prev) => prev.map((h) => h.tokenId === selectedToken.id ? updatedHolding : h));
      await saveHolding(updatedHolding);
    } else {
      const newHolding = { tokenId: selectedToken.id, tokenName: selectedToken.name, symbol: selectedToken.symbol, displayName: selectedToken.displayName, quantity, buyPrice: selectedToken.price, currentPrice: selectedToken.price };
      setHoldings((prev) => [...prev, newHolding]);
      await saveHolding(newHolding);
    }
    setBalance((prev) => prev - amount);
    await saveTrade('buy', selectedToken.symbol, selectedToken.displayName, quantity, selectedToken.price, amount);
  };

  const handleSell = (holding: Holding) => { setSelectedHolding(holding); setIsSellModalOpen(true); };
  const handleConfirmSell = async (quantity: number) => {
    if (!selectedHolding) return;
    const usdReceived = quantity * selectedHolding.currentPrice;
    if (quantity === selectedHolding.quantity) {
      setHoldings((prev) => prev.filter((h) => h.tokenId !== selectedHolding.tokenId));
      await deleteHolding(selectedHolding.symbol);
    } else {
      const updatedHolding = { ...selectedHolding, quantity: selectedHolding.quantity - quantity };
      setHoldings((prev) => prev.map((h) => h.tokenId === selectedHolding.tokenId ? updatedHolding : h));
      await saveHolding(updatedHolding);
    }
    setBalance((prev) => prev + usdReceived);
    await saveTrade('sell', selectedHolding.symbol, selectedHolding.displayName, quantity, selectedHolding.currentPrice, usdReceived);
  };

  const handleReset = async () => { await resetPortfolio(); };

  if (authLoading || portfolioLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center"><div className="text-6xl animate-pulse">🐳</div><h2 className="text-2xl">Loading...</h2></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar balance={spectateMode ? spectateBalance : balance} />
      <VoiceTutorial />
      {spectateMode && (
        <div className="bg-primary/10 border-b p-4">
          <div className="max-w-[1800px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3"><Eye className="h-5 w-5" /><span>Viewing @{spectateMode.username}'s Portfolio</span></div>
            <Button variant="outline" onClick={exitSpectateMode}><ArrowLeft className="mr-2 h-4 w-4" />Return</Button>
          </div>
        </div>
      )}
      <main className="flex-1 max-w-[1800px] mx-auto w-full p-6">
        <div className="flex justify-end mb-4">{!spectateMode && <Button onClick={() => setIsSpectateModalOpen(true)} variant="outline"><Eye className="mr-2 h-4 w-4" />👀 Spectate Friend</Button>}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2"><MarketFeed tokens={tokens} onBuy={spectateMode ? () => {} : handleBuy} isSimulating={isSimulating} onToggleSimulation={() => !spectateMode && setIsSimulating(!isSimulating)} isLive={isLive} isLoading={isLoading} /></div>
          <div className="space-y-6">
            {!spectateMode && <RiskGauge holdings={holdings} tokens={tokens} balance={balance} />}
            <VoiceControlPanel onCommand={handleVoiceCommand} tokens={tokens} holdings={spectateMode ? spectateHoldings : holdings} balance={spectateMode ? spectateBalance : balance} onExecuteCommand={handleExecuteVoiceCommand} />
            <Portfolio holdings={spectateMode ? spectateHoldings : holdings} balance={spectateMode ? spectateBalance : balance} onSell={spectateMode ? () => {} : handleSell} onReset={spectateMode ? () => {} : handleReset} />
          </div>
        </div>
        <VoiceConsole logs={voiceLogs} />
      </main>
      <BuyModal isOpen={isBuyModalOpen} onClose={() => setIsBuyModalOpen(false)} token={selectedToken} balance={balance} onConfirm={handleConfirmBuy} />
      <SellModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} holding={selectedHolding} onConfirm={handleConfirmSell} />
      <SpectateModal isOpen={isSpectateModalOpen} onClose={() => setIsSpectateModalOpen(false)} onSelectFriend={handleSpectate} />
    </div>
  );
};

export default Index;
