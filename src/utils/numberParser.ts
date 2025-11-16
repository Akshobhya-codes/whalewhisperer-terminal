// Parse spoken numbers to numeric values
const numberWords: { [key: string]: number } = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
  'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
  'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
  'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
  'million': 1000000
};

const magnitudes: { [key: string]: number } = {
  'hundred': 100,
  'thousand': 1000,
  'k': 1000,
  'million': 1000000,
  'm': 1000000
};

export function parseSpokenNumber(text: string): number | null {
  // First try to extract standard number (handles "100", "$500", etc.)
  const standardMatch = text.match(/\$?\d+(?:,\d{3})*(?:\.\d+)?/);
  if (standardMatch) {
    return parseFloat(standardMatch[0].replace(/[$,]/g, ''));
  }

  // Try to parse spoken numbers
  const words = text.toLowerCase().split(/\s+/);
  let result = 0;
  let currentNumber = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/g, '');
    
    if (numberWords[word] !== undefined) {
      const value = numberWords[word];
      
      // Check if next word is a magnitude
      if (i + 1 < words.length) {
        const nextWord = words[i + 1].replace(/[^a-z]/g, '');
        if (magnitudes[nextWord]) {
          currentNumber = (currentNumber + value) * magnitudes[nextWord];
          i++; // Skip the magnitude word
          continue;
        }
      }
      
      // Handle magnitude words
      if (magnitudes[word]) {
        currentNumber *= magnitudes[word];
      } else {
        currentNumber += value;
      }
    } else if (magnitudes[word]) {
      currentNumber *= magnitudes[word];
    }
  }

  result += currentNumber;
  return result > 0 ? result : null;
}

// Extract amount from text - handles both dollar amounts and token quantities
export function extractAmount(text: string): { type: 'dollars' | 'tokens', value: number } | null {
  const lowerText = text.toLowerCase();
  
  console.log('[Amount Extraction] Input text:', text);
  
  // Check for dollar indicators (more flexible pattern)
  const hasDollar = /\$|dollar|dollars|worth|usd|bucks?/i.test(text);
  console.log('[Amount Extraction] Has dollar indicator:', hasDollar);
  
  // Try to parse the number
  const amount = parseSpokenNumber(text);
  console.log('[Amount Extraction] Parsed amount:', amount);
  
  if (amount === null) {
    console.log('[Amount Extraction] No amount found');
    return null;
  }
  
  const result = {
    type: hasDollar ? 'dollars' as const : 'tokens' as const,
    value: amount
  };
  console.log('[Amount Extraction] Result:', result);
  
  return result;
}
