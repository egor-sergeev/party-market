import { DEFAULT_ROUNDS } from "@/lib/game-config";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const roomCode = nanoid(6).toUpperCase();

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        code: roomCode,
        status: "WAITING",
        current_phase: "waiting",
        current_round: 1,
        total_rounds: DEFAULT_ROUNDS,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
