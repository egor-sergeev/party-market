import type { OrderType } from "@/lib/types/supabase";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { playerId, stockId, type, quantity, priceTotal } =
      await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Validate room is in submitting_orders phase
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("id", params.id)
      .single();

    if (roomError || room.current_phase !== "submitting_orders") {
      return NextResponse.json(
        { error: "Room not accepting orders" },
        { status: 400 }
      );
    }

    // Check if player already submitted an order this round
    const { data: existingOrders, error: ordersError } = await supabase
      .from("orders")
      .select()
      .eq("room_id", params.id)
      .eq("user_id", playerId)
      .eq("status", "pending");

    if (ordersError) throw ordersError;
    if (existingOrders.length > 0) {
      return NextResponse.json(
        { error: "Player already submitted an order this round" },
        { status: 400 }
      );
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        room_id: params.id,
        user_id: playerId,
        stock_id: stockId,
        type: type as OrderType,
        requested_quantity: quantity,
        requested_price_total: priceTotal,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) throw orderError;

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit order" },
      { status: 500 }
    );
  }
}
