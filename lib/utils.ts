import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function retryInvoke<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 5
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt === maxAttempts) break;

      const delay = Math.min(
        100 * Math.pow(2, attempt - 1) + Math.random() * 100,
        3000
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

export interface TableColumn {
  key: string;
  title: string;
}

export function formatMarkdownTable<T extends Record<string, any>>(
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
