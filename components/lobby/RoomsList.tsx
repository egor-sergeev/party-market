"use client";

import { Button } from "@/components/ui/button";
import { supabase, type Room } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function RoomsList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();

    // Subscribe to lobby changes
    const roomsSubscription = supabase
      .channel("rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        fetchRooms
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsSubscription);
    };
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRooms(data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <div className="space-y-4">
      {rooms.length === 0 ? (
        <div className="text-gray-500">No active games</div>
      ) : (
        rooms.map((room) => (
          <div key={room.id} className="border p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Game #{room.id.slice(0, 8)}</div>
                <div className="text-sm text-gray-500">
                  Status: {room.status}
                  {room.status === "IN_PROGRESS" &&
                    ` (Round ${room.current_round})`}
                </div>
              </div>
              <Link href={`/lobby/${room.id}`}>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
