import { supabase } from "@/lib/supabase";

export async function distributeDividends(roomId: string) {
  try {
    const { data, error } = await supabase.rpc("distribute_dividends", {
      room_id: roomId,
    });

    if (error) throw error;

    return {
      success: true,
      totalPayments: data.total_payments,
      totalAmount: data.total_amount,
    };
  } catch (error) {
    console.error("Error distributing dividends:", error);
    throw error;
  }
}
