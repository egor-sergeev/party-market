"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "./types"; // We'll define a Database type later

export const supabaseBrowser = createClientComponentClient<Database>({
  options: {
    // optional: schema, headers, etc.
  },
});
