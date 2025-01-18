import {
  MAX_INITIAL_DIVIDEND_AMOUNT,
  MAX_INITIAL_STOCK_PRICE,
  MIN_INITIAL_DIVIDEND_AMOUNT,
  MIN_INITIAL_STOCK_PRICE,
} from "@/lib/game-config";
import type { StockTemplate } from "@/lib/types/supabase";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get room settings
    const { data: roomSettings, error: settingsError } = await supabase
      .from("rooms")
      .select("initial_cash, number_of_stocks, total_rounds")
      .eq("id", params.id)
      .single();

    if (settingsError) {
      console.error("Failed to fetch room:", settingsError);
      throw settingsError;
    }

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
    const randomTemplates = templates
      .sort(() => Math.random() - 0.5)
      .slice(0, roomSettings.number_of_stocks);

    const stocks = randomTemplates.map((template: StockTemplate) => ({
      room_id: params.id,
      name: template.name,
      symbol: template.symbol,
      description: template.description,
      current_price: Math.floor(
        MIN_INITIAL_STOCK_PRICE +
          Math.random() * (MAX_INITIAL_STOCK_PRICE - MIN_INITIAL_STOCK_PRICE)
      ),
      dividend_amount: Math.floor(
        MIN_INITIAL_DIVIDEND_AMOUNT +
          Math.random() *
            (MAX_INITIAL_DIVIDEND_AMOUNT - MIN_INITIAL_DIVIDEND_AMOUNT)
      ),
    }));

    // Insert generated stocks
    const { error: stocksError } = await supabase.from("stocks").insert(stocks);

    if (stocksError) {
      console.error("Failed to insert stocks:", stocksError);
      throw stocksError;
    }

    // Initialize player cash
    const { error: playersError } = await supabase
      .from("players")
      .update({
        cash: roomSettings.initial_cash,
        previous_cash: roomSettings.initial_cash,
        previous_net_worth: roomSettings.initial_cash,
      })
      .eq("room_id", params.id);

    if (playersError) {
      console.error("Failed to initialize players:", playersError);
      throw playersError;
    }

    // Update room status and total rounds
    const { error: roomError } = await supabase
      .from("rooms")
      .update({
        status: "IN_PROGRESS",
        current_phase: "submitting_orders",
      })
      .eq("id", params.id);

    if (roomError) {
      console.error("Failed to update room:", roomError);
      throw roomError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to start game:", error);
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}
