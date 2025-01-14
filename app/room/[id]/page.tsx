import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PlayersOverviewList } from "./PlayersOverviewList";

interface RoomPageProps {
  params: {
    id: string;
  };
}

export default async function RoomPage({ params: { id } }: RoomPageProps) {
  const supabase = createServerComponentClient({ cookies });
  const { data: room } = await supabase
    .from("rooms")
    .select("code")
    .eq("id", id)
    .single();

  if (!room) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="container border-b pb-4">
        <h1 className="text-2xl font-bold">Room Code: {room.code}</h1>
      </div>

      <div className="container grid grid-cols-12 gap-6">
        {/* Left panel - Players and QR code */}
        <div className="col-span-4 space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Players</h2>
            <PlayersOverviewList roomId={id} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Join Game</h2>
            {/* TODO: Add JoinQrCode component */}
          </section>
        </div>

        {/* Center panel - Game progress and stocks */}
        <div className="col-span-5 space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Game Progress</h2>
            {/* TODO: Add ProgressControl component */}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Stocks</h2>
            {/* TODO: Add StocksOverviewTable component */}
          </section>
        </div>

        {/* Right panel - Events and settings */}
        <div className="col-span-3 space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Current Event</h2>
            {/* TODO: Add Event component */}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Settings</h2>
            {/* TODO: Add RoomSettings component */}
          </section>
        </div>
      </div>
    </div>
  );
}
