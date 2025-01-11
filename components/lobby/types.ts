import { type Player, type PlayerStock, type Stock } from "@/lib/supabase";

export type PlayerWithPortfolio = {
  player: Player;
  stocks: (PlayerStock & { stock: Stock })[];
  totalStockValue: number;
  totalWorth: number;
  orderStatus?: "pending" | "submitted" | null;
};

export type StockWithHolders = Stock & {
  holders: { playerId: string; playerName: string }[];
};
