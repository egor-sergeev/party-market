import { Stock, StockEffect } from "@/lib/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

interface EventTemplate {
  title: string;
  description: string;
  getEffects: (stocks: Stock[]) => StockEffect[];
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    title: "Tech Innovation Breakthrough",
    description:
      "A revolutionary AI technology sparks investor interest in tech companies",
    getEffects: (stocks) => {
      const techStocks = stocks.filter((s) =>
        ["QUANT", "DRM", "MEMQ"].includes(s.symbol)
      );
      return techStocks.map((stock) => ({
        type: "price_change",
        stock_id: stock.id,
        amount: Math.floor(stock.current_price * 0.2),
      }));
    },
  },
  {
    title: "Supply Chain Disruption",
    description:
      "Global logistics issues affect manufacturing and delivery capabilities",
    getEffects: (stocks) => {
      const affectedStocks = stocks.filter((s) =>
        ["SPACE", "ROBO", "CLD"].includes(s.symbol)
      );
      return affectedStocks.map((stock) => ({
        type: "price_change",
        stock_id: stock.id,
        amount: Math.floor(stock.current_price * -0.15),
      }));
    },
  },
  {
    title: "Consumer Spending Surge",
    description:
      "Unexpected rise in consumer confidence boosts retail and entertainment sectors",
    getEffects: (stocks) => {
      const consumerStocks = stocks.filter((s) =>
        ["CSM", "MEMQ", "UCRN"].includes(s.symbol)
      );
      return consumerStocks.map((stock) => ({
        type: "dividend_change",
        stock_id: stock.id,
        amount: Math.floor(stock.dividend_amount * 0.5),
      }));
    },
  },
  {
    title: "Regulatory Changes",
    description: "New government regulations impact multiple industry sectors",
    getEffects: (stocks) => {
      const affectedStocks = stocks.filter((s) =>
        ["DNS", "DRM", "ROBO"].includes(s.symbol)
      );
      return affectedStocks.flatMap((stock) => [
        {
          type: "price_change",
          stock_id: stock.id,
          amount: Math.floor(stock.current_price * -0.1),
        },
        {
          type: "dividend_change",
          stock_id: stock.id,
          amount: Math.floor(stock.dividend_amount * -0.3),
        },
      ]);
    },
  },
  {
    title: "Market Innovation Fund",
    description: "Government announces support for innovative companies",
    getEffects: (stocks) => {
      const techStocks = stocks.filter((s) =>
        ["QUANT", "DNS", "ROBO"].includes(s.symbol)
      );
      return techStocks.map((stock) => ({
        type: "dividend_change",
        stock_id: stock.id,
        amount: Math.floor(stock.dividend_amount * 0.4),
      }));
    },
  },
];

export async function generateEvent(
  supabase: SupabaseClient,
  roomId: string,
  round: number
) {
  const { data: stocks, error: stocksError } = await supabase
    .from("stocks")
    .select("*, rooms(code)")
    .eq("room_id", roomId);

  if (stocksError) throw stocksError;
  if (!stocks?.length) throw new Error("No stocks found for room");

  const template =
    EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];

  const effects = template.getEffects(stocks);

  const { error: eventError } = await supabase.from("events").insert({
    room_id: roomId,
    round: round,
    title: template.title,
    description: template.description,
    effects: effects,
  });

  if (eventError) throw eventError;
}

export async function applyEventEffects(
  supabase: SupabaseClient,
  roomId: string,
  round: number
) {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*, rooms(code)")
    .eq("room_id", roomId)
    .eq("round", round)
    .single();

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
