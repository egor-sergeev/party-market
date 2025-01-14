import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type PlayerInfoProps } from "@/lib/types/ui";
import { cn } from "@/lib/utils";

export function PlayerInfo({
  player,
  cashDiff,
  projectedCash,
  gameStatus,
  currentPhase,
  hasPendingOrder,
}: PlayerInfoProps) {
  const initials = player.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-50 border-b z-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 p-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h2 className="font-semibold text-lg">{player.name}</h2>
              {gameStatus === "IN_PROGRESS" && (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">
                    ${(projectedCash ?? player.cash).toLocaleString()}
                  </span>
                  {cashDiff !== undefined && (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        cashDiff > 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {cashDiff > 0 ? "+" : ""}${cashDiff.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {gameStatus === "IN_PROGRESS" && currentPhase && (
            <div className="p-4 text-sm text-gray-600">
              {currentPhase === "submitting_orders"
                ? hasPendingOrder
                  ? "Order submitted"
                  : "Submit order"
                : "Something important is on the screen"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
