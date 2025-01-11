"use client";

import { Button } from "@/components/ui/button";
import { generateRoomCode, supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateRoomForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const code = generateRoomCode();
      console.log("Creating new room with code:", code);

      const { data, error } = await supabase
        .from("rooms")
        .insert({
          code,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Room created:", data);
      router.push(`/control-panel/room/${data.id}`);
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
