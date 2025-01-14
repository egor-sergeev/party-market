"use client";

import {
  type GameOrder,
  type GameStock,
  type PlayerStock,
} from "@/lib/types/game";
import { type Player } from "@/lib/types/supabase";
import { supabase } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

interface PlayerGameState {
  loading: boolean;
  error: string | null;
  player: Player | null;
  playerStocks: PlayerStock[];
  allStocksWithQuantity: Array<{
    stock: GameStock;
    quantity: number;
  }>;
  pendingOrders: Array<{
    id: string;
    stockId: string;
    type: "buy" | "sell";
    quantity: number;
  }>;
  cashDiff: number | null;
  projectedCash: number | null;
  orders: GameOrder[];
  players: Player[];
  stocks: GameStock[];
}

export function usePlayerGame(roomId: string, playerId: string) {
  const [state, setState] = useState<PlayerGameState>({
    loading: true,
    error: null,
    player: null,
    playerStocks: [],
    allStocksWithQuantity: [],
    pendingOrders: [],
    cashDiff: null,
    projectedCash: null,
    orders: [],
    players: [],
    stocks: [],
  });

  const fetchPlayerData = useCallback(async () => {
    if (!playerId) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const [
        { data: player },
        { data: playerStocks },
        { data: allStocks },
        { data: pendingOrders },
        { data: executedOrders },
        { data: allPlayers },
      ] = await Promise.all([
        supabase.from("players").select("*").eq("id", playerId).single(),
        supabase
          .from("player_stocks")
          .select("*")
          .eq("player_id", playerId)
          .eq("room_id", roomId),
        supabase.from("stocks").select("*").eq("room_id", roomId),
        supabase
          .from("orders")
          .select("*")
          .eq("player_id", playerId)
          .eq("room_id", roomId)
          .eq("status", "pending"),
        supabase
          .from("orders")
          .select("*")
          .eq("room_id", roomId)
          .in("status", ["executed", "failed"])
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("players").select("*").eq("room_id", roomId),
      ]);

      if (
        !player ||
        !playerStocks ||
        !allStocks ||
        !pendingOrders ||
        !allPlayers
      ) {
        throw new Error("Failed to load player data");
      }

      // Calculate cash difference from last round
      const lastRoundOrders =
        executedOrders?.filter((o: GameOrder) => o.player_id === playerId) ||
        [];
      const cashDiff = lastRoundOrders.reduce(
        (sum: number, order: GameOrder) => {
          if (order.type === "buy") {
            return sum - (order.execution_price_total || 0);
          } else {
            return sum + (order.execution_price_total || 0);
          }
        },
        0
      );

      // Calculate projected cash based on pending orders
      const projectedCash = pendingOrders.reduce(
        (cash: number, order: GameOrder) => {
          if (order.type === "buy") {
            return cash - order.requested_price_total;
          } else {
            return cash + order.requested_price_total;
          }
        },
        player.cash
      );

      setState({
        loading: false,
        error: null,
        player,
        playerStocks,
        allStocksWithQuantity: allStocks.map((stock) => ({
          stock,
          quantity:
            playerStocks.find((ps) => ps.stock_id === stock.id)?.quantity || 0,
        })),
        pendingOrders: pendingOrders.map((order: GameOrder) => ({
          id: order.id,
          stockId: order.stock_id,
          type: order.type,
          quantity: order.requested_quantity,
        })),
        cashDiff,
        projectedCash,
        orders: executedOrders || [],
        players: allPlayers,
        stocks: allStocks,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load player data",
      }));
    }
  }, [playerId, roomId]);

  const submitOrder = useCallback(
    async (payload: {
      stockId: string;
      type: "buy" | "sell";
      quantity: number;
    }) => {
      if (!state.player) return;

      try {
        const stock = state.stocks.find((s) => s.id === payload.stockId);
        if (!stock) throw new Error("Stock not found");

        const requestedPriceTotal = payload.quantity * stock.current_price;

        await supabase.from("orders").insert({
          player_id: state.player.id,
          room_id: roomId,
          stock_id: payload.stockId,
          type: payload.type,
          requested_quantity: payload.quantity,
          requested_price_total: requestedPriceTotal,
          status: "pending",
        });

        await fetchPlayerData();
      } catch (error) {
        console.error("Error submitting order:", error);
      }
    },
    [state.player, state.stocks, roomId, fetchPlayerData]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      try {
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId);

        await fetchPlayerData();
      } catch (error) {
        console.error("Error cancelling order:", error);
      }
    },
    [fetchPlayerData]
  );

  useEffect(() => {
    fetchPlayerData();

    // Set up subscriptions
    const subscriptions = [
      // Stock changes
      supabase
        .channel(`room-${roomId}-stocks`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "stocks",
            filter: `room_id=eq.${roomId}`,
          },
          fetchPlayerData
        )
        .subscribe(),

      // Player stock changes
      supabase
        .channel(`room-${roomId}-player-stocks`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "player_stocks",
            filter: `room_id=eq.${roomId}`,
          },
          fetchPlayerData
        )
        .subscribe(),

      // Order changes
      supabase
        .channel(`room-${roomId}-orders`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `room_id=eq.${roomId}`,
          },
          fetchPlayerData
        )
        .subscribe(),
    ];

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach((subscription) => {
        supabase.removeChannel(subscription);
      });
    };
  }, [fetchPlayerData, roomId]);

  return {
    ...state,
    submitOrder,
    cancelOrder,
    refetch: fetchPlayerData,
  };
}
