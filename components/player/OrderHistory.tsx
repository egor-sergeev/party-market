import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  player_name: string;
  player_initials: string;
  stock_name: string;
  stock_symbol: string;
  executed_quantity: number;
  executed_price_total: number;
  requested_quantity: number;
  requested_price_total: number;
  type: "buy" | "sell";
  created_at: string;
}

interface OrderHistoryProps {
  orders: Order[];
}

function OrderHistoryItem({ order }: { order: Order }) {
  const isFullyExecuted =
    order.executed_quantity === order.requested_quantity &&
    order.executed_price_total === order.requested_price_total;
  const isPartiallyExecuted = order.executed_quantity > 0 && !isFullyExecuted;
  const isFailed = order.executed_quantity === 0;

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn("p-4 rounded-lg border mb-2", statusColor)}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{order.player_initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium">{order.player_name}</div>
              <div className="text-sm text-gray-500">
                {order.type === "buy" ? "Bought" : "Sold"} {order.stock_name} (
                {order.stock_symbol})
              </div>
            </div>
            <div className={cn("text-right", textColor)}>
              <div className="font-medium">
                {order.executed_quantity} / {order.requested_quantity} shares
              </div>
              <div className="text-sm">
                ${order.executed_price_total.toLocaleString()} / $
                {order.requested_price_total.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function OrderHistory({ orders: initialOrders }: OrderHistoryProps) {
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Reset visible orders when initial orders change
    setVisibleOrders([]);

    // Add orders one by one with delay
    initialOrders
      .slice(0, 10)
      .reverse()
      .forEach((order, index) => {
        setTimeout(() => {
          setVisibleOrders((prev) => [order, ...prev]);
        }, index * 2000);
      });
  }, [initialOrders]);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium mb-4">Recent Orders</h2>
      <AnimatePresence>
        {visibleOrders.map((order) => (
          <OrderHistoryItem key={order.id} order={order} />
        ))}
      </AnimatePresence>
    </div>
  );
}
