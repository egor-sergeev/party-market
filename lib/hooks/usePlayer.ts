"use client";

import { supabase, type Player } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function usePlayer(roomId: string) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPlayer = useCallback(async () => {
    try {
      const playerName = localStorage.getItem(`game-${roomId}-player-name`);
      if (!playerName) {
        router.push("/join");
        return;
      }

      const { data, error } = await supabase
        .from("players")
        .select()
        .eq("room_id", roomId)
        .eq("name", playerName)
        .single();

      if (error) {
        router.push("/join");
        return;
      }

      setPlayer(data);
    } catch (error) {
      console.error("Error fetching player data:", error);
      router.push("/join");
    } finally {
      setLoading(false);
    }
  }, [roomId, router]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  return { player, loading, refetch: fetchPlayer };
}
