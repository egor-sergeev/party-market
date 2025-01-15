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
        amount: Math.floor(stock.current_price * 0.2), // 20% increase
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
        amount: Math.floor(stock.current_price * -0.15), // 15% decrease
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
        amount: Math.floor(stock.dividend_amount * 0.5), // 50% dividend increase
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
          amount: Math.floor(stock.current_price * -0.1), // 10% price decrease
        },
        {
          type: "dividend_change",
          stock_id: stock.id,
          amount: Math.floor(stock.dividend_amount * -0.3), // 30% dividend decrease
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
        amount: Math.floor(stock.dividend_amount * 0.4), // 40% dividend increase
      }));
    },
  },
];

export async function generateEvent(
  supabase: SupabaseClient,
  roomId: string,
  round: number
) {
  try {
    // Get current stocks for the room
    const { data: stocks, error: stocksError } = await supabase
      .from("stocks")
      .select()
      .eq("room_id", roomId);

    if (stocksError) throw stocksError;
    if (!stocks?.length) throw new Error("No stocks found for room");

    // Select random event template
    const template =
      EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];

    // Generate effects using template
    const effects = template.getEffects(stocks);

    // Insert event with effects
    const { error: eventError } = await supabase.from("events").insert({
      room_id: roomId,
      round: round,
      title: template.title,
      description: template.description,
      effects: effects,
    });

    if (eventError) throw eventError;
  } catch (error) {
    console.error("Failed to generate event:", error);
    throw error;
  }
}

export async function applyEventEffects(
  supabase: SupabaseClient,
  roomId: string,
  round: number
) {
  try {
    // Get event for current round
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select()
      .eq("room_id", roomId)
      .eq("round", round)
      .single();

    if (eventError) throw eventError;
    if (!event) return;

    // Apply each effect to corresponding stock
    for (const effect of event.effects) {
      const { error: updateError } = await supabase
        .from("stocks")
        .update({
          ...(effect.type === "price_change"
            ? {
                current_price: supabase.rpc("increment_column", {
                  table_name: "stocks",
                  column_name: "current_price",
                  row_id: effect.stock_id,
                  amount: effect.amount,
                }),
              }
            : {
                dividend_amount: supabase.rpc("increment_column", {
                  table_name: "stocks",
                  column_name: "dividend_amount",
                  row_id: effect.stock_id,
                  amount: effect.amount,
                }),
              }),
        })
        .eq("id", effect.stock_id);

      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error("Failed to apply event effects:", error);
    throw error;
  }
}
