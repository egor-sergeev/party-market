import {
  type Event,
  type Player,
  type PlayerStock,
  type Stock,
} from "@/lib/supabase";

export type StockTemplate = {
  id: string;
  name: string;
  symbol: string;
  min_price: number;
  max_price: number;
  min_dividend: number;
  max_dividend: number;
  is_active: boolean;
  created_at: string;
};

export type PlayerState = {
  player: Player;
  stocks: (PlayerStock & { stock: Stock })[];
  totalStockValue: number;
  totalWorth: number;
};

export type GameState = {
  players: PlayerState[];
  stocks: Stock[];
  currentRound: number;
  averageWorth: number;
  minWorth: number;
  maxWorth: number;
};

export type EventGenerationResult = {
  success: boolean;
  event?: Event;
  error?: string;
};
