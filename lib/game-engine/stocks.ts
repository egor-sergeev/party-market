import { supabase } from "@/lib/supabase";
import type { StockTemplate } from "./types";

export async function getActiveStockTemplates(): Promise<StockTemplate[]> {
  const { data, error } = await supabase
    .from("stock_templates")
    .select()
    .eq("is_active", true);

  if (error) throw error;
  return data;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function initializeStocks(roomId: string) {
  try {
    // Get all active stock templates
    const templates = await getActiveStockTemplates();
    if (templates.length < 10) {
      throw new Error("Not enough active stock templates");
    }

    // Randomly select 10 stocks
    const selectedTemplates = shuffleArray(templates).slice(0, 10);

    // Create stocks with randomized values
    const stocks = selectedTemplates.map((template) => {
      const price = getRandomInRange(template.min_price, template.max_price);
      const yield_value =
        getRandomInRange(template.min_yield * 100, template.max_yield * 100) /
        100;

      return {
        room_id: roomId,
        name: template.name,
        current_price: price,
        dividend_yield: yield_value,
      };
    });

    // Insert all stocks
    const { data, error } = await supabase
      .from("stocks")
      .insert(stocks)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error initializing stocks:", error);
    throw error;
  }
}

export async function updateStockTemplate(
  id: string,
  updates: Partial<Omit<StockTemplate, "id" | "created_at">>
) {
  const { error } = await supabase
    .from("stock_templates")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function createStockTemplate(
  template: Omit<StockTemplate, "id" | "created_at" | "is_active">
) {
  const { error } = await supabase.from("stock_templates").insert({
    ...template,
    is_active: true,
  });

  if (error) throw error;
}

export async function deactivateStockTemplate(id: string) {
  const { error } = await supabase
    .from("stock_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}
