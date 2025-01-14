import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { playerId } = await request.json();

    if (!playerId?.trim()) {
      return NextResponse.json(
        { error: "Player ID is required" },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Check if player exists and belongs to the room
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select()
      .eq("id", playerId)
      .eq("room_id", params.id)
      .single();

    if (playerError?.code === "PGRST116") {
      return NextResponse.json(
        { error: "Player not found in this room" },
        { status: 404 }
      );
    }

    if (playerError) {
      throw playerError;
    }

    // Delete player's stocks
    const { error: stocksError } = await supabase
      .from("player_stocks")
      .delete()
      .eq("player_id", playerId)
      .eq("room_id", params.id);

    if (stocksError) {
      throw stocksError;
    }

    // Delete player's pending orders
    const { error: ordersError } = await supabase
      .from("orders")
      .delete()
      .eq("player_id", playerId)
      .eq("room_id", params.id)
      .eq("status", "pending");

    if (ordersError) {
      throw ordersError;
    }

    // Delete the player
    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId)
      .eq("room_id", params.id);

    if (deleteError) {
      throw deleteError;
    }

    // Check if this was the last player and the room is in WAITING status
    const { data: remainingPlayers, error: countError } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", params.id);

    if (countError) {
      throw countError;
    }

    if (remainingPlayers.length === 0) {
      // Delete the room if no players left and it hasn't started
      const { data: room } = await supabase
        .from("rooms")
        .select("status")
        .eq("id", params.id)
        .single();

      if (room?.status === "WAITING") {
        await supabase.from("rooms").delete().eq("id", params.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to leave room:", error);
    return NextResponse.json(
      { error: "Something went wrong while leaving the room" },
      { status: 500 }
    );
  }
}
