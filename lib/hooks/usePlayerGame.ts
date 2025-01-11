"use client";

import {
  supabase,
  type Player,
  type PlayerStock,
  type Stock,
} from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

interface PlayerGameState {
  player: Player | null;
  playerStocks: (PlayerStock & { stock: Stock })[];
  allStocksWithQuantity: {
    stock: Stock;
    quantity: number;
  }[];
  pendingOrders: {
    stockId: string;
    type: "buy" | "sell";
    quantity: number;
    id: string;
  }[];
  projectedCash: number | null;
  cashDiff: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: PlayerGameState = {
  player: null,
  playerStocks: [],
  allStocksWithQuantity: [],
  pendingOrders: [],
  projectedCash: null,
  cashDiff: null,
  loading: true,
  error: null,
};

export function usePlayerGame(roomId: string, playerId: string) {
  const [state, setState] = useState<PlayerGameState>(initialState);

  // Calculate projected cash based on pending orders
  const calculateProjectedCash = useCallback(
    (
      currentCash: number,
      orders: PlayerGameState["pendingOrders"],
      stocks: PlayerGameState["allStocksWithQuantity"]
    ) => {
      return orders.reduce((cash, order) => {
        const stock = stocks.find((s) => s.stock.id === order.stockId)?.stock;
        if (!stock) return cash;

        const orderTotal = order.quantity * stock.current_price;
        return order.type === "buy" ? cash - orderTotal : cash + orderTotal;
      }, currentCash);
    },
    []
  );

  const fetchPlayerData = useCallback(async () => {
    if (!playerId) {
      setState(initialState);
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Fetch all data in parallel
      const [playerResult, playerStocksResult, allStocksResult, ordersResult] =
        await Promise.all([
          supabase.from("players").select().eq("id", playerId).single(),
          supabase
            .from("player_stocks")
            .select(`*, stock:stocks(*)`)
            .eq("player_id", playerId),
          supabase.from("stocks").select().eq("room_id", roomId),
          supabase
            .from("orders")
            .select()
            .eq("player_id", playerId)
            .eq("status", "pending"),
        ]);

      if (playerResult.error) throw playerResult.error;
      if (playerStocksResult.error) throw playerStocksResult.error;
      if (allStocksResult.error) throw allStocksResult.error;
      if (ordersResult.error) throw ordersResult.error;

      // Create a map of stock quantities owned by player
      const quantityByStockId = Object.fromEntries(
        (playerStocksResult.data || []).map((ps) => [ps.stock_id, ps.quantity])
      );

      // Merge all stocks with quantities
      const allStocksWithQuantity = allStocksResult.data.map((stock) => ({
        stock,
        quantity: quantityByStockId[stock.id] || 0,
      }));

      // Map orders to match our interface
      const mappedOrders = (ordersResult.data || []).map((order) => ({
        id: order.id,
        stockId: order.stock_id,
        type: order.type,
        quantity: order.requested_quantity,
      }));

      // Calculate projected cash
      const projectedCash = playerResult.data
        ? calculateProjectedCash(
            playerResult.data.cash,
            mappedOrders,
            allStocksWithQuantity
          )
        : null;

      setState((prev) => ({
        ...prev,
        player: playerResult.data,
        playerStocks: playerStocksResult.data || [],
        allStocksWithQuantity,
        pendingOrders: mappedOrders,
        projectedCash,
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching player data:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load player data",
      }));
    }
  }, [playerId, roomId]);

  const cancelOrder = useCallback(
    async (orderId: string) => {
      try {
        const { error } = await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId);

        if (error) throw error;

        // Refetch to update UI
        await fetchPlayerData();
      } catch (error) {
        console.error("Error cancelling order:", error);
        throw new Error("Failed to cancel order");
      }
    },
    [fetchPlayerData]
  );

  const submitOrder = useCallback(
    async (order: {
      stockId: string;
      type: "buy" | "sell";
      quantity: number;
    }) => {
      if (!state.player) return;
      if (state.pendingOrders.length > 0) {
        throw new Error("You already have a pending order");
      }

      try {
        const stockData = state.allStocksWithQuantity.find(
          (s) => s.stock.id === order.stockId
        );
        if (!stockData) throw new Error("Stock not found");

        const { error } = await supabase.from("orders").insert({
          room_id: roomId,
          player_id: playerId,
          stock_id: order.stockId,
          type: order.type,
          requested_quantity: order.quantity,
          requested_price_total: order.quantity * stockData.stock.current_price,
          status: "pending",
        });

        if (error) throw error;

        // Refetch to update UI
        await fetchPlayerData();
      } catch (error) {
        console.error("Error submitting order:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to submit order"
        );
      }
    },
    [
      roomId,
      playerId,
      state.player,
      state.allStocksWithQuantity,
      state.pendingOrders,
      fetchPlayerData,
    ]
  );

  useEffect(() => {
    fetchPlayerData();

    // Subscribe to player changes
    const subscription = supabase
      .channel(`player-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `id=eq.${playerId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const newPlayer = payload.new as Player;
            setState((prev) => ({
              ...prev,
              player: newPlayer,
              cashDiff: prev.player ? newPlayer.cash - prev.player.cash : null,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [playerId, fetchPlayerData]);

  return {
    ...state,
    submitOrder,
    cancelOrder,
    refetch: fetchPlayerData,
  };
}
