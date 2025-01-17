export type RoomPhase =
  | "waiting"
  | "submitting_orders"
  | "executing_orders"
  | "revealing_event"
  | "paying_dividends";

export type RoomStatus = "WAITING" | "IN_PROGRESS" | "FINISHED";

export interface Room {
  id: string;
  code: string;
  owner_id: string;
  status: RoomStatus;
  current_phase: RoomPhase;
  current_round: number;
  total_rounds: number;
  created_at: string;
}

export interface StockTemplate {
  id: string;
  name: string;
  symbol: string;
  kit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Stock {
  id: string;
  room_id: string;
  name: string;
  symbol: string;
  description: string | null;
  current_price: number;
  previous_price: number | null;
  dividend_amount: number;
  previous_dividends: number | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  user_id: string;
  room_id: string;
  name: string;
  cash: number;
  previous_cash: number | null;
  previous_net_worth: number | null;
  created_at: string;
}

export interface PlayerStock {
  id: string;
  user_id: string;
  stock_id: string;
  room_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export type OrderType = "buy" | "sell" | "skip";
export type OrderStatus = "pending" | "executed" | "failed";

export interface Order {
  id: string;
  room_id: string;
  user_id: string;
  stock_id: string;
  type: OrderType;
  requested_quantity: number;
  requested_price_total: number;
  execution_quantity: number | null;
  execution_price_total: number | null;
  stock_price_before: number | null;
  stock_price_after: number | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  round: number;
}

export interface StockEffect {
  type: "price_change" | "dividend_change";
  stock_id: string;
  amount: number;
}

export interface Event {
  id: string;
  room_id: string;
  round: number;
  title: string;
  description: string;
  effects: StockEffect[];
  created_at: string;
}

export interface PlayerInfo {
  room_id: string;
  user_id: string;
  name: string;
  cash: number;
  net_worth: number;
  previous_cash: number | null;
  previous_net_worth: number | null;
  holdings: Array<{
    symbol: string;
    quantity: number;
  }>;
  created_at: string;
}
