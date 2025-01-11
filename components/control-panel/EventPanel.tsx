"use client";

import { type Event } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function EventPanel({
  event,
  round,
  className,
}: {
  event: Event;
  round: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-lg shadow-sm", className)}>
      <div className="px-4 py-3 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Current Event</h2>
        <div className="text-sm font-medium text-gray-500">Round {round}</div>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="text-xl font-bold">{event.title}</h3>
        <p className="text-gray-600">{event.description}</p>
        <div className="text-sm text-gray-500 italic">
          Effects will be revealed at the end of the round...
        </div>
      </div>
    </div>
  );
}
