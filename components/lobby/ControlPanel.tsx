"use client";

import { type Event } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { EventPanel } from "./EventPanel";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { PhaseControl } from "./PhaseControl";
import { StocksTable } from "./StocksTable";
import { type PlayerWithPortfolio, type StockWithHolders } from "./types";

export function ControlPanel({
  players,
  stocks,
  event,
  round,
  phase,
  onProceedPhase,
  className,
}: {
  players: PlayerWithPortfolio[];
  stocks: StockWithHolders[];
  event: Event | null;
  round: number;
  phase:
    | "submitting_orders"
    | "executing_orders"
    | "revealing_event"
    | "paying_dividends";
  onProceedPhase: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-4">
        <LeaderboardPanel
          players={players}
          gameStarted={true}
          className="col-span-1"
        />
        <StocksTable stocks={stocks} className="col-span-1" />
      </div>
      {event && <EventPanel event={event} round={round} />}
      <PhaseControl currentPhase={phase} onProceed={onProceedPhase} />
    </div>
  );
}
