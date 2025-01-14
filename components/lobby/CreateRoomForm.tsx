"use client";

import { Button } from "@/components/ui/button";
import { generateRoomCode, supabase } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateRoomForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const code = generateRoomCode();

      const { data, error } = await supabase
        .from("rooms")
        .insert({
          code,
          status: "WAITING",
          current_phase: "waiting",
          current_round: 0,
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/lobby/${data.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create room"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleCreateRoom} disabled={isLoading}>
        {isLoading ? "Creating..." : "Create New Game"}
      </Button>
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
}
