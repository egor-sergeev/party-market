import { INITIAL_PLAYER_CASH } from "@/lib/game-config";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { playerName, roomCode } = await request.json();

    if (!playerName?.trim()) {
      return NextResponse.json(
        { error: "Player name is required" },
        { status: 400 }
      );
    }

    if (!roomCode?.trim()) {
      return NextResponse.json(
        { error: "Room code is required" },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("code", roomCode.toUpperCase())
      .single();

    if (roomError?.code === "PGRST116") {
      return NextResponse.json(
        { error: `Room with code "${roomCode}" not found` },
        { status: 404 }
      );
    }

    if (roomError) {
      throw roomError;
    }

    if (room.status === "FINISHED") {
      return NextResponse.json(
        { error: "This game has already finished" },
        { status: 400 }
      );
    }

    if (room.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Cannot join a game that is already in progress" },
        { status: 400 }
      );
    }

    // Create new player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        name: playerName,
        cash: INITIAL_PLAYER_CASH,
      })
      .select()
      .single();

    if (playerError?.code === "23505") {
      return NextResponse.json(
        { error: "This name is already taken in the room" },
        { status: 400 }
      );
    }

    if (playerError) {
      throw playerError;
    }

    return NextResponse.json({ room, player });
  } catch (error) {
    console.error("Failed to join room:", error);
    return NextResponse.json(
      { error: "Something went wrong while joining the room" },
      { status: 500 }
    );
  }
}
