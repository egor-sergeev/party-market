"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type OrderHistoryProps, type OrderWithDetails } from "@/lib/types/ui";
import { cn } from "@/lib/utils";

function OrderHistoryItem({ order }: { order: OrderWithDetails }) {
  const executionQuantity = order.execution_quantity ?? 0;
  const executionPriceTotal = order.execution_price_total ?? 0;

  const isFullyExecuted =
    executionQuantity === order.requested_quantity &&
    executionPriceTotal === order.requested_price_total;
  const isPartiallyExecuted = executionQuantity > 0 && !isFullyExecuted;

  const statusColor = isFullyExecuted
    ? "bg-green-50 border-green-200"
    : isPartiallyExecuted
    ? "bg-yellow-50 border-yellow-200"
    : "bg-red-50 border-red-200";

  const textColor = isFullyExecuted
    ? "text-green-700"
    : isPartiallyExecuted
    ? "text-yellow-700"
    : "text-red-700";

  return (
    <div className={cn("p-4 rounded-lg border mb-2", statusColor)}>
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{order.playerInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium">{order.playerName}</div>
              <div className="text-sm text-gray-500">
                {order.type === "buy" ? "Bought" : "Sold"} {order.stockName} (
                {order.stockSymbol})
              </div>
            </div>
            <div className={cn("text-right", textColor)}>
              <div className="font-medium">
                {executionQuantity} / {order.requested_quantity} shares
              </div>
              <div className="text-sm">
                ${executionPriceTotal.toLocaleString()} / $
                {order.requested_price_total.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderHistory({ orders, className }: OrderHistoryProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-lg font-medium mb-4">Recent Orders</h2>
      {orders.slice(0, 10).map((order) => (
        <OrderHistoryItem key={order.id} order={order} />
      ))}
    </div>
  );
}
