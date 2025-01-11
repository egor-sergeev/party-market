"use client";

import {
  type PlayerWithPortfolio,
  type StockWithHolders,
} from "@/components/control-panel/types";
import { supabase, type Event, type Player, type Room } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersWithPortfolio, setPlayersWithPortfolio] = useState<
    PlayerWithPortfolio[]
  >([]);
  const [stocks, setStocks] = useState<StockWithHolders[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoomAndPlayers = useCallback(async () => {
    try {
      // Get room and players
      const [roomResult, playersResult] = await Promise.all([
        supabase.from("rooms").select().eq("id", roomId).single(),
        supabase
          .from("players")
          .select()
          .eq("room_id", roomId)
          .order("created_at", { ascending: true }),
      ]);

      if (roomResult.error) throw roomResult.error;
      if (playersResult.error) throw playersResult.error;

      setRoom(roomResult.data);
      setPlayers(playersResult.data);

      // If game is in progress, fetch additional data
      if (roomResult.data.status === "IN_PROGRESS") {
        // Fetch stocks
        const { data: stocksData, error: stocksError } = await supabase
          .from("stocks")
          .select()
          .eq("room_id", roomId);

        if (stocksError) throw stocksError;

        // Fetch player stocks with stock details
        const { data: playerStocks, error: playerStocksError } = await supabase
          .from("player_stocks")
          .select(
            `
            *,
            stock:stocks (*)
          `
          )
          .in(
            "player_id",
            playersResult.data.map((p) => p.id)
          );

        if (playerStocksError) throw playerStocksError;

        // Fetch current event
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select()
          .eq("room_id", roomId)
          .eq("round", roomResult.data.current_round)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Ignore if no event found
        if (eventError && eventError.code !== "PGRST116") throw eventError;

        // Fetch orders for current round
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select()
          .eq("room_id", roomId)
          .eq("status", "pending");

        if (ordersError) throw ordersError;

        // Transform player data
        const portfolios = playersResult.data.map((player) => {
          const playerStocksList =
            playerStocks?.filter((ps) => ps.player_id === player.id) || [];

          const totalStockValue = playerStocksList.reduce(
            (sum, ps) => sum + ps.quantity * ps.stock.current_price,
            0
          );

          const order = orders?.find((o) => o.player_id === player.id);

          return {
            player,
            stocks: playerStocksList,
            totalStockValue,
            totalWorth: player.cash + totalStockValue,
            orderStatus: order ? ("submitted" as const) : null,
          };
        });

        // Transform stocks data
        const stocksWithHolders = stocksData.map((stock) => {
          const holders =
            playerStocks
              ?.filter((ps) => ps.stock_id === stock.id && ps.quantity > 0)
              .map((ps) => ({
                playerId: ps.player_id,
                playerName:
                  playersResult.data.find((p) => p.id === ps.player_id)?.name ||
                  "",
              })) || [];

          return {
            ...stock,
            holders,
          };
        });

        setPlayersWithPortfolio(portfolios);
        setStocks(stocksWithHolders);
        setCurrentEvent(eventData || null);
      }
    } catch (error) {
      console.error("Error fetching room data:", error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomAndPlayers();

    // Subscribe to room changes
    const roomSubscription = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(payload.new as Room);
          fetchRoomAndPlayers(); // Refetch all data when room updates
        }
      )
      .subscribe();

    // Subscribe to player changes
    const playersSubscription = supabase
      .channel(`room-${roomId}-players`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        fetchRoomAndPlayers
      )
      .subscribe();

    // Subscribe to stock changes
    const stocksSubscription = supabase
      .channel(`room-${roomId}-stocks`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stocks",
          filter: `room_id=eq.${roomId}`,
        },
        fetchRoomAndPlayers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomSubscription);
      supabase.removeChannel(playersSubscription);
      supabase.removeChannel(stocksSubscription);
    };
  }, [roomId, fetchRoomAndPlayers]);

  return {
    room,
    players,
    playersWithPortfolio,
    stocks,
    currentEvent,
    loading,
    refetch: fetchRoomAndPlayers,
  };
}
