import { generateEvent } from "@/lib/game/llm-events";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const event = await generateEvent(
      supabase,
      "a23f17b3-2c26-45c8-8714-731e18583b58",
      1,
      10
    );
    return NextResponse.json(event);
  } catch (error) {
    console.error("Error generating event:", error);
    return NextResponse.json(
      { error: "Failed to generate event" },
      { status: 500 }
    );
  }
}
