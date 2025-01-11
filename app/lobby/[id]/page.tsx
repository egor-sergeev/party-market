"use client";

import { ControlPanel } from "@/components/lobby/ControlPanel";
import { Button } from "@/components/ui/button";
import { INITIAL_PLAYER_CASH } from "@/lib/game-config";
import { initializeGame } from "@/lib/game-engine/initialization";
import { useRoom } from "@/lib/hooks/useRoom";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function RoomPage({ params }: { params: { id: string } }) {
  const { room, players, playersWithPortfolio, stocks, currentEvent, loading } =
    useRoom(params.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingTestPlayers, setIsAddingTestPlayers] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleProceedPhase = async () => {
    if (!room) return;
    setIsProcessing(true);
    try {
      // For now, just update the phase
      const { error } = await supabase
        .from("rooms")
        .update({
          current_phase: getNextPhase(room.current_phase),
          // If moving to next round, increment it
          ...(room.current_phase === "paying_dividends" && {
            current_round: room.current_round + 1,
          }),
        })
        .eq("id", params.id);

      if (error) throw error;
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

      const { error } = await supabase.from("players").insert(
        testPlayers.map((player) => ({
          room_id: params.id,
          name: player.name,
          cash: player.cash,
        }))
      );

      if (error) throw error;
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
      console.error("Error starting player:", error);
    } finally {
      setIsStarting(false);
    }
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
            The room you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        {room.status === "WAITING" ? (
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
        ) : (
          <ControlPanel
            players={playersWithPortfolio}
            stocks={stocks}
            event={currentEvent}
            round={room.current_round}
            phase={room.current_phase}
            onProceedPhase={handleProceedPhase}
          />
        )}
      </div>
    </main>
  );
}

function getNextPhase(
  currentPhase:
    | "submitting_orders"
    | "executing_orders"
    | "revealing_event"
    | "paying_dividends"
) {
  const phases = {
    submitting_orders: "executing_orders",
    executing_orders: "revealing_event",
    revealing_event: "paying_dividends",
    paying_dividends: "submitting_orders",
  } as const;

  return phases[currentPhase];
}
