import { DEFAULT_ROUNDS } from "@/lib/game-config";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function generateRoomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Excluding I and O to avoid confusion
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const roomCode = generateRoomCode();

    const { data: room, error: roomError } = await supabase
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

    if (roomError) throw roomError;

    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to create room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
