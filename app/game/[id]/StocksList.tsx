"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/auth";
import { Stock } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useCallback, useEffect, useState } from "react";
import { OrderDrawer } from "./OrderDrawer";

interface StockWithQuantity extends Stock {
  owned_quantity: number;
  total_worth: number;
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
  const [orderType, setOrderType] = useState<"buy" | "sell" | null>(null);
  const [hasPendingOrder, setHasPendingOrder] = useState(false);
  const [pendingOrderStockId, setPendingOrderStockId] = useState<string | null>(
    null
  );
  const [playerCash, setPlayerCash] = useState(0);
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
          player_stocks!left (quantity)
        `
        )
        .eq("room_id", roomId)
        .eq("player_stocks.user_id", user.id);

      if (error) throw error;

      // Get player's cash and pending orders
      const [{ data: player }, { data: pendingOrder }] = await Promise.all([
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
          .eq("status", "pending")
          .maybeSingle(),
      ]);

      // Transform and sort stocks by total worth
      const transformedStocks = data.map((stock: any) => ({
        ...stock,
        owned_quantity: stock.player_stocks[0]?.quantity || 0,
        total_worth:
          (stock.player_stocks[0]?.quantity || 0) * stock.current_price,
      }));

      setStocks(
        transformedStocks.sort((a, b) => b.total_worth - a.total_worth)
      );
      setHasPendingOrder(!!pendingOrder);
      setPendingOrderStockId(pendingOrder?.stock_id || null);
      setPlayerCash(player?.cash || 0);
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
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchStocks]);

  const handleOrder = (stock: StockWithQuantity, type: "buy" | "sell") => {
    setSelectedStock(stock);
    setOrderType(type);
  };

  const handleCloseDrawer = () => {
    setSelectedStock(null);
    setOrderType(null);
  };

  const handleOrderSubmitted = () => {
    handleCloseDrawer();
    fetchStocks();
  };

  const handleCancelOrder = async (stockId: string) => {
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
    <div className="space-y-4">
      {isLoading ? (
        <>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-24 mt-1" />
              </div>

              <div className="flex items-center gap-2">
                <div className="w-24 text-center">
                  <Skeleton className="h-5 w-12 mx-auto" />
                  <Skeleton className="h-3 w-8 mx-auto mt-1" />
                </div>

                <div className="flex gap-2">
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {stocks.map((stock) => (
            <div
              key={stock.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-mono font-medium">{stock.symbol}</h3>
                  <p className="text-sm text-muted-foreground">{stock.name}</p>
                </div>
                <p className="text-sm font-mono">
                  ${stock.current_price.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-24 text-center">
                  <p className="font-mono">{stock.owned_quantity}</p>
                  <p className="text-xs text-muted-foreground">owned</p>
                </div>

                {pendingOrderStockId === stock.id ? (
                  <Button
                    variant="outline"
                    onClick={() => handleCancelOrder(stock.id)}
                  >
                    Cancel Order
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOrder(stock, "buy")}
                      disabled={
                        hasPendingOrder || playerCash < stock.current_price
                      }
                    >
                      Buy
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleOrder(stock, "sell")}
                      disabled={hasPendingOrder || stock.owned_quantity === 0}
                    >
                      Sell
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      <OrderDrawer
        stock={selectedStock}
        type={orderType}
        roomId={roomId}
        onClose={handleCloseDrawer}
        onSubmitted={handleOrderSubmitted}
      />
    </div>
  );
}
