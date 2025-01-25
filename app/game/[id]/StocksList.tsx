"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/auth";
import { RoomPhase, Stock } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ChevronRightIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { OrderDrawer } from "./OrderDrawer";

interface StockWithQuantity extends Stock {
  owned_quantity: number;
  total_worth: number;
  dividend: number;
}

interface StocksListProps {
  roomId: string;
}

export function StocksList({ roomId }: StocksListProps) {
  const [stocks, setStocks] = useState<StockWithQuantity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockWithQuantity | null>(
    null
  );
  const [pendingOrderStockIds, setPendingOrderStockIds] = useState<Set<string>>(
    new Set()
  );
  const [playerCash, setPlayerCash] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<RoomPhase | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const supabase = createClientComponentClient();
  const { user, isLoading: isAuthLoading } = useUser();

  const fetchStocks = useCallback(async () => {
    try {
      if (!user) return;

      // Get all stocks for the room with player's holdings
      const { data, error } = await supabase
        .from("stocks")
        .select(
          `
          id,
          name,
          symbol,
          current_price,
          dividend_amount,
          player_stocks!left (quantity)
        `
        )
        .eq("room_id", roomId)
        .eq("player_stocks.user_id", user.id);

      if (error) throw error;

      const [{ data: player }, { data: pendingOrders }, { data: room }] =
        await Promise.all([
          supabase
            .from("players")
            .select("cash")
            .eq("room_id", roomId)
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("orders")
            .select("stock_id")
            .eq("room_id", roomId)
            .eq("user_id", user.id)
            .eq("status", "pending"),
          supabase
            .from("rooms")
            .select("current_phase, current_round")
            .eq("id", roomId)
            .single(),
        ]);

      // Transform and sort stocks by total worth
      const transformedStocks = data.map((stock: any) => ({
        ...stock,
        owned_quantity: stock.player_stocks[0]?.quantity || 0,
        total_worth:
          (stock.player_stocks[0]?.quantity || 0) * stock.current_price,
      }));

      setStocks(
        transformedStocks.sort((a, b) => {
          if (a.total_worth > 0 !== b.total_worth > 0) {
            return b.total_worth > 0 ? 1 : -1;
          }
          return a.id - b.id;
        })
      );
      setPendingOrderStockIds(
        new Set(pendingOrders?.map((o) => o.stock_id) || [])
      );
      setPlayerCash(player?.cash || 0);
      setCurrentPhase(room?.current_phase || null);
      setCurrentRound(room?.current_round || 1);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase, user]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchStocks();
    }
  }, [isAuthLoading, fetchStocks]);

  useEffect(() => {
    const channel = supabase
      .channel(`stocks:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stocks",
          filter: `room_id=eq.${roomId}`,
        },
        fetchStocks
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_stocks",
          filter: `room_id=eq.${roomId}`,
        },
        fetchStocks
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `room_id=eq.${roomId}`,
        },
        fetchStocks
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        fetchStocks
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchStocks]);

  const canSubmitOrders = currentPhase === "submitting_orders";

  const handleSelectStock = (stock: StockWithQuantity) => {
    if (!canSubmitOrders || (!canBuyStock(stock) && !canSellStock(stock)))
      return;
    setSelectedStock(stock);
  };

  const canBuyStock = (stock: StockWithQuantity) => {
    return true; // Allow buy orders regardless of cash
  };

  const canSellStock = (stock: StockWithQuantity) => {
    return stock.owned_quantity > 0;
  };

  const handleCloseDrawer = () => {
    setSelectedStock(null);
  };

  const handleOrderSubmitted = () => {
    handleCloseDrawer();
    fetchStocks();
  };

  const handleCancelOrder = async (e: React.MouseEvent, stockId: string) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", user?.id)
        .eq("stock_id", stockId)
        .eq("status", "pending");

      if (error) throw error;
      fetchStocks();
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center p-3 pl-6 rounded-lg border bg-card text-card-foreground shadow-sm gap-6 text-left"
            >
              <div className="w-12 flex items-center justify-start">
                <Skeleton className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24 mt-1.5" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </>
      ) : (
        <>
          {stocks.map((stock) => (
            <button
              key={stock.id}
              className={cn(
                "flex items-center w-full py-3 px-4 rounded-lg border bg-card text-card-foreground shadow-sm text-left",
                "transition-colors hover:bg-accent/50",
                "active:bg-accent/50",
                pendingOrderStockIds.has(stock.id) &&
                  "active:bg-destructive/5 active:border-destructive/20",
                (!canSubmitOrders ||
                  (!canBuyStock(stock) && !canSellStock(stock))) &&
                  "opacity-50 cursor-not-allowed hover:bg-card active:bg-card"
              )}
              onClick={(e) => {
                if (pendingOrderStockIds.has(stock.id)) {
                  handleCancelOrder(e, stock.id);
                } else {
                  handleSelectStock(stock);
                }
              }}
              disabled={
                !canSubmitOrders ||
                (!canBuyStock(stock) && !canSellStock(stock))
              }
            >
              <div className="w-10 flex items-center justify-start text-2xl shrink-0">
                {stock.symbol}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{stock.name}</div>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span className="tabular-nums font-medium">
                    $ {stock.current_price}
                  </span>
                  {stock.dividend_amount > 0 && (
                    <span className="tabular-nums font-medium">
                      +${stock.dividend_amount}
                    </span>
                  )}
                  {stock.owned_quantity > 0 && (
                    <span className="tabular-nums font-medium">
                      {stock.owned_quantity} owned
                    </span>
                  )}
                </div>
              </div>

              {pendingOrderStockIds.has(stock.id) ? (
                <div className="shrink-0 flex items-center gap-2 text-sm text-destructive">
                  <span>Cancel</span>
                </div>
              ) : (
                canSubmitOrders && (
                  <ChevronRightIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                )
              )}
            </button>
          ))}
        </>
      )}

      <OrderDrawer
        stock={selectedStock}
        onClose={handleCloseDrawer}
        onSubmitted={handleOrderSubmitted}
        playerCash={playerCash}
        roomId={roomId}
        round={currentRound}
      />
    </div>
  );
}
