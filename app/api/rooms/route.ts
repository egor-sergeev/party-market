import { defaultSettings } from "@/lib/settings";
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

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const roomCode = generateRoomCode();
    const { settings } = await request.json();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        code: roomCode,
        status: "WAITING",
        current_phase: "waiting",
        current_round: 1,
        total_rounds: settings?.total_rounds || defaultSettings.total_rounds,
        initial_cash: settings?.initial_cash || defaultSettings.initial_cash,
        number_of_stocks:
          settings?.number_of_stocks || defaultSettings.number_of_stocks,
        events_tone: settings?.events_tone || defaultSettings.events_tone,
        events_language:
          settings?.events_language || defaultSettings.events_language,
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
