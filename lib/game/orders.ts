import type { Order } from "@/lib/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { calculateNewStockPrice } from "./price";

interface OrderWithStock extends Order {
  stocks: {
    current_price: number;
    symbol: string;
  };
  players: {
    name: string;
  };
}

interface ExecutionResult {
  quantity: number;
  total: number;
}

async function getStockPrice(
  supabase: SupabaseClient,
  stockId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("stocks")
    .select("current_price")
    .eq("id", stockId)
    .single();

  if (error) throw error;
  return data.current_price;
}

async function executeOrder(
  supabase: SupabaseClient,
  order: OrderWithStock,
  roomId: string,
  totalStocksOwned: number
): Promise<void> {
  const currentPrice = await getStockPrice(supabase, order.stock_id);
  let result: ExecutionResult;

  if (order.type === "buy") {
    const affordableQuantity = Math.floor(
      order.requested_price_total / currentPrice
    );
    const actualQuantity = Math.min(
      affordableQuantity,
      order.requested_quantity
    );
    result = {
      quantity: actualQuantity,
      total: actualQuantity * currentPrice,
    };
  } else {
    const { data: holding } = await supabase
      .from("player_stocks")
      .select("quantity")
      .eq("user_id", order.user_id)
      .eq("stock_id", order.stock_id)
      .single();

    const actualQuantity = Math.min(
      holding?.quantity || 0,
      order.requested_quantity
    );
    result = {
      quantity: actualQuantity,
      total: actualQuantity * currentPrice,
    };
  }

  let updatedPrice = currentPrice;

  if (result.quantity > 0) {
    const quantityDelta =
      order.type === "buy" ? result.quantity : -result.quantity;
    const cashDelta = order.type === "buy" ? -result.total : result.total;
    updatedPrice = calculateNewStockPrice({
      currentPrice,
      orderQuantity: result.quantity,
      totalStocksOwned,
      isBuy: order.type === "buy",
    });

    const [
      { error: cashError },
      { error: ownedStockError },
      { error: stockUpdateError },
    ] = await Promise.all([
      supabase.rpc("update_player_cash", {
        p_user_id: order.user_id,
        amount: cashDelta,
      }),
      supabase.rpc("update_player_stocks", {
        p_user_id: order.user_id,
        p_stock_id: order.stock_id,
        p_room_id: roomId,
        p_quantity_delta: quantityDelta,
      }),
      supabase
        .from("stocks")
        .update({ current_price: updatedPrice })
        .eq("id", order.stock_id),
    ]);

    if (cashError) throw cashError;
    if (ownedStockError) throw ownedStockError;
    if (stockUpdateError) throw stockUpdateError;
  }

  await supabase
    .from("orders")
    .update({
      status: result.quantity > 0 ? "executed" : "failed",
      execution_quantity: result.quantity,
      execution_price_total: result.total,
      stock_price_before: currentPrice,
      stock_price_after: updatedPrice,
    })
    .eq("id", order.id);
}

export async function executeOrders(supabase: SupabaseClient, roomId: string) {
  // First, mark all skip orders as executed
  await supabase
    .from("orders")
    .update({ status: "executed" })
    .eq("room_id", roomId)
    .eq("status", "pending")
    .eq("type", "skip");

  // Then process buy/sell orders
  const { data: orders, error: ordersError } = (await supabase
    .from("orders")
    .select(
      `
      id,
      user_id,
      stock_id,
      type,
      requested_quantity,
      requested_price_total,
      status,
      stocks (
        current_price,
        symbol
      ),
      players!inner (
        name
      )
    `
    )
    .eq("room_id", roomId)
    .eq("status", "pending")
    .in("type", ["buy", "sell"])
    .order("created_at", { ascending: true })) as {
    data: OrderWithStock[] | null;
    error: any;
  };

  if (ordersError) throw ordersError;
  if (!orders?.length) return;

  const { data: holdings } = await supabase
    .from("player_stocks")
    .select("stock_id, quantity")
    .eq("room_id", roomId);

  const stocksOwned = holdings?.reduce(
    (
      acc: Record<string, number>,
      h: { stock_id: string; quantity: number }
    ) => {
      acc[h.stock_id] = (acc[h.stock_id] || 0) + h.quantity;
      return acc;
    },
    {}
  );

  for (const order of orders) {
    await executeOrder(
      supabase,
      order,
      roomId,
      stocksOwned?.[order.stock_id] || 0
    );
  }
}
