import stringSimilarity from 'string-similarity';
import { Token } from '@/types/trading';
import { extractAmount } from './numberParser';

export interface InterpretedCommand {
  intent: 'buy' | 'sell' | 'check' | 'reset' | 'help' | 'unknown';
  token?: string;
  tokenSymbol?: string;
  amount?: number;
  amountType?: 'dollars' | 'tokens';
  quantity?: 'all' | number;
  confidence: number;
  rawText: string;
  needsConfirmation: boolean;
}

// Intent keyword mappings with fuzzy variations
const intentKeywords = {
  buy: ['buy', 'bye', 'purchase', 'acquire', 'get', 'grab', 'cop', 'buying'],
  sell: ['sell', 'cell', 'liquidate', 'dump', 'exit', 'selling', 'sale'],
  check: ['check', 'show', 'view', 'display', 'portfolio', 'balance', 'holdings', 'what'],
  reset: ['reset', 'restart', 'clear', 'refresh', 'start over'],
  help: ['help', 'guide', 'tutorial', 'commands', 'how']
};

// Detect intent with fuzzy matching
function detectIntent(text: string): { intent: string; confidence: number } {
  const lowerText = text.toLowerCase();
  let bestIntent = 'unknown';
  let highestScore = 0;

  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        // Direct match gets high score
        highestScore = 1.0;
        bestIntent = intent;
        break;
      }
      
      // Fuzzy match
      const words = lowerText.split(/\s+/);
      for (const word of words) {
        const similarity = stringSimilarity.compareTwoStrings(word, keyword);
        if (similarity > 0.7 && similarity > highestScore) {
          highestScore = similarity;
          bestIntent = intent;
        }
      }
    }
    if (highestScore === 1.0) break;
  }

  return { intent: bestIntent, confidence: highestScore };
}

// Find best matching token from market data
function findToken(text: string, tokens: Token[]): { token: Token; confidence: number } | null {
  const lowerText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  
  let bestMatch: Token | null = null;
  let highestScore = 0;

  for (const token of tokens) {
    const symbolLower = token.symbol.toLowerCase();
    const nameLower = token.name.toLowerCase();
    
    // Check for exact matches first
    if (lowerText.includes(symbolLower)) {
      return { token, confidence: 1.0 };
    }
    if (lowerText.includes(nameLower)) {
      return { token, confidence: 1.0 };
    }

    // Fuzzy match against symbol and name
    const words = lowerText.split(/\s+/);
    for (const word of words) {
      if (word.length < 2) continue;
      
      const symbolSimilarity = stringSimilarity.compareTwoStrings(word, symbolLower);
      const nameSimilarity = stringSimilarity.compareTwoStrings(word, nameLower);
      
      const maxSimilarity = Math.max(symbolSimilarity, nameSimilarity);
      
      if (maxSimilarity > 0.65 && maxSimilarity > highestScore) {
        highestScore = maxSimilarity;
        bestMatch = token;
      }
    }
  }

  return bestMatch && highestScore > 0.65 ? { token: bestMatch, confidence: highestScore } : null;
}

// Check for "all" quantity indicator
function detectAllQuantity(text: string): boolean {
  const lowerText = text.toLowerCase();
  return /\ball\b|\bevery\b|\beverything\b|\bentire\b|\bwhole\b/.test(lowerText);
}

// Main interpretation function
export function interpretCommand(text: string, tokens: Token[]): InterpretedCommand {
  const { intent, confidence: intentConfidence } = detectIntent(text);
  
  // For check, reset, help - no token needed
  if (['check', 'reset', 'help'].includes(intent)) {
    return {
      intent: intent as any,
      confidence: intentConfidence,
      rawText: text,
      needsConfirmation: false
    };
  }

  // For buy/sell, find token and amount
  if (intent === 'buy' || intent === 'sell') {
    const tokenMatch = findToken(text, tokens);
    
    if (!tokenMatch) {
      return {
        intent: 'unknown',
        confidence: 0,
        rawText: text,
        needsConfirmation: false
      };
    }

    // Check for "all" quantity
    const isAll = detectAllQuantity(text);
    
    // Extract amount
    const amountData = extractAmount(text);
    
    // For sell, check if "all" is mentioned
    if (intent === 'sell' && isAll) {
      return {
        intent: 'sell',
        token: tokenMatch.token.name,
        tokenSymbol: tokenMatch.token.symbol,
        quantity: 'all',
        confidence: Math.min(intentConfidence, tokenMatch.confidence),
        rawText: text,
        needsConfirmation: true
      };
    }

    // Regular buy/sell with amount
    if (amountData) {
      return {
        intent: intent as 'buy' | 'sell',
        token: tokenMatch.token.name,
        tokenSymbol: tokenMatch.token.symbol,
        amount: amountData.value,
        amountType: amountData.type,
        confidence: Math.min(intentConfidence, tokenMatch.confidence),
        rawText: text,
        needsConfirmation: true
      };
    }

    // Has token but no clear amount
    return {
      intent: intent as 'buy' | 'sell',
      token: tokenMatch.token.name,
      tokenSymbol: tokenMatch.token.symbol,
      confidence: Math.min(intentConfidence, tokenMatch.confidence) * 0.5,
      rawText: text,
      needsConfirmation: true
    };
  }

  return {
    intent: 'unknown',
    confidence: 0,
    rawText: text,
    needsConfirmation: false
  };
}

// Generate human-readable confirmation text
export function generateConfirmationText(command: InterpretedCommand): string {
  if (command.intent === 'buy') {
    if (command.amountType === 'dollars') {
      return `Buy $${command.amount} worth of ${command.tokenSymbol}?`;
    } else if (command.amountType === 'tokens') {
      return `Buy ${command.amount} tokens of ${command.tokenSymbol}?`;
    } else {
      return `Buy ${command.tokenSymbol}? (Please specify an amount)`;
    }
  }

  if (command.intent === 'sell') {
    if (command.quantity === 'all') {
      return `Sell all your ${command.tokenSymbol}?`;
    } else if (command.amount) {
      return `Sell ${command.amount} ${command.tokenSymbol}?`;
    } else {
      return `Sell ${command.tokenSymbol}? (Please specify an amount)`;
    }
  }

  return "I didn't understand that command. Please try again.";
}
