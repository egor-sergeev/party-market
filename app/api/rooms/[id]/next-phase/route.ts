import { payAllDividends } from "@/lib/game/dividends";
import { applyEventEffects, generateEvent } from "@/lib/game/events";
import { executeOrders } from "@/lib/game/orders";
import { getNextPhase, isLastPhase } from "@/lib/game/phases";
import type { RoomPhase, RoomStatus } from "@/lib/types/supabase";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

    const nextPhase = getNextPhase(room.current_phase);

    // Check if we need to increment round
    const shouldIncrementRound = isLastPhase(room.current_phase);
    const nextRound = shouldIncrementRound
      ? room.current_round + 1
      : room.current_round;

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

    // Store previous values when moving to the next round
    if (shouldIncrementRound) {
      const { error: updateStocksError } = await supabase.rpc(
        "update_stocks_previous_values",
        { p_room_id: params.id }
      );

      if (updateStocksError) throw updateStocksError;
    }

    // Phase-specific validations and handlers
    if (nextPhase === "revealing_event") {
      await applyEventEffects(supabase, params.id, room.current_round);
    } else if (nextPhase === "executing_orders") {
      // Initiate event generation for the next round
      if (nextRound < room.total_rounds)
        generateEvent(supabase, params.id, nextRound + 1, room.total_rounds);

      await executeOrders(supabase, params.id);
    } else if (nextPhase === "paying_dividends") {
      await payAllDividends(supabase, params.id);
    } else if (nextPhase === "submitting_orders") {
      // Do nothing besides updating the room state
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
