import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EventCard } from "./EventCard";
import { OrdersHistory } from "./OrdersHistory";
import { PlayersOverviewList } from "./PlayersOverviewList";
import { ProgressControl } from "./ProgressControl";
import { RoomCode } from "./RoomCode";
import { StocksOverviewTable } from "./StocksOverviewTable";

export default async function RoomPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: room } = await supabase
    .from("rooms")
    .select()
    .eq("id", params.id)
    .single();

  if (!room) {
    redirect("/");
  }

  return (
    <div className="container py-8 space-y-8 min-h-screen pb-48">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <EventCard roomId={params.id} />
          <StocksOverviewTable roomId={params.id} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-medium">
              Round {room.current_round} / {room.total_rounds}
            </div>
            <RoomCode code={room.code} />
          </div>
          <PlayersOverviewList roomId={params.id} />
          <OrdersHistory roomId={params.id} />
        </div>
      </div>
      <ProgressControl roomId={params.id} />
    </div>
  );
}
