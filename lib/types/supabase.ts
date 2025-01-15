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
  min_price: number;
  max_price: number;
  min_dividend: number;
  max_dividend: number;
  is_active: boolean;
  created_at: string;
}

export interface Stock {
  id: string;
  room_id: string;
  name: string;
  symbol: string;
  current_price: number;
  dividend_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  cash: number;
  created_at: string;
}

export interface PlayerStock {
  id: string;
  player_id: string;
  stock_id: string;
  room_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export type OrderType = "buy" | "sell";
export type OrderStatus = "pending" | "executed" | "failed";

export interface Order {
  id: string;
  room_id: string;
  player_id: string;
  stock_id: string;
  type: OrderType;
  requested_quantity: number;
  requested_price_total: number;
  execution_quantity: number | null;
  execution_price_total: number | null;
  status: OrderStatus;
  created_at: string;
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
