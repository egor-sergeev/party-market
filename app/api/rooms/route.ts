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

    // Start a transaction by getting active stock templates
    const { data: templates, error: templatesError } = await supabase
      .from("stock_templates")
      .select()
      .eq("is_active", true)
      .limit(10);

    if (templatesError) throw templatesError;

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

    // Create stocks for the room based on templates
    const stocks = templates.map((template) => ({
      room_id: room.id,
      name: template.name,
      symbol: template.symbol,
      current_price: Math.floor(
        template.min_price +
          Math.random() * (template.max_price - template.min_price)
      ),
      dividend_amount: Math.floor(
        template.min_dividend +
          Math.random() * (template.max_dividend - template.min_dividend)
      ),
    }));

    const { error: stocksError } = await supabase.from("stocks").insert(stocks);

    if (stocksError) throw stocksError;

    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to create room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
