"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INITIAL_PLAYER_CASH } from "@/lib/game-config";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinGameForm() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Check if lobby exists and is in waiting state
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select()
        .eq("code", roomCode.toUpperCase())
        .single();

      if (roomError || !room) {
        throw new Error("Game not found");
      }

      if (room.status !== "WAITING") {
        throw new Error("Game has already started");
      }

      // Check if name is already taken in this lobby
      const { data: existingPlayer, error: playerError } = await supabase
        .from("players")
        .select()
        .eq("room_id", room.id)
        .eq("name", name)
        .single();

      if (existingPlayer) {
        throw new Error("Name already taken in this player");
      }

      // Create player
      const { data: player, error: createError } = await supabase
        .from("players")
        .insert({
          room_id: room.id,
          name,
          cash: INITIAL_PLAYER_CASH,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Store player name in localStorage
      localStorage.setItem(`game-${room.id}-player-name`, name);

      // Redirect to player
      router.push(`/game/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join player");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={20}
        />
      </div>

      <div>
        <Input
          type="text"
          placeholder="Room Code (4 letters)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          required
          minLength={4}
          maxLength={4}
          className="font-mono uppercase"
        />
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Joining..." : "Join Game"}
      </Button>
    </form>
  );
}
