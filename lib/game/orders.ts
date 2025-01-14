import type { Order } from "@/lib/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { calculateNewStockPrice } from "./price";

interface OrderWithStock extends Order {
  stocks: {
    current_price: number;
  };
}

export async function executeOrders(supabase: SupabaseClient, roomId: string) {
  // Get all pending orders with related stock data
  const { data: orders, error: ordersError } = (await supabase
    .from("orders")
    .select(
      `
      id,
      player_id,
      stock_id,
      type,
      requested_quantity,
      requested_price_total,
      status,
      stocks (
        current_price
      )
    `
    )
    .eq("room_id", roomId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })) as {
    data: OrderWithStock[] | null;
    error: any;
  };

  if (ordersError) throw ordersError;

  // Get all current holdings for the room's stocks
  const { data: holdings, error: holdingsError } = await supabase
    .from("player_stocks")
    .select("stock_id, quantity")
    .eq("room_id", roomId);

  if (holdingsError) throw holdingsError;

  // Calculate total stocks owned per stock
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

  // Execute each order sequentially
  for (const order of orders || []) {
    const currentPrice = order.stocks.current_price;
    const totalStocksOwned = stocksOwned?.[order.stock_id] || 0;

    if (order.type === "buy") {
      const affordableQuantity = Math.floor(
        order.requested_price_total / currentPrice
      );
      const executionQuantity = Math.min(
        affordableQuantity,
        order.requested_quantity
      );
      const executionTotal = executionQuantity * currentPrice;

      if (executionQuantity > 0) {
        // Update player's cash and stock holding in one query
        const { data: existingHolding } = await supabase
          .from("player_stocks")
          .select("id, quantity")
          .eq("player_id", order.player_id)
          .eq("stock_id", order.stock_id)
          .single();

        // Update cash and holdings
        await Promise.all([
          supabase
            .from("players")
            .update({ cash: supabase.sql`cash - ${executionTotal}` })
            .eq("id", order.player_id),
          existingHolding
            ? supabase
                .from("player_stocks")
                .update({
                  quantity: existingHolding.quantity + executionQuantity,
                })
                .eq("id", existingHolding.id)
            : supabase.from("player_stocks").insert({
                player_id: order.player_id,
                stock_id: order.stock_id,
                room_id: roomId,
                quantity: executionQuantity,
              }),
        ]);

        // Update stock price
        const newPrice = calculateNewStockPrice({
          currentPrice,
          orderQuantity: executionQuantity,
          totalStocksOwned,
          isBuy: true,
        });

        await supabase
          .from("stocks")
          .update({ current_price: newPrice })
          .eq("id", order.stock_id);

        // Update total stocks owned for future calculations
        stocksOwned[order.stock_id] = totalStocksOwned + executionQuantity;
      }

      // Update order status
      await supabase
        .from("orders")
        .update({
          status: executionQuantity > 0 ? "executed" : "failed",
          execution_quantity: executionQuantity,
          execution_price_total: executionTotal,
        })
        .eq("id", order.id);
    } else {
      // Sell order
      const { data: holding } = await supabase
        .from("player_stocks")
        .select("quantity")
        .eq("player_id", order.player_id)
        .eq("stock_id", order.stock_id)
        .single();

      if (holding) {
        const executionQuantity = Math.min(
          holding.quantity,
          order.requested_quantity
        );
        const executionTotal = executionQuantity * currentPrice;

        if (executionQuantity > 0) {
          // Update cash, holdings, and stock price in parallel
          await Promise.all([
            supabase
              .from("players")
              .update({ cash: supabase.sql`cash + ${executionTotal}` })
              .eq("id", order.player_id),
            supabase
              .from("player_stocks")
              .update({ quantity: holding.quantity - executionQuantity })
              .eq("player_id", order.player_id)
              .eq("stock_id", order.stock_id),
            supabase
              .from("stocks")
              .update({
                current_price: calculateNewStockPrice({
                  currentPrice,
                  orderQuantity: executionQuantity,
                  totalStocksOwned,
                  isBuy: false,
                }),
              })
              .eq("id", order.stock_id),
          ]);

          // Update total stocks owned for future calculations
          stocksOwned[order.stock_id] = totalStocksOwned - executionQuantity;
        }

        // Update order status
        await supabase
          .from("orders")
          .update({
            status: executionQuantity > 0 ? "executed" : "failed",
            execution_quantity: executionQuantity,
            execution_price_total: executionTotal,
          })
          .eq("id", order.id);
      }
    }
  }
}
