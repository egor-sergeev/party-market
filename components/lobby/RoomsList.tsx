"use client";

import { Button } from "@/components/ui/button";
import { type Room } from "@/lib/types/supabase";
import { supabase } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function RoomsList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from("rooms")
        .select()
        .eq("status", "WAITING");

      if (data) {
        setRooms(data);
      }
    };

    fetchRooms();

    const subscription = supabase
      .channel("rooms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
        },
        fetchRooms
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg border"
          >
            <div>
              <div className="font-medium">Room {room.code}</div>
              <div className="text-sm text-gray-500">Waiting for players</div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/lobby/${room.id}`)}
            >
              Join
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
