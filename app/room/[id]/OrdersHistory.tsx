"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Order } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

interface OrderWithDetails extends Order {
  player_name: string;
  stock_symbol: string;
  requested_quantity: number;
}

function OrderItem({ order }: { order: OrderWithDetails }) {
  const priceBefore = order.stock_price_before || 0;
  const priceAfter = order.stock_price_after || 0;
  const priceDiff = priceAfter - priceBefore;
  const isPositive = priceDiff > 0;
  const isFailed = order.execution_quantity === 0;

  return (
    <TableRow className="animate-in fade-in-50 slide-in-from-right-5 duration-300 border-0 hover:bg-transparent">
      <TableCell className="py-2 pr-6">
        <div className="flex items-center gap-2">
          <UserAvatar
            name={order.player_name}
            className="h-7 w-7"
            fallbackClassName="text-xs"
            showBorder={true}
          />
          <span className="font-medium">{order.player_name}</span>
        </div>
      </TableCell>
      <TableCell className="py-2 pr-1 text-right">
        <Badge
          className={cn(
            "px-2 border-0 shadow-none",
            isFailed
              ? "bg-gray-500/10 text-gray-500 hover:bg-gray-500/10"
              : order.type === "buy"
              ? "bg-green-500/10 text-green-500 hover:bg-green-500/10"
              : "bg-red-500/10 text-red-500 hover:bg-red-500/10"
          )}
        >
          {isFailed ? "Fail" : order.type === "buy" ? "Buy" : "Sell"}
        </Badge>
      </TableCell>
      <TableCell className="py-2 pl-1 text-lg">
        {order.stock_symbol} × {order.execution_quantity}
        {order.requested_quantity > (order.execution_quantity || 0) && (
          <span className="text-muted-foreground text-lg ml-1">
            / {order.requested_quantity}
          </span>
        )}
      </TableCell>
      <TableCell className="py-2 pr-1 text-right text-lg">
        <span className="tabular-nums">$ {priceBefore}</span>
      </TableCell>
      <TableCell className="py-2 pl-0">
        {priceDiff !== 0 && !isFailed && (
          <span
            className={cn(
              "text-xs tabular-nums",
              isPositive ? "text-green-500" : "text-red-500"
            )}
          >
            {isPositive ? "+" : "-"}
            {Math.abs(priceDiff)}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
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
          .in("type", ["buy", "sell"])
          .order("round", { ascending: false })
          .order("stock_id", { ascending: true })
          .order("updated_at", { ascending: false })
          .limit(15);

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
            }, index * 2000);
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
      <div className="rounded-lg border border-red-200 bg-red-50/5 px-3 py-2">
        <div className="text-sm text-red-500">
          Failed to load orders: {error.message}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-[52px] rounded-lg bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Recent Orders</h2>
      <div className="max-h-[400px] overflow-y-auto pr-2">
        <Table>
          <TableBody>
            {visibleOrders.map((order) => (
              <OrderItem key={order.id} order={order} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
