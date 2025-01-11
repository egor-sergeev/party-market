"use client";

import { type Player, type PlayerStock, type Stock } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type PlayerWithPortfolio = {
  player: Player;
  stocks: (PlayerStock & { stock: Stock })[];
  totalStockValue: number;
  totalWorth: number;
  orderStatus?: "pending" | "submitted" | null;
};

export function LeaderboardPanel({
  players,
  gameStarted,
  className,
}: {
  players: PlayerWithPortfolio[];
  gameStarted: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-lg shadow-sm", className)}>
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Players</h2>
      </div>
      <div className="divide-y">
        {players.map((p) => (
          <div
            key={p.player.id}
            className="px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {p.player.name[0].toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{p.player.name}</div>
                {gameStarted && (
                  <div className="text-sm text-gray-500">
                    {p.orderStatus && (
                      <span
                        className={cn(
                          "inline-block mr-2",
                          p.orderStatus === "submitted"
                            ? "text-green-600"
                            : "text-amber-600"
                        )}
                      >
                        •{" "}
                        {p.orderStatus === "submitted"
                          ? "Order submitted"
                          : "Pending order"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {gameStarted && (
              <div className="text-right">
                <div className="font-medium">
                  ${p.totalWorth.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  Cash: ${p.player.cash.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
