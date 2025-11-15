import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMarketData } from "@/hooks/useMarketData";
import Navbar from "@/components/Navbar";
import MarketFeed from "@/components/MarketFeed";
import Portfolio from "@/components/Portfolio";
import VoiceConsole from "@/components/VoiceConsole";
import VoiceControlPanel from "@/components/VoiceControlPanel";
import BuyModal from "@/components/BuyModal";
import SellModal from "@/components/SellModal";
import { Token, Holding, VoiceLog } from "@/types/trading";

const INITIAL_BALANCE = 10000;

const Index = () => {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const { tokens, isLive, isLoading, simulatePriceChange } = useMarketData();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const { toast } = useToast();

  // Update holdings with current prices
  useEffect(() => {
    setHoldings((prevHoldings) =>
      prevHoldings.map((holding) => {
        const token = tokens.find((t) => t.id === holding.tokenId);
        return {
          ...holding,
          currentPrice: token ? token.price : holding.currentPrice,
        };
      })
    );
  }, [tokens]);

  // Simulation mode
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      simulatePriceChange();
    }, 30000);

    return () => clearInterval(interval);
  }, [isSimulating, simulatePriceChange]);

  const handleVoiceCommand = (userText: string, aiResponse: string) => {
    const newLog: VoiceLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      userText,
      aiResponse,
    };
    
    setVoiceLogs((prev) => [newLog, ...prev]);
    
    toast({
      title: "Voice Command Received 🎙️",
      description: userText,
    });
  };

  const handleBuy = (token: Token) => {
    setSelectedToken(token);
    setIsBuyModalOpen(true);
  };

  const handleConfirmBuy = (amount: number) => {
    if (!selectedToken || amount > balance) return;

    const quantity = amount / selectedToken.price;
    const existingHolding = holdings.find((h) => h.tokenId === selectedToken.id);

    if (existingHolding) {
      const totalQuantity = existingHolding.quantity + quantity;
      const newAvgPrice =
        (existingHolding.buyPrice * existingHolding.quantity + selectedToken.price * quantity) /
        totalQuantity;

      setHoldings((prev) =>
        prev.map((h) =>
          h.tokenId === selectedToken.id
            ? { ...h, quantity: totalQuantity, buyPrice: newAvgPrice }
            : h
        )
      );
    } else {
      setHoldings((prev) => [
        ...prev,
        {
          tokenId: selectedToken.id,
          tokenName: selectedToken.name,
          symbol: selectedToken.symbol,
          quantity,
          buyPrice: selectedToken.price,
          currentPrice: selectedToken.price,
        },
      ]);
    }

    setBalance((prev) => prev - amount);
    toast({
      title: "Purchase Successful! 🚀",
      description: `Bought ${quantity.toLocaleString()} ${selectedToken.symbol} for $${amount.toFixed(2)}`,
    });
  };

  const handleSell = (holding: Holding) => {
    setSelectedHolding(holding);
    setIsSellModalOpen(true);
  };

  const handleConfirmSell = (quantity: number) => {
    if (!selectedHolding) return;

    const usdReceived = quantity * selectedHolding.currentPrice;
    const pl = (selectedHolding.currentPrice - selectedHolding.buyPrice) * quantity;

    if (quantity === selectedHolding.quantity) {
      setHoldings((prev) => prev.filter((h) => h.tokenId !== selectedHolding.tokenId));
    } else {
      setHoldings((prev) =>
        prev.map((h) =>
          h.tokenId === selectedHolding.tokenId
            ? { ...h, quantity: h.quantity - quantity }
            : h
        )
      );
    }

    setBalance((prev) => prev + usdReceived);
    toast({
      title: pl >= 0 ? "Profit Secured! 💰" : "Sale Completed",
      description: `Sold ${quantity.toLocaleString()} ${selectedHolding.symbol} for $${usdReceived.toFixed(2)} (${pl >= 0 ? '+' : ''}$${pl.toFixed(2)} P/L)`,
      variant: pl >= 0 ? "default" : "destructive",
    });
  };

  const handleReset = () => {
    setBalance(INITIAL_BALANCE);
    setHoldings([]);
    toast({
      title: "Portfolio Reset 🔄",
      description: "Your balance has been restored to $10,000",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar balance={balance} />

      <main className="flex-1 max-w-[1800px] mx-auto w-full p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" style={{ minHeight: 'calc(100vh - 400px)' }}>
          <div className="lg:col-span-2">
            <MarketFeed
              tokens={tokens}
              onBuy={handleBuy}
              isSimulating={isSimulating}
              onToggleSimulation={() => setIsSimulating(!isSimulating)}
              isLive={isLive}
              isLoading={isLoading}
            />
          </div>
          
          <div className="space-y-6">
            <VoiceControlPanel onCommand={handleVoiceCommand} />
            <Portfolio
              holdings={holdings}
              balance={balance}
              onSell={handleSell}
              onReset={handleReset}
            />
          </div>
        </div>

        <VoiceConsole logs={voiceLogs} />
      </main>

      <footer className="glass-card border-t border-border/50 py-4 text-center">
        <p className="text-sm text-muted-foreground font-inter">
          Built by <span className="text-primary font-orbitron font-semibold">WhaleWhisperer 🐳</span> — Talk to your bags.
        </p>
      </footer>

      <BuyModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        token={selectedToken}
        balance={balance}
        onConfirm={handleConfirmBuy}
      />

      <SellModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        holding={selectedHolding}
        onConfirm={handleConfirmSell}
      />
    </div>
  );
};

export default Index;
