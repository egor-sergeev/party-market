import { generateEvent } from "@/lib/game/events";
import { DEFAULT_ROUNDS } from "@/lib/game-config";
import type { StockTemplate } from "@/lib/types/supabase";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { totalRounds } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Get active stock templates
    const { data: templates, error: templatesError } = await supabase
      .from("stock_templates")
      .select()
      .eq("is_active", true);

    if (templatesError) {
      console.error("Failed to fetch templates:", templatesError);
      throw templatesError;
    }

    if (!templates?.length) {
      console.error("No active stock templates found");
      return NextResponse.json(
        { error: "No active stock templates found" },
        { status: 400 }
      );
    }

    // Generate stocks for the room
    const stocks = templates.map((template: StockTemplate) => ({
      room_id: params.id,
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

    // Insert generated stocks
    const { error: stocksError } = await supabase.from("stocks").insert(stocks);

    if (stocksError) {
      console.error("Failed to insert stocks:", stocksError);
      throw stocksError;
    }

    // Update room status and total rounds
    const { error: roomError } = await supabase
      .from("rooms")
      .update({
        status: "IN_PROGRESS",
        current_phase: "submitting_orders",
        total_rounds: totalRounds || DEFAULT_ROUNDS,
      })
      .eq("id", params.id);

    if (roomError) {
      console.error("Failed to update room:", roomError);
      throw roomError;
    }

    // Generate first event
    await generateEvent(supabase, params.id, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to start game:", error);
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}
