import { executeOrders, generateEvent, payDividends } from "@/lib/game";
import type { RoomPhase, RoomStatus } from "@/lib/types/supabase";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PHASE_ORDER: RoomPhase[] = [
  "generating_event",
  "submitting_orders",
  "executing_orders",
  "revealing_event",
  "paying_dividends",
];

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current room state
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("id", params.id)
      .single();

    if (roomError) throw roomError;

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Game is not in progress" },
        { status: 400 }
      );
    }

    // Get next phase
    const currentPhaseIndex = PHASE_ORDER.indexOf(room.current_phase);
    const nextPhase = PHASE_ORDER[(currentPhaseIndex + 1) % PHASE_ORDER.length];

    // Check if we need to increment round
    const isLastPhase = currentPhaseIndex === PHASE_ORDER.length - 1;
    const nextRound = isLastPhase ? room.current_round + 1 : room.current_round;

    // Check if game should end
    if (nextRound > room.total_rounds) {
      const { error: finishError } = await supabase
        .from("rooms")
        .update({
          status: "FINISHED",
          current_phase: "waiting",
        })
        .eq("id", params.id);

      if (finishError) throw finishError;

      return NextResponse.json({
        status: "FINISHED" as RoomStatus,
        phase: "waiting" as RoomPhase,
        round: room.current_round,
      });
    }

    // Phase-specific validations and handlers
    if (room.current_phase === "submitting_orders") {
      // Check if all players have submitted orders
      const { data: players } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", params.id);

      const { data: orders } = await supabase
        .from("orders")
        .select("player_id")
        .eq("room_id", params.id)
        .eq("status", "pending");

      const uniquePlayerOrders = new Set(orders?.map((o) => o.player_id));

      if (players?.length !== uniquePlayerOrders.size) {
        return NextResponse.json(
          { error: "Not all players have submitted their orders" },
          { status: 400 }
        );
      }
    } else if (room.current_phase === "executing_orders") {
      await executeOrders(supabase, params.id);
    } else if (room.current_phase === "paying_dividends") {
      await payDividends(supabase, params.id);
    } else if (room.current_phase === "generating_event") {
      await generateEvent(supabase, params.id);
    }

    // Update room state
    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        current_phase: nextPhase,
        current_round: nextRound,
      })
      .eq("id", params.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      status: "IN_PROGRESS" as RoomStatus,
      phase: nextPhase,
      round: nextRound,
    });
  } catch (error) {
    console.error("Failed to progress phase:", error);
    return NextResponse.json(
      { error: "Failed to progress to next phase" },
      { status: 500 }
    );
  }
}
