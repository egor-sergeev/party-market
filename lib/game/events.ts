import { promptTemplate } from "@/lib/game/prompts";
import { Stock } from "@/lib/types/supabase";
import { formatMarkdownTable, retryInvoke, TableColumn } from "@/lib/utils";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const eventOutputSchema = z.object({
  analysis: z
    .string()
    .describe("1-2 sentences analysis of game state and players leaderboard"),
  action: z
    .string()
    .describe("1-2 sentences describing how you want to affect the market"),
  stock_effects: z
    .array(
      z.object({
        stock_symbol: z.string().describe("Symbol of the affected stock"),
        effect_type: z
          .enum(["price_change", "dividend_change"])
          .describe("Type of effect: price_change or dividend_change"),
        amount: z.number().describe("Absolute amount of change"),
      })
    )
    .describe("List of effects on stocks"),
  title: z.string().describe("Event title"),
  description: z.string().describe("Event description"),
});

interface RecentOrder {
  playerName: string;
  type: string;
  quantity: number;
  symbol: string;
}

async function fetchStocks(
  supabase: SupabaseClient,
  roomId: string
): Promise<Stock[]> {
  const { data: stocks } = await supabase
    .from("stocks")
    .select("*")
    .eq("room_id", roomId);

  if (!stocks) throw new Error("Failed to fetch stocks");
  return stocks;
}

async function fetchPlayers(supabase: SupabaseClient, roomId: string) {
  const { data: players } = await supabase
    .from("player_info")
    .select("*")
    .eq("room_id", roomId);

  if (!players) throw new Error("Failed to fetch players");
  return players;
}

async function fetchRecentOrders(
  supabase: SupabaseClient,
  roomId: string
): Promise<RecentOrder[]> {
  const { data } = await supabase
    .from("orders")
    .select(
      `
      type,
      execution_quantity,
      players!inner (
        name
      ),
      stocks!inner (
        symbol
      )
    `
    )
    .eq("room_id", roomId)
    .eq("status", "executed")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data) return [];

  // Since we're using inner joins, we know these fields exist
  return data.map((order: any) => ({
    playerName: order.players.name,
    type: order.type,
    quantity: order.execution_quantity,
    symbol: order.stocks.symbol,
  }));
}

function formatStocksTable(stocks: Stock[]) {
  const columns: TableColumn[] = [
    { key: "symbol", title: "Symbol" },
    { key: "name", title: "Name" },
    { key: "description", title: "Description" },
    { key: "current_price", title: "Current price" },
    { key: "dividend_amount", title: "Current dividends per round" },
  ];

  const tableData = stocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    description: s.description || "",
    current_price: s.current_price,
    dividend_amount: s.dividend_amount,
  }));

  return formatMarkdownTable(columns, tableData);
}

function formatPlayersTable(players: any[], stocks: Stock[]) {
  const columns: TableColumn[] = [
    { key: "name", title: "Name" },
    { key: "cash", title: "Current cash" },
    { key: "net_worth", title: "Net worth (cash + stocks)" },
    { key: "holdings", title: "Stocks owned" },
  ];

  const tableData = players.map((p) => {
    const holdings = p.holdings || [];
    const holdingsText = holdings
      .map((h: any) => `${h.quantity} \`${h.symbol}\``)
      .join(", ");

    return {
      name: p.name,
      cash: p.cash,
      net_worth: p.net_worth,
      holdings: holdingsText,
    };
  });

  return formatMarkdownTable(columns, tableData);
}

function formatOrders(orders: RecentOrder[]) {
  if (!orders.length) return "";

  return orders
    .map(
      (o) =>
        `- \`${o.playerName}\` ${o.type === "buy" ? "bought" : "sold"} ${
          o.quantity
        } \`${o.symbol}\``
    )
    .join("\n");
}

export async function generateEvent(
  supabase: SupabaseClient,
  roomId: string,
  round: number,
  totalRounds: number
) {
  // Get game state in parallel
  const [stocks, players, recentOrders] = await Promise.all([
    fetchStocks(supabase, roomId),
    fetchPlayers(supabase, roomId),
    fetchRecentOrders(supabase, roomId),
  ]);

  // Format data for prompt
  const stocksTable = formatStocksTable(stocks);
  const playersTable = formatPlayersTable(players, stocks);
  const ordersText = formatOrders(recentOrders);

  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.7,
  });
  const structuredLlm = promptTemplate.pipe(
    llm.withStructuredOutput(eventOutputSchema, {
      name: "newEvent",
    })
  );

  try {
    const response = await retryInvoke(() =>
      structuredLlm.invoke(
        {
          language: "Русский",
          tone: "матерящийся зумер, знающий все актуальные рофлы",
          round: round.toString(),
          totalRounds: totalRounds.toString(),
          stocks: stocksTable,
          players: playersTable,
          orders: ordersText,
        },
        { runName: "generateEvent" }
      )
    );

    // Map the parsed output to the Event type
    const stocksById = stocks.reduce(
      (acc, s) => ({ ...acc, [s.symbol]: s }),
      {} as Record<string, Stock>
    );

    const effects = response.stock_effects.map((effect) => ({
      type: effect.effect_type,
      stock_id: stocksById[effect.stock_symbol].id,
      amount: effect.amount,
    }));

    const event = {
      room_id: roomId,
      round,
      title: response.title,
      description: response.description,
      effects,
    };

    const { error: insertError } = await supabase.from("events").insert(event);

    if (insertError) {
      throw insertError;
    }

    return event;
  } catch (error) {
    console.error("Failed to generate event after all retries:", error);
    throw error;
  }
}

export async function applyEventEffects(
  supabase: SupabaseClient,
  roomId: string,
  round: number
) {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("room_id", roomId)
    .eq("round", round)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!event) return;

  for (const effect of event.effects) {
    const { error: rpcError } = await supabase.rpc("increment_column", {
      table_name: "stocks",
      column_name:
        effect.type === "price_change" ? "current_price" : "dividend_amount",
      row_id: effect.stock_id,
      amount: effect.amount,
    });

    if (rpcError) throw rpcError;
  }
}
