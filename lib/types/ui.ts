import {
  type GameOrder,
  type GameStock,
  type OrderType,
  type RoomPhase,
} from "@/lib/types/game";
import {
  type Event,
  type Player,
  type PlayerStock,
  type Stock,
} from "@/lib/types/supabase";

// Shared types
export interface PlayerWithPortfolio {
  player: Player;
  stocks: (PlayerStock & { stock: GameStock })[];
  totalStockValue: number;
  totalWorth: number;
  orderStatus: "pending" | "submitted" | null;
}

export interface StockWithHolders extends Stock {
  holders: Array<{
    playerId: string;
    playerName: string;
  }>;
}

export interface OrderWithDetails extends GameOrder {
  playerName: string;
  playerInitials: string;
  stockName: string;
  stockSymbol: string;
}

// Player components props
export interface PlayerInfoProps {
  player: Player;
  cashDiff?: number;
  projectedCash?: number;
  gameStatus: "WAITING" | "IN_PROGRESS" | "FINISHED";
  currentPhase?: string;
  hasPendingOrder?: boolean;
}

export interface StockListProps {
  stocks: {
    stock: Stock;
    quantity: number;
  }[];
  playerCash: number;
  pendingOrders: {
    stockId: string;
    type: OrderType;
    quantity: number;
    id: string;
  }[];
  onSubmitOrder: (order: {
    stockId: string;
    type: OrderType;
    quantity: number;
  }) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
}

export interface StockOrderFormProps {
  stock: Stock;
  ownedQuantity: number;
  type: OrderType;
  playerCash: number;
  onCancel: () => void;
  onSubmit: (quantity: number) => Promise<void>;
}

export interface OrderHistoryProps {
  orders: OrderWithDetails[];
  className?: string;
}

export interface GameResultProps {
  place: number;
  totalPlayers: number;
}

// Lobby components props
export interface PlayerListProps {
  players: PlayerWithPortfolio[];
  className?: string;
}

export interface StockTableProps {
  stocks: StockWithHolders[];
  className?: string;
}

export interface EventsProps {
  events: Event[];
  stocks: Stock[];
}

export interface PhaseControlProps {
  phase: RoomPhase;
  onAdvance: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}
