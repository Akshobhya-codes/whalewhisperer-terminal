import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Token, Holding } from "@/types/trading";
import { AlertTriangle, Shield, TrendingUp } from "lucide-react";

interface RiskGaugeProps {
  holdings: Holding[];
  tokens: Token[];
  balance: number;
}

const RiskGauge = ({ holdings, tokens, balance }: RiskGaugeProps) => {
  const [riskLevel, setRiskLevel] = useState(0);
  const [riskLabel, setRiskLabel] = useState("Safe seas");

  useEffect(() => {
    // Calculate risk level based on portfolio volatility
    if (holdings.length === 0) {
      setRiskLevel(0);
      setRiskLabel("Safe seas");
      return;
    }

    const totalValue = balance + holdings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
    
    // Calculate average volatility weighted by portfolio allocation
    let weightedVolatility = 0;
    holdings.forEach(holding => {
      const token = tokens.find(t => t.id === holding.tokenId);
      if (token) {
        const positionValue = holding.quantity * holding.currentPrice;
        const weight = positionValue / totalValue;
        // Assume 24h volatility ranges from 5% (stable) to 30% (volatile)
        const volatility = Math.abs(token.change24h) || 10;
        weightedVolatility += volatility * weight;
      }
    });

    // Scale to 0-100
    const risk = Math.min(100, weightedVolatility * 3.33);
    setRiskLevel(risk);

    // Set label
    if (risk < 40) {
      setRiskLabel("Safe seas");
    } else if (risk < 70) {
      setRiskLabel("Choppy waters");
    } else {
      setRiskLabel("High volatility – Hold tight!");
    }
  }, [holdings, tokens, balance]);

  const getRiskColor = () => {
    if (riskLevel < 40) return "hsl(var(--success))";
    if (riskLevel < 70) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const getRiskIcon = () => {
    if (riskLevel < 40) return <Shield className="h-5 w-5" />;
    if (riskLevel < 70) return <TrendingUp className="h-5 w-5" />;
    return <AlertTriangle className="h-5 w-5" />;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">RISK GAUGE</h3>
        <Badge variant="outline" className="animate-pulse">
          {getRiskIcon()}
        </Badge>
      </div>

      <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{
            width: `${riskLevel}%`,
            backgroundColor: getRiskColor(),
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-3xl font-bold" style={{ color: getRiskColor() }}>
          {riskLevel.toFixed(0)}%
        </div>
        <div className="text-sm text-muted-foreground">
          {riskLabel}
        </div>
      </div>
    </Card>
  );
};

export default RiskGauge;
