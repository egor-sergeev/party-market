"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/auth";
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
  const { user, isLoading: isAuthLoading } = useUser();

  const fetchPlayer = useCallback(async () => {
    try {
      if (!user) return;

      const { data: player, error } = await supabase
        .from("players")
        .select()
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setPlayer(player);
    } catch (error) {
      console.error("Error fetching player:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase, user]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchPlayer();
    }
  }, [isAuthLoading, fetchPlayer]);

  useEffect(() => {
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

  return (
    <div className="sticky top-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-full items-center justify-between">
        <div className="flex items-center gap-4">
          {isLoading || isAuthLoading ? (
            <Skeleton className="h-7 w-32" />
          ) : player ? (
            <h2 className="text-lg font-semibold">{player.name}</h2>
          ) : (
            <p className="text-sm text-muted-foreground">Player not found</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isLoading || isAuthLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : player ? (
            <p className="text-lg font-mono">${player.cash.toLocaleString()}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
