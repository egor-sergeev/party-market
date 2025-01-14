import { supabase } from "@/lib/utils";

interface EventEffect {
  type: "price_change" | "dividend_change";
  stock_id: string;
  amount: number;
}

const EVENT_TEMPLATES = [
  {
    title: "Market Surge",
    description: "Unexpected economic growth leads to market optimism.",
    effectsCount: { min: 2, max: 3 },
    priceChangeBias: 0.7, // 70% chance of positive change
  },
  {
    title: "Economic Uncertainty",
    description: "Global events create market volatility.",
    effectsCount: { min: 2, max: 3 },
    priceChangeBias: 0.3, // 30% chance of positive change
  },
  {
    title: "Dividend Season",
    description: "Companies revise their dividend policies.",
    effectsCount: { min: 1, max: 2 },
    dividendFocus: true, // More likely to affect dividends
  },
  {
    title: "Tech Revolution",
    description: "Technological breakthroughs shake up the market.",
    effectsCount: { min: 2, max: 3 },
    priceChangeBias: 0.8, // 80% chance of positive change
  },
  {
    title: "Market Correction",
    description: "Investors reassess market valuations.",
    effectsCount: { min: 2, max: 3 },
    priceChangeBias: 0.2, // 20% chance of positive change
  },
];

export async function revealEventEffects(roomId: string) {
  try {
    // Get current round from the room
    const { data: room } = await supabase
      .from("rooms")
      .select("current_round")
      .eq("id", roomId)
      .single();

    if (!room) throw new Error("Room not found");

    // Get event for current round
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("room_id", roomId)
      .eq("round", room.current_round)
      .single();

    if (eventError) throw eventError;
    if (!event) return { success: true, effectsApplied: 0 };

    // Apply each effect
    const effects: EventEffect[] = event.effects;
    for (const effect of effects) {
      if (effect.type === "price_change") {
        const { data: stock } = await supabase
          .from("stocks")
          .select("current_price")
          .eq("id", effect.stock_id)
          .single();

        if (stock) {
          await supabase
            .from("stocks")
            .update({
              current_price: stock.current_price + effect.amount,
            })
            .eq("id", effect.stock_id);
        }
      } else if (effect.type === "dividend_change") {
        const { data: stock } = await supabase
          .from("stocks")
          .select("dividend_amount")
          .eq("id", effect.stock_id)
          .single();

        if (stock) {
          await supabase
            .from("stocks")
            .update({
              dividend_amount: stock.dividend_amount + effect.amount,
            })
            .eq("id", effect.stock_id);
        }
      }
    }

    return {
      success: true,
      effectsApplied: effects.length,
      event: event,
    };
  } catch (error) {
    console.error("Error revealing event effects:", error);
    throw error;
  }
}

export async function generateNewEvent(roomId: string) {
  try {
    // Get current round from the room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("current_round")
      .eq("id", roomId)
      .single();

    if (roomError) throw roomError;
    if (!room) throw new Error("Room not found");

    // Pick a random event template
    const template =
      EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];

    // Generate new event with random effects for the next round
    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert({
        room_id: roomId,
        round: room.current_round + 1,
        title: template.title,
        description: template.description,
        effects: await generateRandomEffects(roomId, template),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      success: true,
      event: newEvent,
    };
  } catch (error) {
    console.error("Error generating new event:", error);
    throw error;
  }
}

async function generateRandomEffects(
  roomId: string,
  template: (typeof EVENT_TEMPLATES)[number]
): Promise<EventEffect[]> {
  // Get all stocks in the room
  const { data: stocks, error } = await supabase
    .from("stocks")
    .select("id, current_price, dividend_amount")
    .eq("room_id", roomId);

  if (error) throw error;
  if (!stocks?.length) return [];

  const effects: EventEffect[] = [];
  const affectedStocks = new Set<string>();

  // Generate effects based on template
  const numEffects =
    Math.floor(
      Math.random() *
        (template.effectsCount.max - template.effectsCount.min + 1)
    ) + template.effectsCount.min;

  for (let i = 0; i < numEffects; i++) {
    // Pick a random stock that hasn't been affected yet
    const availableStocks = stocks.filter((s) => !affectedStocks.has(s.id));
    if (!availableStocks.length) break;

    const stock =
      availableStocks[Math.floor(Math.random() * availableStocks.length)];
    affectedStocks.add(stock.id);

    // Determine effect type based on template
    const isPriceChange = template.dividendFocus
      ? Math.random() < 0.3 // 30% chance of price change if dividend focused
      : Math.random() < 0.7; // 70% chance of price change normally

    if (isPriceChange) {
      const maxChange = Math.max(50, Math.floor(stock.current_price * 0.2));
      const isPositive = Math.random() < (template.priceChangeBias || 0.5);
      const amount =
        Math.floor(Math.random() * maxChange) * (isPositive ? 1 : -1);

      effects.push({
        type: "price_change",
        stock_id: stock.id,
        amount,
      });
    } else {
      const maxChange = Math.max(10, Math.floor(stock.dividend_amount * 0.3));
      const isPositive = Math.random() < (template.priceChangeBias || 0.5);
      const amount =
        Math.floor(Math.random() * maxChange) * (isPositive ? 1 : -1);

      effects.push({
        type: "dividend_change",
        stock_id: stock.id,
        amount,
      });
    }
  }

  return effects;
}
