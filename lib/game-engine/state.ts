import { supabase } from "@/lib/supabase";
import type { GameState, PlayerState } from "./types";

export async function calculatePlayerState(
  playerId: string,
  roomId: string
): Promise<PlayerState | null> {
  try {
    // Get player data
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select()
      .eq("id", playerId)
      .single();

    if (playerError) throw playerError;

    // Get player's stocks with current prices
    const { data: playerStocks, error: stocksError } = await supabase
      .from("player_stocks")
      .select(
        `
        *,
        stock:stocks (*)
      `
      )
      .eq("player_id", playerId);

    if (stocksError) throw stocksError;

    const totalStockValue = playerStocks.reduce(
      (sum, ps) => sum + ps.quantity * ps.stock.current_price,
      0
    );

    return {
      player,
      stocks: playerStocks,
      totalStockValue,
      totalWorth: player.cash + totalStockValue,
    };
  } catch (error) {
    console.error("Error calculating player state:", error);
    return null;
  }
}

export async function getGameState(roomId: string): Promise<GameState | null> {
  try {
    // Get all players in the room
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", roomId);

    if (playersError) throw playersError;

    // Get stocks
    const { data: stocks, error: stocksError } = await supabase
      .from("stocks")
      .select()
      .eq("room_id", roomId);

    if (stocksError) throw stocksError;

    // Get room data
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("id", roomId)
      .single();

    if (roomError) throw roomError;

    // Calculate state for each player
    const playerStates = await Promise.all(
      players.map((p) => calculatePlayerState(p.id, roomId))
    );

    const validPlayerStates = playerStates.filter(
      (state): state is PlayerState => state !== null
    );

    const worths = validPlayerStates.map((p) => p.totalWorth);
    const averageWorth =
      worths.reduce((sum, worth) => sum + worth, 0) / worths.length;

    return {
      players: validPlayerStates,
      stocks,
      currentRound: room.current_round,
      averageWorth,
      minWorth: Math.min(...worths),
      maxWorth: Math.max(...worths),
    };
  } catch (error) {
    console.error("Error getting game state:", error);
    return null;
  }
}
