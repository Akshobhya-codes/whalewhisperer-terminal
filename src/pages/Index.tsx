import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMarketData } from "@/hooks/useMarketData";
import Navbar from "@/components/Navbar";
import MarketFeed from "@/components/MarketFeed";
import Portfolio from "@/components/Portfolio";
import VoiceConsole from "@/components/VoiceConsole";
import VoiceControlPanel from "@/components/VoiceControlPanel";
import VoiceTutorial from "@/components/VoiceTutorial";
import BuyModal from "@/components/BuyModal";
import SellModal from "@/components/SellModal";
import { Token, Holding, VoiceLog } from "@/types/trading";
import { ParsedCommand } from "@/utils/voiceCommands";

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

  const handleVoiceCommand = useCallback((userText: string, aiResponse: string) => {
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
  }, [toast]);

  const handleExecuteVoiceCommand = useCallback((command: ParsedCommand) => {
    switch (command.action) {
      case 'buy': {
        if (!command.token) break;
        const token = tokens.find(t => t.symbol === command.token);
        if (!token) break;

        let amount = 0;
        if (command.amount) {
          amount = command.amount;
        } else if (command.quantity) {
          amount = command.quantity * token.price;
        } else {
          break;
        }

        if (amount > balance) break;

        const quantity = amount / token.price;
        const existingHolding = holdings.find((h) => h.tokenId === token.id);

        if (existingHolding) {
          const totalQuantity = existingHolding.quantity + quantity;
          const newAvgPrice =
            (existingHolding.buyPrice * existingHolding.quantity + token.price * quantity) /
            totalQuantity;

          setHoldings((prev) =>
            prev.map((h) =>
              h.tokenId === token.id
                ? { ...h, quantity: totalQuantity, buyPrice: newAvgPrice }
                : h
            )
          );
        } else {
          setHoldings((prev) => [
            ...prev,
            {
              tokenId: token.id,
              tokenName: token.name,
              symbol: token.symbol,
              quantity,
              buyPrice: token.price,
              currentPrice: token.price,
            },
          ]);
        }

        setBalance((prev) => prev - amount);
        break;
      }

      case 'sell': {
        if (!command.token) break;
        const holding = holdings.find((h) => h.symbol === command.token);
        if (!holding) break;

        const quantity = command.quantity === -1 ? holding.quantity : (command.quantity || 0);
        
        if (quantity === holding.quantity) {
          setHoldings((prev) => prev.filter((h) => h.tokenId !== holding.tokenId));
        } else {
          setHoldings((prev) =>
            prev.map((h) =>
              h.tokenId === holding.tokenId
                ? { ...h, quantity: h.quantity - quantity }
                : h
            )
          );
        }

        const usdReceived = quantity * holding.currentPrice;
        setBalance((prev) => prev + usdReceived);
        break;
      }

      case 'reset': {
        setBalance(INITIAL_BALANCE);
        setHoldings([]);
        break;
      }
    }
  }, [tokens, holdings, balance]);

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
      <VoiceTutorial />

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
            <VoiceControlPanel 
              onCommand={handleVoiceCommand}
              tokens={tokens}
              holdings={holdings}
              balance={balance}
              onExecuteCommand={handleExecuteVoiceCommand}
            />
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
