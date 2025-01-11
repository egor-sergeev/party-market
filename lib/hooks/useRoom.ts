"use client";

import {
  type PlayerWithPortfolio,
  type StockWithHolders,
} from "@/components/lobby/types";
import {
  supabase,
  type Event,
  type Order,
  type Player,
  type PlayerStock,
  type Room,
  type Stock,
} from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

// Types for internal hook state
interface RoomState {
  room: Room | null;
  players: Player[];
  playersWithPortfolio: PlayerWithPortfolio[];
  stocks: StockWithHolders[];
  currentEvent: Event | null;
  loading: boolean;
}

// Initial state
const initialState: RoomState = {
  room: null,
  players: [],
  playersWithPortfolio: [],
  stocks: [],
  currentEvent: null,
  loading: true,
};

export function useRoom(roomId: string) {
  const [state, setState] = useState<RoomState>(initialState);

  // Fetch basic lobby data
  const fetchRoomData = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select()
      .eq("id", roomId)
      .single();

    if (error) throw error;
    return data;
  };

  // Fetch players in the lobby
  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select()
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  };

  // Fetch stocks in the lobby
  const fetchStocks = async () => {
    const { data, error } = await supabase
      .from("stocks")
      .select()
      .eq("room_id", roomId);

    if (error) throw error;
    return data;
  };

  // Fetch player stocks with related stock data
  const fetchPlayerStocks = async (playerIds: string[]) => {
    const { data, error } = await supabase
      .from("player_stocks")
      .select(`*, stock:stocks(*)`)
      .in("player_id", playerIds);

    if (error) throw error;
    return data as (PlayerStock & { stock: Stock })[];
  };

  // Fetch current event
  const fetchCurrentEvent = async (currentRound: number) => {
    const { data, error } = await supabase
      .from("events")
      .select()
      .eq("room_id", roomId)
      .eq("round", currentRound)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  // Fetch pending orders
  const fetchPendingOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select()
      .eq("room_id", roomId)
      .eq("status", "pending");

    if (error) throw error;
    return data;
  };

  // Transform data into player portfolios
  const createPlayerPortfolios = (
    players: Player[],
    playerStocks: (PlayerStock & { stock: Stock })[],
    orders: Order[]
  ): PlayerWithPortfolio[] => {
    return players.map((player) => {
      const playerStocksList = playerStocks.filter(
        (ps) => ps.player_id === player.id
      );

      const totalStockValue = playerStocksList.reduce(
        (sum, ps) => sum + ps.quantity * ps.stock.current_price,
        0
      );

      const order = orders.find((o) => o.player_id === player.id);

      return {
        player,
        stocks: playerStocksList,
        totalStockValue,
        totalWorth: player.cash + totalStockValue,
        orderStatus: order ? ("submitted" as const) : null,
      };
    });
  };

  // Transform data into stocks with holders
  const createStocksWithHolders = (
    stocks: Stock[],
    playerStocks: (PlayerStock & { stock: Stock })[],
    players: Player[]
  ): StockWithHolders[] => {
    return stocks.map((stock) => {
      const holders = playerStocks
        .filter((ps) => ps.stock_id === stock.id && ps.quantity > 0)
        .map((ps) => ({
          playerId: ps.player_id,
          playerName: players.find((p) => p.id === ps.player_id)?.name || "",
        }));

      return { ...stock, holders };
    });
  };

  // Main fetch function
  const fetchAllData = useCallback(async () => {
    try {
      // Fetch basic lobby data and players first
      const [room, players] = await Promise.all([
        fetchRoomData(),
        fetchPlayers(),
      ]);

      // Update state with initial data
      setState((prev) => ({
        ...prev,
        room,
        players,
        loading: room.status === "IN_PROGRESS",
      }));

      // If player is in progress, fetch additional data
      if (room.status === "IN_PROGRESS") {
        const [stocks, playerStocks, currentEvent, orders] = await Promise.all([
          fetchStocks(),
          fetchPlayerStocks(players.map((p) => p.id)),
          fetchCurrentEvent(room.current_round),
          fetchPendingOrders(),
        ]);

        // Transform data
        const playersWithPortfolio = createPlayerPortfolios(
          players,
          playerStocks,
          orders
        );
        const stocksWithHolders = createStocksWithHolders(
          stocks,
          playerStocks,
          players
        );

        // Update state with player data
        setState((prev) => ({
          ...prev,
          playersWithPortfolio,
          stocks: stocksWithHolders,
          currentEvent,
          loading: false,
        }));
      }
    } catch (error) {
      console.error("Error fetching lobby data:", error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [roomId]);

  useEffect(() => {
    fetchAllData();

    // Set up subscriptions
    const subscriptions = [
      // Room changes
      supabase
        .channel(`room-${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${roomId}`,
          },
          fetchAllData
        )
        .subscribe(),

      // Player changes
      supabase
        .channel(`room-${roomId}-players`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${roomId}`,
          },
          fetchAllData
        )
        .subscribe(),

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
          fetchAllData
        )
        .subscribe(),
    ];

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach((subscription) => {
        supabase.removeChannel(subscription);
      });
    };
  }, [roomId, fetchAllData]);

  return {
    ...state,
    refetch: fetchAllData,
  };
}
