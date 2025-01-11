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
      })
      .eq("id", roomId);

    if (error) throw error;
  } catch (error) {
    console.error("Error initializing player:", error);
    throw error;
  }
}
