"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type PlayerListProps } from "@/lib/types/ui";
import { cn } from "@/lib/utils";

export function PlayerList({ players, className }: PlayerListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {players.map((player) => {
        const initials = player.player.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase();

        return (
          <div
            key={player.player.id}
            className="flex items-center gap-4 p-4 bg-white rounded-lg border"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="font-medium">{player.player.name}</div>
              <div className="text-sm text-gray-500">
                ${player.totalWorth.toLocaleString()}
              </div>
            </div>

            {player.orderStatus === "submitted" && (
              <div className="text-xs text-green-600 font-medium">
                Order submitted
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
