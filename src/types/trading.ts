export interface Token {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

export interface Holding {
  tokenId: string;
  tokenName: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

export interface VoiceLog {
  id: string;
  timestamp: Date;
  userText: string;
  aiResponse: string;
}
