import { Order, Stock, supabase } from "@/lib/supabase";

// Calculate price change based on total stock ownership
function calculatePriceChange(
  quantity: number,
  currentPrice: number,
  totalStocksOwned: number
): number {
  // Using sigmoid-like function to ensure smooth price changes
  // Base multiplier decreases as more stocks are owned
  const baseMultiplier = 0.1; // 10% max change per order
  const dampingFactor = Math.max(1, Math.log(totalStocksOwned + Math.E));
  const changeMultiplier = baseMultiplier / dampingFactor;

  return currentPrice * quantity * changeMultiplier;
}

async function executeOrder(
  order: Order,
  stock: Stock,
  totalStocksOwned: number
): Promise<{
  executedQuantity: number;
  executedPriceTotal: number;
  newStockPrice: number;
}> {
  console.log(
    `Executing order: ${order.type} ${order.requested_quantity} ${order.requested_price_total} ${stock.symbol}`
  );
  if (order.type === "buy") {
    // Calculate maximum quantity that can be bought with requested price
    const maxQuantity = Math.floor(
      order.requested_price_total / stock.current_price
    );
    const executedQuantity = Math.min(maxQuantity, order.requested_quantity);

    if (executedQuantity > 0) {
      const priceChange = calculatePriceChange(
        executedQuantity,
        stock.current_price,
        totalStocksOwned
      );

      const newPrice = Math.round(stock.current_price + priceChange);
      const executedPriceTotal = executedQuantity * stock.current_price;
      console.log(
        `${stock.symbol} price updated: ${stock.current_price} -> ${newPrice}`
      );

      // Update stock price
      await supabase
        .from("stocks")
        .update({ current_price: newPrice })
        .eq("id", stock.id);

      return {
        executedQuantity,
        executedPriceTotal,
        newStockPrice: newPrice,
      };
    }
  } else {
    // Sell order - always execute at current price
    const executedQuantity = order.requested_quantity;
    const executedPriceTotal = executedQuantity * stock.current_price;

    const priceChange = calculatePriceChange(
      -executedQuantity,
      stock.current_price,
      totalStocksOwned
    );

    const newPrice = Math.round(stock.current_price + priceChange);
    console.log(
      `${stock.symbol} price updated: ${stock.current_price} -> ${newPrice}`
    );

    // Update stock price
    await supabase
      .from("stocks")
      .update({ current_price: newPrice })
      .eq("id", stock.id);

    return {
      executedQuantity,
      executedPriceTotal,
      newStockPrice: newPrice,
    };
  }

  return {
    executedQuantity: 0,
    executedPriceTotal: 0,
    newStockPrice: stock.current_price,
  };
}

export async function executeAllOrders(roomId: string) {
  // Get all pending orders ordered by creation time
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("room_id", roomId)
    .eq("status", "pending")
    .order("created_at");

  if (!orders) return;

  // Get all stocks and current ownership
  const { data: stocks } = await supabase
    .from("stocks")
    .select("*")
    .eq("room_id", roomId);

  const { data: playerStocks } = await supabase
    .from("player_stocks")
    .select("*")
    .eq("room_id", roomId);

  if (!stocks || !playerStocks) return;

  // Process each order sequentially
  for (const order of orders) {
    const stock = stocks.find((s) => s.id === order.stock_id);
    if (!stock) continue;

    // Calculate total stocks owned for this stock
    const totalStocksOwned = playerStocks
      .filter((ps) => ps.stock_id === stock.id)
      .reduce((sum, ps) => sum + ps.quantity, 0);

    const result = await executeOrder(order, stock, totalStocksOwned);

    // Update order with execution results
    await supabase
      .from("orders")
      .update({
        status: result.executedQuantity > 0 ? "executed" : "failed",
        execution_quantity: result.executedQuantity,
        execution_price_total: result.executedPriceTotal,
      })
      .eq("id", order.id);

    if (result.executedQuantity > 0) {
      // Update player stocks and cash
      const { data: player } = await supabase
        .from("players")
        .select("*")
        .eq("id", order.player_id)
        .single();

      if (!player) continue;

      // Update player cash
      await supabase
        .from("players")
        .update({
          cash:
            order.type === "buy"
              ? player.cash - result.executedPriceTotal
              : player.cash + result.executedPriceTotal,
        })
        .eq("id", player.id);

      // Update or create player stock entry
      const { data: existingPlayerStock } = await supabase
        .from("player_stocks")
        .select("*")
        .eq("player_id", player.id)
        .eq("stock_id", stock.id)
        .eq("room_id", roomId)
        .maybeSingle();

      if (existingPlayerStock) {
        await supabase
          .from("player_stocks")
          .update({
            quantity:
              order.type === "buy"
                ? existingPlayerStock.quantity + result.executedQuantity
                : existingPlayerStock.quantity - result.executedQuantity,
          })
          .eq("id", existingPlayerStock.id);
      } else if (order.type === "buy") {
        await supabase.from("player_stocks").insert({
          player_id: player.id,
          stock_id: stock.id,
          room_id: roomId,
          quantity: result.executedQuantity,
        });
      }
    }
  }
}
