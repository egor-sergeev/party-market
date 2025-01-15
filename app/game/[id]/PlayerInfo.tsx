"use client";

import { Player } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useCallback, useEffect, useState } from "react";

interface PlayerInfoProps {
  roomId: string;
}

export function PlayerInfo({ roomId }: PlayerInfoProps) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  const fetchPlayer = useCallback(async () => {
    try {
      const { data: player, error } = await supabase
        .from("players")
        .select()
        .eq("room_id", roomId)
        .eq("user_id", null) // TODO: get user id from session
        .single();

      if (error) throw error;
      setPlayer(player);
    } catch (error) {
      console.error("Error fetching player:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase]);

  useEffect(() => {
    fetchPlayer();

    const channel = supabase
      .channel(`player-info:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        fetchPlayer
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchPlayer]);

  if (isLoading) {
    return (
      <div className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-full items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Loading player info...
          </p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-full items-center justify-between">
          <p className="text-sm text-muted-foreground">Player not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-full items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{player.name}</h2>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-lg font-mono">${player.cash.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
