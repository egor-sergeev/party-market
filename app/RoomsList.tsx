import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/auth";
import { Room } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { RoomItem } from "./RoomItem";

export function RoomsList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const { user, isLoading: isAuthLoading } = useUser();

  useEffect(() => {
    async function fetchRooms() {
      try {
        if (!user) return;

        const { data, error } = await supabase
          .from("rooms")
          .select()
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRooms(data || []);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!isAuthLoading) {
      fetchRooms();
    }
  }, [supabase, user, isAuthLoading]);

  if (isLoading || isAuthLoading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!rooms.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Your Created Rooms</h2>
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
