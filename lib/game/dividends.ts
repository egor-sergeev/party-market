import { SupabaseClient } from "@supabase/supabase-js";

export async function payAllDividends(
  supabase: SupabaseClient,
  roomId: string
): Promise<void> {
  const { error } = await supabase.rpc("pay_room_dividends", {
    p_room_id: roomId,
  });

  if (error) throw error;
}

/*
CREATE OR REPLACE FUNCTION pay_room_dividends(p_room_id UUID)
RETURNS void AS $$
BEGIN
  -- For each stock with positive dividends in the room
  WITH dividend_payments AS (
    SELECT 
      ps.user_id,
      SUM(ps.quantity * s.dividend_amount) as total_dividend
    FROM stocks s
    JOIN player_stocks ps ON ps.stock_id = s.id
    WHERE s.room_id = p_room_id 
      AND s.dividend_amount > 0
      AND ps.room_id = p_room_id
    GROUP BY ps.user_id
  )
  UPDATE players p
  SET cash = p.cash + dp.total_dividend
  FROM dividend_payments dp
  WHERE p.user_id = dp.user_id;
END;
$$ LANGUAGE plpgsql;
*/
