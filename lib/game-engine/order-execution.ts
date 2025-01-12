import { Order, Stock, supabase } from "@/lib/supabase";

interface OrderExecutionResult {
  executedQuantity: number;
  executedPriceTotal: number;
  newStockPrice: number;
}

interface StockState {
  stock: Stock;
  totalStocksOwned: number;
}

// Calculate price change using a sigmoid-like function for smooth changes
function calculatePriceChange(params: {
  quantity: number;
  currentPrice: number;
  totalStocksOwned: number;
}): number {
  const { quantity, currentPrice, totalStocksOwned } = params;
  const baseMultiplier = 0.1; // 10% max change per order
  const dampingFactor = Math.max(1, Math.log(totalStocksOwned + Math.E));
  const changeMultiplier = baseMultiplier / dampingFactor;

  return Math.round(currentPrice * quantity * changeMultiplier);
}

async function executeBuyOrder(
  order: Order,
  stockState: StockState
): Promise<OrderExecutionResult> {
  const maxQuantity = Math.floor(
    order.requested_price_total / stockState.stock.current_price
  );
  const executedQuantity = Math.min(maxQuantity, order.requested_quantity);

  if (executedQuantity === 0) {
    return {
      executedQuantity: 0,
      executedPriceTotal: 0,
      newStockPrice: stockState.stock.current_price,
    };
  }

  const priceChange = calculatePriceChange({
    quantity: executedQuantity,
    currentPrice: stockState.stock.current_price,
    totalStocksOwned: stockState.totalStocksOwned,
  });

  return {
    executedQuantity,
    executedPriceTotal: executedQuantity * stockState.stock.current_price,
    newStockPrice: stockState.stock.current_price + priceChange,
  };
}

async function executeSellOrder(
  order: Order,
  stockState: StockState
): Promise<OrderExecutionResult> {
  const executedQuantity = order.requested_quantity;
  const executedPriceTotal = executedQuantity * stockState.stock.current_price;

  const priceChange = calculatePriceChange({
    quantity: -executedQuantity,
    currentPrice: stockState.stock.current_price,
    totalStocksOwned: stockState.totalStocksOwned,
  });

  return {
    executedQuantity,
    executedPriceTotal,
    newStockPrice: stockState.stock.current_price + priceChange,
  };
}

// Update player's cash and stock holdings after order execution
async function updatePlayerPosition(params: {
  playerId: string;
  stockId: string;
  roomId: string;
  executedQuantity: number;
  executedPriceTotal: number;
  orderType: "buy" | "sell";
}) {
  const {
    playerId,
    stockId,
    roomId,
    executedQuantity,
    executedPriceTotal,
    orderType,
  } = params;

  // Get player's current cash and stock position in a single query
  const [{ data: player }, { data: playerStock }] = await Promise.all([
    supabase.from("players").select("*").eq("id", playerId).single(),
    supabase
      .from("player_stocks")
      .select("*")
      .eq("player_id", playerId)
      .eq("stock_id", stockId)
      .eq("room_id", roomId)
      .maybeSingle(),
  ]);

  if (!player) return;

  // Update player's cash
  const newCash =
    orderType === "buy"
      ? player.cash - executedPriceTotal
      : player.cash + executedPriceTotal;

  // Prepare stock position update
  let stockUpdate;
  if (playerStock) {
    const newQuantity =
      orderType === "buy"
        ? playerStock.quantity + executedQuantity
        : playerStock.quantity - executedQuantity;

    stockUpdate =
      newQuantity > 0
        ? supabase
            .from("player_stocks")
            .update({ quantity: newQuantity })
            .eq("id", playerStock.id)
        : supabase.from("player_stocks").delete().eq("id", playerStock.id);
  } else if (orderType === "buy") {
    stockUpdate = supabase.from("player_stocks").insert({
      player_id: playerId,
      stock_id: stockId,
      room_id: roomId,
      quantity: executedQuantity,
    });
  }

  // Execute updates in parallel
  await Promise.all([
    supabase.from("players").update({ cash: newCash }).eq("id", playerId),
    stockUpdate,
  ]);
}

// Main function to execute all pending orders in a room
export async function executeAllOrders(roomId: string) {
  // Get all pending orders and current stock positions
  const [{ data: orders }, { data: stocks }, { data: playerStocks }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "pending")
        .order("created_at"),
      supabase.from("stocks").select("*").eq("room_id", roomId),
      supabase.from("player_stocks").select("*").eq("room_id", roomId),
    ]);

  if (!orders || !stocks || !playerStocks) return;

  // Process orders sequentially to maintain price consistency
  for (const order of orders) {
    // Get latest stock price and total ownership
    const { data: currentStock } = await supabase
      .from("stocks")
      .select("*")
      .eq("id", order.stock_id)
      .single();

    if (!currentStock) continue;

    const stockState: StockState = {
      stock: currentStock,
      totalStocksOwned: playerStocks
        .filter((ps) => ps.stock_id === currentStock.id)
        .reduce((sum, ps) => sum + ps.quantity, 0),
    };

    // Execute order based on type
    const result = await (order.type === "buy"
      ? executeBuyOrder(order, stockState)
      : executeSellOrder(order, stockState));

    // Update order status
    await supabase
      .from("orders")
      .update({
        status: result.executedQuantity > 0 ? "executed" : "failed",
        execution_quantity: result.executedQuantity,
        execution_price_total: result.executedPriceTotal,
      })
      .eq("id", order.id);

    if (result.executedQuantity > 0) {
      // Update stock price and player position in parallel
      await Promise.all([
        supabase
          .from("stocks")
          .update({ current_price: result.newStockPrice })
          .eq("id", order.stock_id),
        updatePlayerPosition({
          playerId: order.player_id,
          stockId: order.stock_id,
          roomId: order.room_id,
          executedQuantity: result.executedQuantity,
          executedPriceTotal: result.executedPriceTotal,
          orderType: order.type,
        }),
      ]);
    }
  }
}
