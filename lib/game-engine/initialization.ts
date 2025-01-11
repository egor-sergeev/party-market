import { supabase } from "@/lib/supabase";
import { generateEvent } from "./events";
import { initializeStocks } from "./stocks";

export async function initializeGame(roomId: string) {
  try {
    // Initialize stocks
    await initializeStocks(roomId);

    // Generate first event
    const eventResult = await generateEvent(roomId, true);
    if (!eventResult.success) {
      throw new Error(`Failed to generate first event: ${eventResult.error}`);
    }

    // Update lobby status
    const { error } = await supabase
      .from("rooms")
      .update({
        status: "IN_PROGRESS",
        current_round: 1,
        current_phase: "submitting_orders",
        round_end_time: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes for orders
      })
      .eq("id", roomId);

    if (error) throw error;
  } catch (error) {
    console.error("Error initializing player:", error);
    throw error;
  }
}
