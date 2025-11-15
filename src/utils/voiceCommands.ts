import { Token, Holding } from "@/types/trading";

export interface ParsedCommand {
  action: 'buy' | 'sell' | 'check' | 'reset' | 'unknown';
  token?: string;
  amount?: number;
  quantity?: number;
}

export const parseVoiceCommand = (text: string): ParsedCommand => {
  const lowerText = text.toLowerCase().trim();
  
  // Buy commands: "buy 100 BONK", "buy $50 of PEPE", "purchase 100 dollars of DOGE"
  const buyMatch = lowerText.match(/(?:buy|purchase)\s+(?:(\d+(?:\.\d+)?)\s*(?:dollars?|usd|\$)|(\d+(?:\.\d+)?)).*?(?:of\s+)?([a-z]+)/i);
  if (buyMatch) {
    const token = buyMatch[3]?.toUpperCase();
    const amount = buyMatch[1] ? parseFloat(buyMatch[1]) : undefined;
    const quantity = buyMatch[2] ? parseFloat(buyMatch[2]) : undefined;
    return { action: 'buy', token, amount, quantity };
  }

  // Sell commands: "sell all PEPE", "sell 50 BONK", "sell everything"
  const sellMatch = lowerText.match(/sell\s+(?:(all|everything)|(\d+(?:\.\d+)?))\s*([a-z]*)/i);
  if (sellMatch) {
    const isAll = !!(sellMatch[1]);
    const quantity = sellMatch[2] ? parseFloat(sellMatch[2]) : undefined;
    const token = sellMatch[3]?.toUpperCase();
    return { action: 'sell', token, quantity: isAll ? -1 : quantity };
  }

  // Check portfolio: "what's my portfolio", "show my holdings", "portfolio value"
  if (lowerText.match(/(?:portfolio|holdings?|balance|value)/)) {
    return { action: 'check' };
  }

  // Reset: "reset wallet", "reset portfolio", "start over"
  if (lowerText.match(/(?:reset|start over|clear)/)) {
    return { action: 'reset' };
  }

  return { action: 'unknown' };
};

export const generateAIResponse = (
  command: ParsedCommand,
  tokens: Token[],
  holdings: Holding[],
  balance: number,
  success: boolean = true
): string => {
  if (!success) {
    return "Sorry, I couldn't execute that command. Please try again.";
  }

  switch (command.action) {
    case 'buy': {
      if (!command.token) return "I couldn't identify which token to buy.";
      const token = tokens.find(t => t.symbol === command.token);
      if (!token) return `I couldn't find ${command.token} in the market.`;
      
      if (command.amount) {
        const qty = command.amount / token.price;
        return `Purchased ${qty.toLocaleString()} ${command.token} for $${command.amount.toFixed(2)} at $${token.price.toFixed(6)} per token. Added to your portfolio.`;
      } else if (command.quantity) {
        const cost = command.quantity * token.price;
        return `Purchased ${command.quantity.toLocaleString()} ${command.token} for $${cost.toFixed(2)}. Added to your portfolio.`;
      }
      return `Bought ${command.token} successfully.`;
    }

    case 'sell': {
      if (!command.token) return "I couldn't identify which token to sell.";
      const holding = holdings.find(h => h.symbol === command.token);
      if (!holding) return `You don't have any ${command.token} to sell.`;
      
      const qty = command.quantity === -1 ? holding.quantity : (command.quantity || 0);
      const revenue = qty * holding.currentPrice;
      const pl = (holding.currentPrice - holding.buyPrice) * qty;
      const plText = pl >= 0 ? `+$${pl.toFixed(2)} profit` : `$${pl.toFixed(2)} loss`;
      
      if (command.quantity === -1) {
        return `Sold all ${qty.toLocaleString()} ${command.token} for $${revenue.toFixed(2)}. Realized ${plText}.`;
      }
      return `Sold ${qty.toLocaleString()} ${command.token} for $${revenue.toFixed(2)}. Realized ${plText}.`;
    }

    case 'check': {
      const totalValue = holdings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), balance);
      const portfolioValue = totalValue - balance;
      const initialInvestment = holdings.reduce((sum, h) => sum + (h.quantity * h.buyPrice), 0);
      const overallPL = portfolioValue - initialInvestment;
      
      return `Your portfolio is worth $${totalValue.toFixed(2)}. You have ${holdings.length} holdings valued at $${portfolioValue.toFixed(2)}, plus $${balance.toFixed(2)} in cash. Overall profit is ${overallPL >= 0 ? '+' : ''}$${overallPL.toFixed(2)}.`;
    }

    case 'reset':
      return "Portfolio reset successfully. You now have $10,000 to trade with.";

    default:
      return "I didn't understand that command. Try saying things like 'buy 100 BONK', 'sell all PEPE', or 'check my portfolio'.";
  }
};
