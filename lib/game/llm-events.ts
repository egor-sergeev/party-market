import { Stock, StockEffect } from "@/lib/types/supabase";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  OutputFixingParser,
  StructuredOutputParser,
} from "langchain/output_parsers";
import { z } from "zod";
import { promptTemplate } from "../prompts";

const eventOutputSchema = z.object({
  title: z.string().describe("Event title"),
  description: z.string().describe("Event description"),
  stock_effects: z
    .array(
      z.object({
        stock_id: z.string().describe("ID of the affected stock"),
        stock_symbol: z.string().describe("Symbol of the affected stock"),
        effect_type: z
          .enum(["price_change", "dividend_change"])
          .describe("Type of effect: price_change or dividend_change"),
        amount: z
          .number()
          .describe(
            "Amount of change (percentage for price, absolute for dividends)"
          ),
      })
    )
    .describe("List of effects on stocks"),
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
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      type,
      execution_quantity,
      players:players!inner (name),
      stocks:stocks!inner (symbol)
    `
    )
    .eq("room_id", roomId)
    .eq("status", "executed")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!orders) return [];

  return orders.map((order) => ({
    playerName: order.players[0]?.name || "Unknown",
    type: order.type,
    quantity: order.execution_quantity,
    symbol: order.stocks[0]?.symbol || "Unknown",
  }));
}

interface TableColumn {
  key: string;
  title: string;
}

function formatMarkdownTable<T extends Record<string, any>>(
  columns: TableColumn[],
  data: T[]
): string {
  const header = `| ${columns.map((col) => col.title).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const rows = data.map(
    (item) => `| ${columns.map((col) => item[col.key]).join(" | ")} |`
  );

  return [header, separator, ...rows].join("\n");
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

  const parser = StructuredOutputParser.fromZodSchema(eventOutputSchema);
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 1,
  });

  // Create a fixing parser that will attempt to fix any formatting errors
  const fixingParser = OutputFixingParser.fromLLM(llm, parser);

  // Format the prompt with all required data
  const prompt = await promptTemplate.format({
    language: "Русский",
    style: "матерящийся зумер, знающий все актуальные рофлы",
    round: round.toString(),
    totalRounds: totalRounds.toString(),
    stocks: stocksTable,
    players: playersTable,
    orders: ordersText,
  });

  const response = await llm.invoke(prompt);

  try {
    // Try to parse the output, if it fails the fixing parser will attempt to fix it
    const parsedOutput = await fixingParser.parse(response.content as string);

    // Map the parsed output to the Event type
    const stocksById = stocks.reduce(
      (acc, s) => ({ ...acc, [s.symbol]: s }),
      {} as Record<string, Stock>
    );

    const effects: StockEffect[] = parsedOutput.stock_effects.map((effect) => ({
      type: effect.effect_type,
      stock_id: stocksById[effect.stock_symbol].id,
      amount: effect.amount,
    }));

    return {
      id: crypto.randomUUID(),
      room_id: roomId,
      round,
      title: parsedOutput.title,
      description: parsedOutput.description,
      effects,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to generate event:", error);
    throw error;
  }
}
