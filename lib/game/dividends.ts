import { SupabaseClient } from "@supabase/supabase-js";

export async function payAllDividends(
  supabase: SupabaseClient,
  roomId: string
) {
  // Get all stocks with dividends for this room
  const { data: stocks } = await supabase
    .from("stocks")
    .select()
    .eq("room_id", roomId)
    .gt("dividend_amount", 0);

  // Pay dividends for each stock
  if (stocks?.length) {
    await Promise.all(
      stocks.map((stock) =>
        payDividends(supabase, roomId, stock.id, stock.dividend_amount)
      )
    );
  }
}

async function payDividends(
  supabase: SupabaseClient,
  roomId: string,
  stockId: string,
  dividendPerShare: number
) {
  const { data: holdings } = await supabase
    .from("player_stocks")
    .select("user_id, quantity")
    .eq("room_id", roomId)
    .eq("stock_id", stockId);

  if (!holdings?.length) return;

  const playerDividends: Record<string, number> = {};

  for (const holding of holdings) {
    const dividendAmount = holding.quantity * dividendPerShare;
    playerDividends[holding.user_id] =
      (playerDividends[holding.user_id] || 0) + dividendAmount;
  }

  // Update player cash in parallel
  await Promise.all(
    Object.entries(playerDividends).map(([userId, amount]) =>
      supabase.rpc("update_player_cash", {
        user_id: userId,
        amount,
      })
    )
  );
}
