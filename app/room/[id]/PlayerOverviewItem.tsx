import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoomStatus } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

interface PlayerOverviewItemProps {
  name: string;
  position?: number;
  cash?: number;
  netWorth?: number;
  hasSubmittedOrder?: boolean;
  isOrderPhase?: boolean;
  status: RoomStatus;
}

export function PlayerOverviewItem({
  name,
  position,
  cash,
  netWorth,
  hasSubmittedOrder,
  isOrderPhase,
  status,
}: PlayerOverviewItemProps) {
  // Get initials for avatar
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
      {/* Position (in game) */}
      {status !== "WAITING" && (
        <div className="w-6 text-center font-medium">{position}</div>
      )}

      {/* Avatar */}
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="flex-1 font-medium">{name}</div>

      {/* Game stats */}
      {status !== "WAITING" && (
        <>
          <div className="w-24 text-right">
            <div className="text-sm text-muted-foreground">Cash</div>
            <div className="font-medium">${cash?.toLocaleString()}</div>
          </div>

          <div className="w-24 text-right">
            <div className="text-sm text-muted-foreground">Net Worth</div>
            <div className="font-medium">${netWorth?.toLocaleString()}</div>
          </div>
        </>
      )}

      {/* Order status */}
      {status === "IN_PROGRESS" && isOrderPhase && (
        <div
          className={cn(
            "w-6 flex justify-center",
            hasSubmittedOrder
              ? "text-green-500"
              : "text-muted-foreground animate-pulse"
          )}
        >
          {hasSubmittedOrder ? <Check size={20} /> : <Loader2 size={20} />}
        </div>
      )}
    </div>
  );
}
