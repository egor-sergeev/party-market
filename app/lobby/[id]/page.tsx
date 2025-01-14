"use client";

import { Events } from "@/components/lobby/Events";
import { OrderHistory } from "@/components/lobby/OrderHistory";
import { PlayerList } from "@/components/lobby/PlayerList";
import { StocksTable } from "@/components/lobby/StocksTable";
import { Button } from "@/components/ui/button";
import { INITIAL_PLAYER_CASH } from "@/lib/game-config";
import { initializeGame } from "@/lib/game-engine/initialization";
import {
  advancePhase,
  formatPhase,
  getPhaseInfo,
} from "@/lib/game-engine/phase-manager";
import { useRoom } from "@/lib/hooks/useRoom";
import {
  type GameOrder,
  type GamePlayer,
  type GameStock,
} from "@/lib/types/game";
import { type OrderWithDetails } from "@/lib/types/ui";
import { cn, supabase } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function LobbyPage({ params }: { params: { id: string } }) {
  const { room, players, playersWithPortfolio, stocks, currentEvent, loading } =
    useRoom(params.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingTestPlayers, setIsAddingTestPlayers] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (room?.current_phase !== "executing_orders") return;

      try {
        setIsLoadingOrders(true);
        const { data } = await supabase
          .from("orders")
          .select("*")
          .in("status", ["executed", "failed"])
          .order("created_at", { ascending: false })
          .limit(10);

        setOrders(data || []);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [room?.current_phase]);

  const handleProceedPhase = async () => {
    if (!room) return;
    setIsProcessing(true);
    try {
      await advancePhase(params.id, room.current_phase);
    } catch (error) {
      console.error("Error proceeding to next phase:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const addTestPlayers = async () => {
    if (!room || isAddingTestPlayers) return;
    setIsAddingTestPlayers(true);

    try {
      const testPlayers = [
        { name: "Alice Test", cash: INITIAL_PLAYER_CASH },
        { name: "Bob Test", cash: INITIAL_PLAYER_CASH },
      ];

      await supabase.from("players").insert(
        testPlayers.map((player) => ({
          room_id: params.id,
          name: player.name,
          cash: player.cash,
        }))
      );
    } catch (error) {
      console.error("Error adding test players:", error);
    } finally {
      setIsAddingTestPlayers(false);
    }
  };

  const startGame = async () => {
    if (!room || isStarting) return;
    setIsStarting(true);
    try {
      await initializeGame(params.id);
    } catch (error) {
      console.error("Error starting game:", error);
    } finally {
      setIsStarting(false);
    }
  };

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

  if (loading) {
    return (
      <main className="container mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-[400px] bg-gray-100 rounded"></div>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="container mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Room not found</h1>
          <p className="mt-2 text-gray-600">
            The room you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
        </div>
      </main>
    );
  }

  if (room.status === "WAITING") {
    return (
      <main className="container mx-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold mb-4">Waiting Room</h1>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      Room Code
                    </div>
                    <div className="text-2xl font-mono font-bold">
                      {room.code}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {process.env.NODE_ENV === "development" &&
                  players.length === 0 && (
                    <Button
                      variant="outline"
                      onClick={addTestPlayers}
                      disabled={isAddingTestPlayers}
                    >
                      {isAddingTestPlayers ? "Adding..." : "Add Test Players"}
                    </Button>
                  )}
                {players.length >= 2 && (
                  <Button
                    onClick={startGame}
                    disabled={isStarting}
                    className="w-full"
                  >
                    {isStarting ? "Starting..." : "Start Game"}
                  </Button>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">
                Players ({players.length})
              </div>
              <div className="divide-y">
                {players.map((player) => (
                  <div key={player.id} className="py-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {player.name[0].toUpperCase()}
                    </div>
                    <div className="font-medium">{player.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className={cn("space-y-4")}>
          <div className="grid grid-cols-2 gap-4">
            <PlayerList players={playersWithPortfolio} className="col-span-1" />
            <StocksTable stocks={stocks} className="col-span-1" />
          </div>
          {currentEvent && <Events events={[currentEvent]} stocks={stocks} />}

          <div className="bg-white rounded-lg shadow p-4">
            {isLoadingOrders ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ) : (
              <OrderHistory
                orders={orders.map((order) =>
                  mapOrderToDetails(order, players, stocks)
                )}
              />
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Round {room.current_round} • {formatPhase(room.current_phase)}
            </div>
            <Button onClick={handleProceedPhase} disabled={isProcessing}>
              {isProcessing
                ? "Processing..."
                : `Proceed to ${getPhaseInfo(room.current_phase).label}`}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
