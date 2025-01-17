import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoomStatus } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { BanknotesIcon, CurrencyDollarIcon } from "@heroicons/react/24/solid";
import { Crown } from "lucide-react";
import { memo } from "react";

interface PlayerOverviewItemProps {
  name: string;
  position?: number;
  cash?: number;
  netWorth?: number;
  hasSubmittedOrder?: boolean;
  isOrderPhase?: boolean;
  status: RoomStatus;
}

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const PlayerStats = memo(function PlayerStats({
  cash,
  netWorth,
}: {
  cash?: number;
  netWorth?: number;
}) {
  return (
    <div className="flex items-center gap-6 text-base">
      <div className="flex items-center gap-2">
        <CurrencyDollarIcon className="w-5 h-5 text-yellow-500" />
        <span className="text-lg">{cash?.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2">
        <BanknotesIcon className="w-5 h-5 text-emerald-500" />
        <span className="text-lg">{netWorth?.toLocaleString()}</span>
      </div>
    </div>
  );
});

const OrderStatus = memo(function OrderStatus({
  hasSubmittedOrder,
}: {
  hasSubmittedOrder?: boolean;
}) {
  if (!hasSubmittedOrder) return null;
  return <div className="w-3 h-3 rounded-full bg-green-500" />;
});

const PositionIndicator = memo(function PositionIndicator({
  position,
}: {
  position?: number;
}) {
  if (!position) return null;

  return (
    <div
      className={cn(
        "w-[26px] font-bold text-2xl tabular-nums flex items-center justify-center",
        position === 1 && "text-yellow-500",
        position === 2 && "text-zinc-400",
        position === 3 && "text-amber-700",
        position > 3 && "text-muted-foreground"
      )}
    >
      {position === 1 ? <Crown size={26} /> : position}
    </div>
  );
});

export const PlayerOverviewItem = memo(function PlayerOverviewItem({
  name,
  position,
  cash,
  netWorth,
  hasSubmittedOrder,
  isOrderPhase,
  status,
}: PlayerOverviewItemProps) {
  const initials = getInitials(name);
  const showStats = status !== "WAITING";
  const showOrderStatus = status === "IN_PROGRESS" && isOrderPhase;

  return (
    <div className="flex items-center gap-4 py-2 px-2">
      {showStats && <PositionIndicator position={position} />}

      <Avatar
        className={cn(
          "h-8 w-8 border-2",
          hasSubmittedOrder && showOrderStatus
            ? "border-green-500"
            : "border-border"
        )}
      >
        <AvatarFallback className="text-sm font-semibold bg-primary/5 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 font-medium text-lg">{name}</div>

      {showStats && <PlayerStats cash={cash} netWorth={netWorth} />}
    </div>
  );
});
