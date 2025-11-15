import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import MarketFeed from "@/components/MarketFeed";
import Portfolio from "@/components/Portfolio";
import VoiceConsole from "@/components/VoiceConsole";
import BuyModal from "@/components/BuyModal";
import SellModal from "@/components/SellModal";
import { Token, Holding } from "@/types/trading";

const INITIAL_BALANCE = 10000;

const MOCK_TOKENS: Token[] = [
  { id: "1", name: "Pepe", symbol: "PEPE", price: 0.000012, change24h: 15.32, volume: 1250000 },
  { id: "2", name: "Dogecoin", symbol: "DOGE", price: 0.082, change24h: -3.21, volume: 8900000 },
  { id: "3", name: "Shiba Inu", symbol: "SHIB", price: 0.000008, change24h: 8.45, volume: 3400000 },
  { id: "4", name: "Floki", symbol: "FLOKI", price: 0.000023, change24h: -12.11, volume: 890000 },
  { id: "5", name: "Baby Doge", symbol: "BABYDOGE", price: 0.0000000018, change24h: 25.67, volume: 560000 },
  { id: "6", name: "SafeMoon", symbol: "SAFEMOON", price: 0.00015, change24h: -8.92, volume: 430000 },
  { id: "7", name: "Dogelon Mars", symbol: "ELON", price: 0.00000031, change24h: 18.23, volume: 720000 },
  { id: "8", name: "Kishu Inu", symbol: "KISHU", price: 0.00000000041, change24h: 5.88, volume: 290000 },
  { id: "9", name: "Hoge Finance", symbol: "HOGE", price: 0.000045, change24h: -15.44, volume: 180000 },
  { id: "10", name: "Akita Inu", symbol: "AKITA", price: 0.000000084, change24h: 32.11, volume: 650000 },
];

const Index = () => {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [tokens, setTokens] = useState<Token[]>(MOCK_TOKENS);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
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

      setHoldings((prevHoldings) =>
        prevHoldings.map((holding) => {
          const token = tokens.find((t) => t.id === holding.tokenId);
          return {
            ...holding,
            currentPrice: token ? token.price : holding.currentPrice,
          };
        })
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [isSimulating, tokens]);

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
    setTokens(MOCK_TOKENS);
    toast({
      title: "Portfolio Reset 🔄",
      description: "Your balance has been restored to $10,000",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar balance={balance} />

      <main className="flex-1 max-w-[1800px] mx-auto w-full p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6" style={{ height: 'calc(100vh - 300px)' }}>
          <MarketFeed
            tokens={tokens}
            onBuy={handleBuy}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
          />
          <Portfolio
            holdings={holdings}
            balance={balance}
            onSell={handleSell}
            onReset={handleReset}
          />
        </div>

        <VoiceConsole />
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
