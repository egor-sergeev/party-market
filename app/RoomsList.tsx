import { Room } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { RoomItem } from "./RoomItem";

export function RoomsList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchRooms() {
      try {
        const storedIds = JSON.parse(
          localStorage.getItem("created_rooms") || "[]"
        );

        if (!storedIds.length) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("rooms")
          .select()
          .in("id", storedIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRooms(data || []);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRooms();
  }, [supabase]);

  if (isLoading) {
    return null;
  }

  if (!rooms.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Previously Created Rooms</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomItem
            key={room.id}
            id={room.id}
            code={room.code}
            status={room.status}
            createdAt={room.created_at}
          />
        ))}
      </div>
    </section>
  );
}
