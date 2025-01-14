"use client";

import { type GameStock, type StockEffect } from "@/lib/types/game";
import { type Event } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";

interface EventsProps {
  events: Event[];
  stocks: GameStock[];
  className?: string;
}

function EventEffect({
  effect,
  stocks,
}: {
  effect: StockEffect;
  stocks: GameStock[];
}) {
  const stock = stocks.find((s: GameStock) => s.id === effect.stock_id);
  const isPositive = effect.amount > 0;
  const sign = isPositive ? "+" : "";

  return (
    <div
      className={cn(
        "text-sm font-medium",
        isPositive ? "text-green-600" : "text-red-600"
      )}
    >
      {effect.type === "price_change" ? (
        <>
          {stock?.symbol} price {sign}${effect.amount}
        </>
      ) : (
        <>
          {stock?.symbol} dividend {sign}${effect.amount}
        </>
      )}
    </div>
  );
}

export function Events({ events, stocks }: EventsProps) {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="p-4 bg-white rounded-lg border space-y-2"
        >
          <div className="font-medium">{event.title}</div>
          <div className="text-sm text-gray-500">{event.description}</div>
          <div className="space-y-1">
            {event.effects.map((effect, i) => (
              <EventEffect key={i} effect={effect} stocks={stocks} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
