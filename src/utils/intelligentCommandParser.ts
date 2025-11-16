import stringSimilarity from 'string-similarity';
import { Token } from '@/types/trading';
import { extractAmount } from './numberParser';

export interface InterpretedCommand {
  intent: 'buy' | 'sell' | 'check' | 'reset' | 'help' | 'unknown';
  token?: string;
  tokenSymbol?: string;
  tokenDisplayName?: string; // Phonetically distinct name for display
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

// Fuzzy match variations for custom meme coins
const tokenAliases: Record<string, string[]> = {
  'BLP': ['blop', 'blob', 'blope', 'blap'],
  'ZGA': ['zuga', 'zooka', 'zuka'],
  'FLP': ['floop', 'flute', 'flip', 'flop'],
  'TKU': ['toku', 'tokoo', 'toco'],
  'RMB': ['rambo', 'ramboo', 'rumbo', 'frambo'],
  'MIK': ['mika', 'meeka', 'mica', 'myka']
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
  const lowerText = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  // Check token aliases first for custom coins
  for (const [symbol, aliases] of Object.entries(tokenAliases)) {
    for (const alias of aliases) {
      if (lowerText.includes(alias)) {
        const token = tokens.find(t => t.symbol === symbol);
        if (token) return { token, confidence: 1.0 };
      }
    }
  }
  
  // Also try without spaces for acronyms (e.g., "p e p e" -> "pepe")
  const compactText = lowerText.replace(/\s+/g, '');
  
  let bestMatch: Token | null = null;
  let highestScore = 0;

  for (const token of tokens) {
    const symbolLower = token.symbol.toLowerCase();
    const nameLower = token.name.toLowerCase();
    const displayLower = token.displayName.toLowerCase();
    
    // Check for exact matches first (prioritize displayName)
    if (lowerText.includes(displayLower) || compactText.includes(displayLower)) {
      return { token, confidence: 1.0 };
    }
    if (lowerText.includes(symbolLower) || compactText.includes(symbolLower)) {
      return { token, confidence: 1.0 };
    }
    if (lowerText.includes(nameLower) || compactText.includes(nameLower)) {
      return { token, confidence: 0.95 };
    }

    // Check if spoken letter-by-letter (e.g., "p e p e" or "p.e.p.e.")
    const letterPattern = symbolLower.split('').join('\\s*[.,\\s]*\\s*');
    const letterRegex = new RegExp(letterPattern, 'i');
    if (letterRegex.test(text)) {
      return { token, confidence: 0.95 };
    }

    // Fuzzy match against displayName, symbol and name
    const words = lowerText.split(/\s+/);
    for (const word of words) {
      if (word.length < 2) continue;
      
      const displaySimilarity = stringSimilarity.compareTwoStrings(word, displayLower);
      const symbolSimilarity = stringSimilarity.compareTwoStrings(word, symbolLower);
      const nameSimilarity = stringSimilarity.compareTwoStrings(word, nameLower);
      
      const maxSimilarity = Math.max(displaySimilarity, symbolSimilarity, nameSimilarity);
      
      // Increased threshold to avoid false matches
      if (maxSimilarity > 0.75 && maxSimilarity > highestScore) {
        highestScore = maxSimilarity;
        bestMatch = token;
      }
    }
    
    // Also check compact version
    if (compactText.length >= 3) {
      const compactDisplaySim = stringSimilarity.compareTwoStrings(compactText, displayLower);
      const compactSimilarity = stringSimilarity.compareTwoStrings(compactText, symbolLower);
      const maxCompactSim = Math.max(compactDisplaySim, compactSimilarity);
      if (maxCompactSim > 0.75 && maxCompactSim > highestScore) {
        highestScore = maxCompactSim;
        bestMatch = token;
      }
    }
  }

  return bestMatch && highestScore > 0.7 ? { token: bestMatch, confidence: highestScore } : null;
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
        tokenDisplayName: tokenMatch.token.displayName,
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
        tokenDisplayName: tokenMatch.token.displayName,
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
      tokenDisplayName: tokenMatch.token.displayName,
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
  const name = command.tokenDisplayName || command.tokenSymbol || '';
  const dual = command.tokenSymbol && name && name !== command.tokenSymbol ? `${name} (${command.tokenSymbol})` : name;
  
  if (command.intent === 'buy') {
    if (command.amountType === 'dollars' && command.amount) {
      return `Buy $${command.amount} worth of ${dual}?`;
    } else if (command.amountType === 'tokens' && command.amount) {
      return `Buy ${command.amount} tokens of ${dual}?`;
    } else {
      return `Buy ${dual}? How much?`;
    }
  }

  if (command.intent === 'sell') {
    if (command.quantity === 'all') {
      return `Sell all your ${dual}?`;
    } else if (command.amount) {
      return `Sell ${command.amount} ${dual}?`;
    } else {
      return `Sell ${dual}? How much?`;
    }
  }

  return "I didn't understand that command. Please try again.";
}

// Parse confirmation response from user
export function parseConfirmationResponse(text: string): {
  action: 'confirm' | 'cancel' | 'modify';
  newAmount?: number;
  newAmountType?: 'dollars' | 'tokens';
} {
  const lowerText = text.toLowerCase();
  
  // Check for confirmation keywords (case-insensitive)
  if (/\b(yes|yeah|yep|yup|sure|okay|ok|confirm|correct|right|do it|go ahead|proceed)\b/i.test(text)) {
    return { action: 'confirm' };
  }
  
  // Check for cancellation keywords (case-insensitive)
  if (/\b(no|nope|nah|cancel|stop|abort|nevermind|never mind|don't)\b/i.test(text)) {
    return { action: 'cancel' };
  }
  
  // Check for modification keywords
  if (/\b(change|modify|make it|instead|actually)\b/.test(lowerText)) {
    const amountData = extractAmount(text);
    if (amountData) {
      return {
        action: 'modify',
        newAmount: amountData.value,
        newAmountType: amountData.type
      };
    }
  }
  
  // If they just say a number, treat as modification
  const amountData = extractAmount(text);
  if (amountData) {
    return {
      action: 'modify',
      newAmount: amountData.value,
      newAmountType: amountData.type
    };
  }
  
  // Default to cancel if unclear
  return { action: 'cancel' };
}
