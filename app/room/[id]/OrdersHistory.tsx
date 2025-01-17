"use client";

import { Order } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

interface OrderWithDetails extends Order {
  player_name: string;
  stock_symbol: string;
}

export function OrdersHistory({ roomId }: { roomId: string }) {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [visibleOrders, setVisibleOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastUpdatedRef = useRef<string>(new Date().toISOString());
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const supabase = createClientComponentClient();

  const fetchOrders = useCallback(async () => {
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce the fetch
    fetchTimeoutRef.current = setTimeout(async () => {
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
          .in("status", ["executed", "failed"])
          .order("updated_at", { ascending: false })
          .limit(10);

        if (ordersError) throw ordersError;

        const transformedOrders = (data || []).map((order) => ({
          ...order,
          player_name: order.players?.name || "Unknown",
          stock_symbol: order.stocks?.symbol || "Unknown",
        }));

        setOrders(transformedOrders);

        // Split orders into existing and new ones
        const existingOrders = transformedOrders.filter(
          (order) => order.updated_at <= lastUpdatedRef.current
        );
        const newOrders = transformedOrders.filter(
          (order) => order.updated_at > lastUpdatedRef.current
        );

        // Show existing orders immediately
        setVisibleOrders(existingOrders);

        // Add new orders one by one with delay
        if (newOrders.length > 0) {
          newOrders.forEach((order, index) => {
            setTimeout(() => {
              setVisibleOrders((prev) => [order, ...prev]);
            }, index * 3000);
          });

          // Update the last updated timestamp
          lastUpdatedRef.current = newOrders[0].updated_at;
        }

        setError(null);
      } catch (error) {
        setError(error as Error);
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  }, [roomId, supabase]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`orders:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new.current_phase === "executing_orders") {
            fetchOrders();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchOrders]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

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
      <h2 className="text-lg font-medium">Order History</h2>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {visibleOrders.map((order) => (
          <div
            key={order.id}
            className={cn(
              "p-4 rounded-lg border animate-in fade-in slide-in-from-right-5 duration-300 fill-mode-forwards",
              {
                "bg-green-50 border-green-200":
                  getOrderStatus(order) === "success",
                "bg-yellow-50 border-yellow-200":
                  getOrderStatus(order) === "partial",
                "bg-red-50 border-red-200": getOrderStatus(order) === "failed",
              }
            )}
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
                    {order.requested_price_total / order.requested_quantity}
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
