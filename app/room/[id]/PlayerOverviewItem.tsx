import { TableCell, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PlayerInfo, Room } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, Crown } from "lucide-react";
import { memo } from "react";

interface PlayerOverviewItemProps {
  player: PlayerInfo;
  position: number;
  room: Room;
  hasSubmittedOrder: boolean;
}

function DiffIndicator({
  current,
  previous,
}: {
  current: number;
  previous: number | null;
}) {
  if (!previous) return null;
  const diff = current - previous;
  if (diff === 0) return null;

  const Icon = diff > 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <Icon
      className={cn("w-4 h-4", diff > 0 ? "text-green-500" : "text-red-500")}
    />
  );
}

export const PlayerOverviewItem = memo(function PlayerOverviewItem({
  player,
  position,
  room,
  hasSubmittedOrder,
}: PlayerOverviewItemProps) {
  const showStats = room.status !== "WAITING";
  const showOrderStatus =
    room.status === "IN_PROGRESS" && room.current_phase === "submitting_orders";

  return (
    <TableRow className="border-0 hover:bg-transparent">
      <TableCell className="w-[50px] py-2">
        <div className="flex items-center justify-center">
          {showOrderStatus && hasSubmittedOrder ? (
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          ) : (
            <div
              className={cn(
                "font-bold text-2xl tabular-nums",
                position === 1 && "text-yellow-500",
                position === 2 && "text-zinc-400",
                position === 3 && "text-amber-700",
                position > 3 && "text-muted-foreground"
              )}
            >
              {position === 1 ? <Crown size={26} /> : position}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-3">
          <UserAvatar name={player.name} showBorder />
          <span className="font-medium text-lg">{player.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-right pr-1 py-2">
        <span className="text-lg tabular-nums">
          ${player.cash?.toLocaleString()}
        </span>
      </TableCell>
      <TableCell className="pl-1 py-2" />
      <TableCell className="text-right pr-1 py-2">
        <span className="text-lg tabular-nums">
          ${player.net_worth?.toLocaleString()}
        </span>
      </TableCell>
      <TableCell className="py-2 w-4">
        <DiffIndicator
          current={player.net_worth || 0}
          previous={player.previous_net_worth}
        />
      </TableCell>
    </TableRow>
  );
});
