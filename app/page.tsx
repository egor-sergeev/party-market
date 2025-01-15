"use client";

import { Button } from "@/components/ui/button";
import { createRoom } from "@/lib/rooms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RoomsList } from "./RoomsList";

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateRoom() {
    try {
      setIsCreating(true);
      const room = await createRoom();
      router.push(`/room/${room.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
      setIsCreating(false);
    }
  }

  return (
    <main className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">Party Market</h1>

      <div className="flex gap-4">
        <Button onClick={handleCreateRoom} disabled={isCreating}>
          {isCreating ? "Creating..." : "Create New Room"}
        </Button>
        <Link href="/join">
          <Button variant="outline">Join Room</Button>
        </Link>
      </div>

      <RoomsList />
    </main>
  );
}
