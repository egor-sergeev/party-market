"use client";

import { Room } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SupabaseClient } from "@supabase/supabase-js";
import { memo, useCallback, useEffect, useState } from "react";
import { PlayerOverviewItem } from "./PlayerOverviewItem";

interface PlayerWithNetWorth {
  id: string;
  name: string;
  cash: number;
  net_worth: number;
  room_id: string;
}

interface GameState {
  room: Room | null;
  players: PlayerWithNetWorth[];
  pendingOrders: Set<string>;
}

function setupSubscriptions(
  supabase: SupabaseClient,
  roomId: string,
  onUpdate: () => void
) {
  return supabase
    .channel(`game:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "players",
        filter: `room_id=eq.${roomId}`,
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "player_stocks",
        filter: `room_id=eq.${roomId}`,
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "stocks",
        filter: `room_id=eq.${roomId}`,
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `room_id=eq.${roomId}`,
      },
      onUpdate
    )
    .subscribe();
}

function useGameState(roomId: string) {
  const [gameState, setGameState] = useState<GameState>({
    room: null,
    players: [],
    pendingOrders: new Set(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();

  const fetchData = useCallback(async () => {
    try {
      const [roomData, playersData, ordersData] = await Promise.all([
        supabase.from("rooms").select().eq("id", roomId).single(),
        supabase
          .from("players_with_net_worth")
          .select()
          .eq("room_id", roomId)
          .order("net_worth", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("orders")
          .select("player_id")
          .eq("room_id", roomId)
          .eq("status", "pending"),
      ]);

      if (roomData.error) throw roomData.error;
      if (playersData.error) throw playersData.error;
      if (ordersData.error) throw ordersData.error;

      setGameState({
        room: roomData.data,
        players: playersData.data,
        pendingOrders: new Set(ordersData.data?.map((o) => o.player_id)),
      });
      setError(null);
    } catch (error) {
      setError(error as Error);
      console.error("Error fetching game state:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase]);

  useEffect(() => {
    fetchData();
    const channel = setupSubscriptions(supabase, roomId, fetchData);
    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchData]);

  return { gameState, isLoading, error };
}

const PlayerListItem = memo(function PlayerListItem({
  player,
  position,
  room,
  hasSubmittedOrder,
}: {
  player: PlayerWithNetWorth;
  position: number;
  room: Room;
  hasSubmittedOrder: boolean;
}) {
  return (
    <PlayerOverviewItem
      key={player.id}
      name={player.name}
      position={position}
      cash={player.cash}
      netWorth={player.net_worth}
      status={room.status}
      isOrderPhase={room.current_phase === "submitting_orders"}
      hasSubmittedOrder={hasSubmittedOrder}
    />
  );
});

export function PlayersOverviewList({ roomId }: { roomId: string }) {
  const { gameState, isLoading, error } = useGameState(roomId);
  const { room, players, pendingOrders } = gameState;

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg">
        Failed to load players: {error.message}
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="space-y-2">
      {players.map((player, index) => (
        <PlayerListItem
          key={player.id}
          player={player}
          position={index + 1}
          room={room}
          hasSubmittedOrder={pendingOrders.has(player.id)}
        />
      ))}
    </div>
  );
}
