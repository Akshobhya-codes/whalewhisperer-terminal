import { TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Holding } from "@/types/trading";

interface PortfolioProps {
  holdings: Holding[];
  balance: number;
  onSell: (holding: Holding) => void;
  onReset: () => void;
}

const Portfolio = ({ holdings, balance, onSell, onReset }: PortfolioProps) => {
  const portfolioValue = holdings.reduce(
    (sum, h) => sum + h.quantity * h.currentPrice,
    0
  );
  const totalValue = portfolioValue + balance;
  const initialBalance = 10000;
  const totalPL = totalValue - initialBalance;
  const totalPLPercent = ((totalPL / initialBalance) * 100);

  return (
    <div className="glass-card rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-orbitron font-bold text-foreground">
          💼 Portfolio
        </h2>
        <Button
          onClick={onReset}
          variant="outline"
          className="font-orbitron border-border hover:bg-muted"
        >
          Reset Portfolio
        </Button>
      </div>

      <div className="glass-card rounded-lg p-6 mb-6 glow-cyan">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-muted-foreground mb-1 font-inter">
              Portfolio Value
            </div>
            <div className="text-3xl font-orbitron font-bold text-primary">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1 font-inter">
              Overall P/L
            </div>
            <div
              className={`text-3xl font-orbitron font-bold flex items-center gap-2 ${
                totalPL >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {totalPL >= 0 ? (
                <TrendingUp className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
              {totalPL >= 0 ? "+" : ""}${Math.abs(totalPL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-lg">({totalPL >= 0 ? "+" : ""}{totalPLPercent.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {holdings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground font-inter">
            No holdings yet. Start buying some tokens!
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((holding, index) => {
              const pl = (holding.currentPrice - holding.buyPrice) * holding.quantity;
              const plPercent = ((holding.currentPrice - holding.buyPrice) / holding.buyPrice) * 100;

              return (
                <div
                  key={index}
                  className="glass-card rounded-lg p-4 hover:glow-purple transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-orbitron font-semibold text-foreground">
                        {holding.tokenName}
                      </h3>
                      <span className="text-sm text-muted-foreground font-inter">
                        {holding.symbol}
                      </span>
                    </div>
                    <Button
                      onClick={() => onSell(holding)}
                      variant="outline"
                      size="sm"
                      className="font-orbitron border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Sell
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm font-inter">
                    <div>
                      <div className="text-muted-foreground">Quantity</div>
                      <div className="font-semibold text-foreground">
                        {holding.quantity.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Buy Price</div>
                      <div className="font-semibold text-foreground">
                        ${holding.buyPrice.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Current Price</div>
                      <div className="font-semibold text-primary">
                        ${holding.currentPrice.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">P/L</div>
                      <div
                        className={`font-semibold ${
                          pl >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {pl >= 0 ? "+" : ""}${Math.abs(pl).toFixed(2)} ({pl >= 0 ? "+" : ""}{plPercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
