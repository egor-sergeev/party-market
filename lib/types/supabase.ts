import {
  type OrderStatus,
  type OrderType,
  type RoomPhase,
  type StockEffect,
} from "./game";

export interface Room {
  id: string;
  code: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  current_phase: RoomPhase;
  current_round: number;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  cash: number;
  created_at: string;
}

export interface Stock {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  dividend_amount: number;
  room_id: string;
  created_at: string;
}

export interface PlayerStock {
  id: string;
  player_id: string;
  stock_id: string;
  room_id: string;
  quantity: number;
  created_at: string;
}

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
  submitted_at: string;
  status: OrderStatus;
  created_at: string;
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
