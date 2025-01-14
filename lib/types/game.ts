import { type Event, type Player, type Stock } from "@/lib/types/supabase";

export type RoomPhase =
  | "waiting"
  | "submitting_orders"
  | "executing_orders"
  | "revealing_event"
  | "paying_dividends"
  | "generating_event";

export type OrderType = "buy" | "sell";
export type OrderStatus = "pending" | "executed" | "failed";

export interface StockEffect {
  type: "price_change" | "dividend_change";
  stock_id: string;
  amount: number;
}

export interface StockTemplate {
  id: string;
  name: string;
  symbol: string;
  min_price: number;
  max_price: number;
  min_dividend: number;
  max_dividend: number;
  is_active: boolean;
  created_at: string;
}

export interface StockState {
  id: string;
  current_price: number;
  dividend_amount: number;
}

export interface PlayerStock {
  id: string;
  player_id: string;
  stock_id: string;
  room_id: string;
  quantity: number;
  created_at: string;
}

export interface PlayerState {
  player: Player;
  stocks: (PlayerStock & { stock: Stock })[];
  totalStockValue: number;
  totalWorth: number;
}

export interface GameState {
  players: PlayerState[];
  stocks: Stock[];
  currentRound: number;
  averageWorth: number;
  minWorth: number;
  maxWorth: number;
}

export interface EventGenerationResult {
  success: boolean;
  event?: Event;
  error?: string;
}

export interface GameOrder {
  id: string;
  player_id: string;
  stock_id: string;
  type: "buy" | "sell";
  requested_quantity: number;
  requested_price_total: number;
  execution_quantity?: number;
  execution_price_total?: number;
  status: "pending" | "executed" | "failed";
  created_at: string;
}

export interface GamePlayer {
  id: string;
  room_id: string;
  name: string;
  cash: number;
  created_at: string;
}

export interface GameStock {
  id: string;
  room_id: string;
  name: string;
  symbol: string;
  current_price: number;
  dividend_amount: number;
  created_at: string;
}
