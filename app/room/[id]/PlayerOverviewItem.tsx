import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoomStatus } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
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
  );
});

const OrderStatus = memo(function OrderStatus({
  hasSubmittedOrder,
}: {
  hasSubmittedOrder?: boolean;
}) {
  return (
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
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
      {showStats && (
        <div className="w-6 text-center font-medium">{position}</div>
      )}

      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 font-medium">{name}</div>

      {showStats && <PlayerStats cash={cash} netWorth={netWorth} />}

      {showOrderStatus && <OrderStatus hasSubmittedOrder={hasSubmittedOrder} />}
    </div>
  );
});
