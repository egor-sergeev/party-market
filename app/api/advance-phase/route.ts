import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { generateComedicEventPrompt } from "@/lib/openai";

export async function POST() {
  // 1. Get current active game
  const { data: currentGame, error: gameError } = await supabaseServer
    .from("games")
    .select("*")
    .eq("phase", "TRADING")  // or eq("phase", "LOBBY") depending on your logic
    .single();
  if (!currentGame || gameError) {
    return NextResponse.json({ error: "No active game or invalid phase." }, { status: 400 });
  }

  // 2. Fetch all unprocessed orders for this game
  const { data: orders, error: ordersError } = await supabaseServer
    .from("orders")
    .select("*")
    .eq("game_id", currentGame.id);
  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 400 });
  }

  // 3. Sort orders by created_at to execute in chronological order
  const sortedOrders = orders.sort(
    (a, b) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf()
  );

  // 4. Execute trades
  for (const order of sortedOrders) {
    await executeTrade(order);
  }

  // 5. Call OpenAI to generate comedic event + parse result
  const { data: stocksData } = await supabaseServer.from("stocks").select("*").eq("game_id", currentGame.id);
  const comedicEventRaw = await generateComedicEventPrompt(stocksData || []);
  let eventTitle = "Random Event";
  let eventDesc = "";
  let changes: Record<string, { priceDelta: number; dividendDelta: number }> = {};

  try {
    const parsed = JSON.parse(comedicEventRaw);
    eventTitle = parsed.title;
    eventDesc = parsed.description;
    changes = parsed.changes;
  } catch (err) {
    // fallback if parse fails
  }

  // 6. Apply event changes to each stock
  for (const stock of stocksData || []) {
    const c = changes[stock.name];
    if (c) {
      const newPrice = stock.price + (c.priceDelta || 0);
      const newDividend = stock.dividend_yield + (c.dividendDelta || 0);

      await supabaseServer
        .from("stocks")
        .update({ price: newPrice, dividend_yield: newDividend })
        .eq("id", stock.id);
    }
  }

  // 7. Insert event record
  await supabaseServer.from("events").insert({
    game_id: currentGame.id,
    round: currentGame.round + 1,
    title: eventTitle,
    description: eventDesc,
  });

  // 8. Pay dividends & update net worth
  await payDividends(currentGame.id);

  // 9. Increment round & set new phase
  const newRound = currentGame.round + 1;
  const newPhase = newRound >= 10 ? "ENDED" : "TRADING";

  await supabaseServer
    .from("games")
    .update({ round: newRound, phase: newPhase })
    .eq("id", currentGame.id);

  return NextResponse.json({ status: "ok", round: newRound, phase: newPhase });
}

// Example trade logic
async function executeTrade(order: any) {
  // fetch needed data: player, stock
  const { data: player } = await supabaseServer.from("players").select("*").eq("id", order.player_id).single();
  const { data: stock } = await supabaseServer.from("stocks").select("*").eq("id", order.stock_id).single();

  if (!player || !stock) return;

  if (order.type === "BUY") {
    // Suppose 'budget' means how much max $ the player wants to spend
    if (player.money < stock.price) {
      // Player can't afford even 1 share
      return;
    }
    const sharesToBuy = Math.floor(order.budget / stock.price);
    const totalCost = sharesToBuy * stock.price;
    if (sharesToBuy > 0 && totalCost <= player.money) {
      // Deduct money from player
      const newMoney = player.money - totalCost;
      // (Optional) track shares in a separate "player_stocks" table or store
      // them in the 'players' table if it’s a small MVP with one stock per row.
      await supabaseServer
        .from("players")
        .update({ money: newMoney, net_worth: newMoney }) // net_worth updated later
        .eq("id", player.id);
    }
  } else if (order.type === "SELL") {
    // For MVP, assume player has enough shares to sell
    const revenue = (order.quantity || 0) * stock.price;
    const newMoney = player.money + revenue;
    await supabaseServer
      .from("players")
      .update({ money: newMoney, net_worth: newMoney })
      .eq("id", player.id);
  }

  // You might also want to adjust the stock price slightly after each trade
  // or incorporate demand logic here
}

// Example dividends payout
async function payDividends(gameId: string) {
  // For each player, pay sum of (shares * stock.price * dividend_yield%).
  // The logic depends on your shares-tracking approach.
  // For a simple MVP, skip or approximate.

  // Then update each player's net_worth = money + sum(stocks).
  // ...
}
