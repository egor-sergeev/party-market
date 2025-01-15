import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PlayerInfo } from "./PlayerInfo";

interface GamePageProps {
  params: {
    id: string;
  };
}

export default async function GamePage({ params: { id } }: GamePageProps) {
  const supabase = createServerComponentClient({ cookies });
  const { data: room } = await supabase
    .from("rooms")
    .select()
    .eq("id", id)
    .single();

  if (!room) {
    notFound();
  }

  return (
    <>
      <PlayerInfo roomId={id} />
      <div className="container space-y-6 py-6">
        {/* TODO: Add player's portfolio and order form */}
      </div>
    </>
  );
}
