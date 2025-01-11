import { supabase } from "@/lib/supabase";
import type { EventGenerationResult } from "./types";

// Mock events for testing
const MOCK_EVENTS = [
  {
    title: "Quantum Breakthrough!",
    description:
      "Quantum Potato Chips accidentally created a time-traveling potato, causing chaos in the snack industry. Meanwhile, Time Travel Insurance stock soars as people rush to protect their temporal assets.",
    effects: [
      {
        stock_name: "Quantum Potato Chips",
        price_change_percent: 75,
        yield_change: 1.5,
      },
      {
        stock_name: "Time Travel Insurance",
        price_change_percent: 45,
        yield_change: -1,
      },
    ],
  },
  {
    title: "Gaming Revolution Gone Wrong",
    description:
      "MemeQuest Gaming's new VR headset accidentally merged with Dream VR's metaverse, creating an army of virtual unicorns that invaded Unicorn Milk Farms' facilities.",
    effects: [
      {
        stock_name: "MemeQuest Gaming",
        price_change_percent: -30,
        yield_change: -1,
      },
      {
        stock_name: "Dream VR Solutions",
        price_change_percent: 60,
        yield_change: 2,
      },
      {
        stock_name: "Unicorn Milk Farms",
        price_change_percent: 25,
        yield_change: 1,
      },
    ],
  },
];

export async function generateEvent(
  roomId: string,
  isFirstEvent: boolean = false
): Promise<EventGenerationResult> {
  try {
    // Get player state to access stocks for ID mapping
    const { data: stocks, error: stocksError } = await supabase
      .from("stocks")
      .select("id, name")
      .eq("room_id", roomId);

    if (stocksError) throw stocksError;

    // Get current round
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("current_round")
      .eq("id", roomId)
      .single();

    if (roomError) throw roomError;

    // Pick a random mock event
    const mockEvent =
      MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];

    // Map stock names to IDs
    const stockNameToId = Object.fromEntries(stocks.map((s) => [s.name, s.id]));

    const effects = mockEvent.effects.map((effect) => ({
      stock_id: stockNameToId[effect.stock_name],
      price_change_percent: effect.price_change_percent,
      yield_change: effect.yield_change,
    }));

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        room_id: roomId,
        round: room.current_round,
        title: mockEvent.title,
        description: mockEvent.description,
        effects,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    return { success: true, event };
  } catch (error) {
    console.error("Error generating mock event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
