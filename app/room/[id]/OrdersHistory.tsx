"use client";

import { Order } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useCallback, useEffect, useState } from "react";

interface OrderWithDetails extends Order {
  player_name: string;
  stock_symbol: string;
}

export function OrdersHistory({ roomId }: { roomId: string }) {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          players (
            name
          ),
          stocks (
            symbol
          )
        `
        )
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (ordersError) throw ordersError;

      setOrders(
        (data || []).map((order) => ({
          ...order,
          player_name: order.players?.name || "Unknown",
          stock_symbol: order.stocks?.symbol || "Unknown",
        }))
      );
      setError(null);
    } catch (error) {
      setError(error as Error);
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`orders:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `room_id=eq.${roomId}`,
        },
        fetchOrders
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchOrders]);

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg">
        Failed to load orders: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading orders...</div>;
  }

  function getOrderStatus(order: OrderWithDetails) {
    if (order.status === "failed") return "failed";
    if (
      order.execution_quantity === order.requested_quantity &&
      order.execution_price_total === order.requested_price_total
    )
      return "success";
    return "partial";
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Order History</h2>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className={cn("p-4 rounded-lg border", {
              "bg-green-50 border-green-200":
                getOrderStatus(order) === "success",
              "bg-yellow-50 border-yellow-200":
                getOrderStatus(order) === "partial",
              "bg-red-50 border-red-200": getOrderStatus(order) === "failed",
            })}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  {order.player_name} {order.type === "buy" ? "bought" : "sold"}{" "}
                  {order.execution_quantity || 0} {order.stock_symbol}
                </div>

                {getOrderStatus(order) === "partial" && (
                  <div className="text-xs text-yellow-600">
                    Requested: {order.requested_quantity} @ $
                    {order.requested_price_total}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Price: {order.stock_price_before} → {order.stock_price_after}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
