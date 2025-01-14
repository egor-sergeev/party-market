"use client";

import { GameResult } from "@/components/player/GameResult";
import { PlayerInfo } from "@/components/player/PlayerInfo";
import { StockList } from "@/components/player/StockList";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { usePlayerGame } from "@/lib/hooks/usePlayerGame";
import { useRoom } from "@/lib/hooks/useRoom";
import {
  type GameOrder,
  type GamePlayer,
  type GameStock,
} from "@/lib/types/game";
import { type OrderWithDetails } from "@/lib/types/ui";

const mapOrderToDetails = (
  order: GameOrder,
  players: GamePlayer[],
  stocks: GameStock[]
): OrderWithDetails => {
  const player = players.find((p) => p.id === order.player_id);
  const stock = stocks.find((s) => s.id === order.stock_id);

  return {
    ...order,
    playerName: player?.name || "",
    playerInitials: (player?.name || "")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase(),
    stockName: stock?.name || "",
    stockSymbol: stock?.symbol || "",
  };
};

export default function GamePage({ params }: { params: { id: string } }) {
  const { room, loading: roomLoading } = useRoom(params.id);
  const { player, loading: playerLoading } = usePlayer(params.id);
  const {
    playerStocks,
    cashDiff,
    loading: gameLoading,
    error,
    submitOrder,
    allStocksWithQuantity,
    pendingOrders,
    cancelOrder,
    projectedCash,
    orders,
    players,
    stocks,
  } = usePlayerGame(params.id, player?.id ?? "");

  // Show loading state
  if (roomLoading || playerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading game...</div>
          <div className="text-sm text-gray-500">Please wait</div>
        </div>
      </div>
    );
  }

  // Show error state if no player or room found
  if (!player || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600 mb-2">
            Game not found
          </div>
          <div className="text-sm text-gray-500">
            Please try refreshing the page
          </div>
        </div>
      </div>
    );
  }

  // Show error state for game loading errors
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600 mb-2">{error}</div>
          <div className="text-sm text-gray-500">
            Please try refreshing the page
          </div>
        </div>
      </div>
    );
  }

  // Show waiting room
  if (room.status === "WAITING") {
    return (
      <main className="min-h-screen pt-24">
        <PlayerInfo player={player} gameStatus={room.status} />
        <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center p-4">
          <div className="text-center text-sm text-gray-500">
            The game will begin when the host starts it
          </div>
        </div>
      </main>
    );
  }

  // Show game finished state
  if (room.status === "FINISHED") {
    return (
      <main className="min-h-screen pt-24">
        <PlayerInfo player={player} gameStatus={room.status} />
        <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center p-4">
          <GameResult place={1} totalPlayers={4} />
          {/* TODO: Calculate place */}
        </div>
      </main>
    );
  }

  // Show game in progress
  return (
    <main className="min-h-screen pt-24">
      <PlayerInfo
        player={player}
        cashDiff={cashDiff || undefined}
        projectedCash={projectedCash || undefined}
        gameStatus={room.status}
        currentPhase={room.current_phase}
        hasPendingOrder={pendingOrders.length > 0}
      />

      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-4">Your Portfolio</h2>
                <StockList
                  stocks={allStocksWithQuantity}
                  playerCash={player.cash}
                  pendingOrders={pendingOrders}
                  onSubmitOrder={submitOrder}
                  onCancelOrder={cancelOrder}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
