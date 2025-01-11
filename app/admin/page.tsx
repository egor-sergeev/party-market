"use client";

import React, { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button"; // Suppose we have a shadcn button

export default function AdminPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [game, setGame] = useState<any>(null);

  useEffect(() => {
    // Subscribe to players & games
    fetchData();

    // Real-time subscription for players
    const channel = supabaseBrowser
      .channel("admin-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload) => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    const { data: games } = await supabaseBrowser.from("games").select("*");
    const activeGame = games?.[0]; // or find the one with phase != "ENDED"

    const { data: allPlayers } = await supabaseBrowser.from("players").select("*");
    setGame(activeGame);
    setPlayers(allPlayers || []);
  }

  async function handleCreateGame() {
    await fetch("/api/create-game", { method: "POST" });
    fetchData();
  }

  async function handleAdvancePhase() {
    await fetch("/api/advance-phase", { method: "POST" });
    fetchData();
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>
      <Button onClick={handleCreateGame}>Create New Game</Button>
      <Button onClick={handleAdvancePhase}>Advance Phase</Button>

      <div className="mt-4">
        <h2 className="text-lg">Current Game</h2>
        {game && (
          <div>
            Round: {game.round} | Phase: {game.phase}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h2 className="text-lg">Players</h2>
        <ul>
          {players.map((player) => (
            <li key={player.id}>
              {player.name} - Net Worth: {player.net_worth}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
