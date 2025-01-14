import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
