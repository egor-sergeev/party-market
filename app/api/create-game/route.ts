import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST() {
  // Create a new game row
  const { data: game, error } = await supabaseServer
    .from("games")
    .insert({ round: 0, phase: "LOBBY" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Optionally, insert some default stocks for this game
  const stocksToInsert = [
    { game_id: game.id, name: "Beer Factory", price: 100, dividend_yield: 5 },
    { game_id: game.id, name: "Karaoke Club", price: 120, dividend_yield: 3 },
  ];
  const { error: stocksError } = await supabaseServer.from("stocks").insert(stocksToInsert);
  if (stocksError) {
    return NextResponse.json({ error: stocksError.message }, { status: 400 });
  }

  return NextResponse.json({ game });
}
