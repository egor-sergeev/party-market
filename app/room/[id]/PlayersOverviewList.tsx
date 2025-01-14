"use client";

import { Room } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { PlayerOverviewItem } from "./PlayerOverviewItem";

interface PlayersOverviewListProps {
  roomId: string;
}

interface PlayerWithNetWorth {
  id: string;
  name: string;
  cash: number;
  net_worth: number;
  room_id: string;
}

export function PlayersOverviewList({ roomId }: PlayersOverviewListProps) {
  const [room, setRoom] = useState<Room>();
  const [players, setPlayers] = useState<PlayerWithNetWorth[]>([]);
  const [orders, setOrders] = useState<{ player_id: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  const fetchAndSetRoom = async (supabase: any, roomId: string) => {
    const roomResponse = await supabase
      .from("rooms")
      .select()
      .eq("id", roomId)
      .single();
    if (roomResponse.error) throw roomResponse.error;
    setRoom(roomResponse.data);
    console.log("Fetched room");
  };

  const fetchAndSetPlayers = async (supabase: any, roomId: string) => {
    const playersResponse = await supabase
      .from("players_with_net_worth")
      .select()
      .eq("room_id", roomId)
      .order("net_worth", { ascending: false })
      .order("created_at", { ascending: true });
    if (playersResponse.error) throw playersResponse.error;
    setPlayers(playersResponse.data);
    console.log("Fetched players");
  };

  const fetchAndSetPendingOrders = async (supabase: any, roomId: string) => {
    const ordersResponse = await supabase
      .from("orders")
      .select("player_id")
      .eq("room_id", roomId)
      .eq("status", "pending");
    if (ordersResponse.error) throw ordersResponse.error;
    setOrders(ordersResponse.data || []);
    console.log("Fetched orders");
  };

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        await Promise.all([
          fetchAndSetRoom(supabase, roomId),
          fetchAndSetPlayers(supabase, roomId),
          fetchAndSetPendingOrders(supabase, roomId),
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [roomId, supabase]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!room) return;

    const roomChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        async (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel(`players:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        async () => await fetchAndSetPlayers(supabase, roomId)
      )
      .subscribe();

    const playerStocksChannel = supabase
      .channel(`player_stocks:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_stocks",
          filter: `player_id.in.(${players.map((p) => p.id).join(",")})`,
        },
        async () => await fetchAndSetPlayers(supabase, roomId)
      )
      .subscribe();

    const stocksChannel = supabase
      .channel(`stocks:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "stocks",
        },
        async () => await fetchAndSetPlayers(supabase, roomId)
      )
      .subscribe();

    const ordersChannel = supabase
      .channel(`orders:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `room_id=eq.${roomId}`,
        },
        async () => await fetchAndSetPendingOrders(supabase, roomId)
      )
      .subscribe();

    return () => {
      roomChannel.unsubscribe();
      playersChannel.unsubscribe();
      playerStocksChannel.unsubscribe();
      stocksChannel.unsubscribe();
      ordersChannel.unsubscribe();
    };
  }, [roomId, supabase, room, players]);

  if (isLoading || !room) {
    return null;
  }

  return (
    <div className="space-y-2">
      {players.map((player, index) => (
        <PlayerOverviewItem
          key={player.id}
          name={player.name}
          position={index + 1}
          cash={player.cash}
          netWorth={player.net_worth}
          status={room.status}
          isOrderPhase={room.current_phase === "submitting_orders"}
          hasSubmittedOrder={orders?.some((o) => o.player_id === player.id)}
        />
      ))}
    </div>
  );
}
