"use client";

import React, { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

export default function PlayerPage() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [playerData, setPlayerData] = useState<any>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [sellQty, setSellQty] = useState(0);
  const [selectedStock, setSelectedStock] = useState("");

  useEffect(() => {
    // Real-time subscription for this player's row, stocks, etc.
    if (playerId) {
      subscribeToPlayer(playerId);
    }
    subscribeToStocks();

    return () => {
      // cleanup
    };
  }, [playerId]);

  async function subscribeToPlayer(id: string) {
    const { data: myData } = await supabaseBrowser
      .from("players")
      .select("*")
      .eq("id", id)
      .single();
    setPlayerData(myData);

    supabaseBrowser
      .channel(`player-changes-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `id=eq.${id}` },
        (payload) => {
          // Refetch or update local state
          fetchPlayer(id);
        }
      )
      .subscribe();
  }

  async function subscribeToStocks() {
    const { data: allStocks } = await supabaseBrowser.from("stocks").select("*");
    setStocks(allStocks || []);

    supabaseBrowser
      .channel("stock-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => {
        fetchStocks();
      })
      .subscribe();
  }

  async function fetchPlayer(id: string) {
    const { data } = await supabaseBrowser.from("players").select("*").eq("id", id).single();
    setPlayerData(data);
  }

  async function fetchStocks() {
    const { data } = await supabaseBrowser.from("stocks").select("*");
    setStocks(data || []);
  }

  async function handleJoin() {
    // Insert a new player row
    const { data, error } = await supabaseBrowser
      .from("players")
      .insert({ name: nameInput }) // You might need a game_id
      .select("*")
      .single();

    if (!error && data) {
      setPlayerId(data.id);
    }
  }

  async function handleBuy() {
    // Insert an order with type=BUY and a 'budget'
    if (!playerId || !selectedStock) return;
    await supabaseBrowser.from("orders").insert({
      player_id: playerId,
      stock_id: selectedStock,
      type: "BUY",
      budget: budget,
      // game_id -> if needed, fetch your current game
    });
    setBudget(0);
  }

  async function handleSell() {
    if (!playerId || !selectedStock) return;
    await supabaseBrowser.from("orders").insert({
      player_id: playerId,
      stock_id: selectedStock,
      type: "SELL",
      quantity: sellQty,
    });
    setSellQty(0);
  }

  if (!playerId) {
    return (
      <div className="p-6">
        <h1 className="text-xl">Join the Game</h1>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Your Name"
          className="mr-2"
        />
        <Button onClick={handleJoin}>Join</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl">Hello, {playerData?.name}</h1>
      <p>Money: {playerData?.money}</p>
      <p>Net Worth: {playerData?.net_worth}</p>

      <div>
        <h2 className="text-lg">Stocks</h2>
        <ul>
          {stocks.map((stock) => (
            <li key={stock.id}>
              {stock.name} - Price: {stock.price} - Dividend: {stock.dividend_yield}%
            </li>
          ))}
        </ul>
      </div>

      <div>
        <select onChange={(e) => setSelectedStock(e.target.value)}>
          <option value="">Select a stock</option>
          {stocks.map((stock) => (
            <option key={stock.id} value={stock.id}>
              {stock.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-x-2">
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          placeholder="Budget $"
        />
        <Button onClick={handleBuy}>Buy</Button>
      </div>

      <div className="space-x-2">
        <input
          type="number"
          value={sellQty}
          onChange={(e) => setSellQty(Number(e.target.value))}
          placeholder="Quantity"
        />
        <Button onClick={handleSell}>Sell</Button>
      </div>
    </div>
  );
}
