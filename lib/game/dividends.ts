import { SupabaseClient } from "@supabase/supabase-js";

interface HoldingWithStock {
  player_id: string;
  quantity: number;
  stocks: {
    dividend_amount: number;
  };
}

export async function payDividends(supabase: SupabaseClient, roomId: string) {
  const { data: holdings, error: holdingsError } = (await supabase
    .from("player_stocks")
    .select(
      `
      player_id,
      quantity,
      stocks (
        id,
        dividend_amount
      )
    `
    )
    .eq("room_id", roomId)) as { data: HoldingWithStock[] | null; error: any };

  if (holdingsError) throw holdingsError;

  const playerDividends: Record<string, number> = {};

  for (const holding of holdings || []) {
    const dividendAmount = holding.stocks.dividend_amount * holding.quantity;
    playerDividends[holding.player_id] =
      (playerDividends[holding.player_id] || 0) + dividendAmount;
  }

  await Promise.all(
    Object.entries(playerDividends).map(([playerId, amount]) =>
      supabase.rpc("update_player_cash", {
        player_id: playerId,
        amount,
      })
    )
  );
}
