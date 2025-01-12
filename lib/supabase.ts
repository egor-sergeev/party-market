import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to generate a random 4-letter code
export function generateRoomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Excluding I and O to avoid confusion
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

export type Room = {
  id: string;
  code: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  current_round: number;
  current_phase:
    | "submitting_orders"
    | "executing_orders"
    | "revealing_event"
    | "paying_dividends";
  round_end_time: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  cash: number;
  created_at: string;
};

export type Stock = {
  id: string;
  room_id: string;
  name: string;
  symbol: string;
  current_price: number;
  dividend_amount: number;
  created_at: string;
};

export type PlayerStock = {
  id: string;
  player_id: string;
  stock_id: string;
  room_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type OrderType = "buy" | "sell";
export type OrderStatus = "pending" | "executed" | "failed";

export type Order = {
  id: string;
  room_id: string;
  player_id: string;
  stock_id: string;
  type: OrderType;
  requested_quantity: number;
  requested_price_total: number;
  execution_quantity: number | null;
  execution_price_total: number | null;
  submitted_at: string;
  status: OrderStatus;
  created_at: string;
};

export type StockEffect = {
  stock_id: string;
  price_change_percent: number;
  yield_change: number;
};

export type Event = {
  id: string;
  room_id: string;
  round: number;
  title: string;
  description: string | null;
  effects: StockEffect[];
  revealed: boolean;
  created_at: string;
};

// Helper type for calculating player net worth
export type PlayerPortfolio = {
  player: Player;
  stocks: (PlayerStock & { stock: Stock })[];
  total_stock_value: number;
  total_worth: number;
};
