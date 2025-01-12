"use client";

import {
  type Player,
  type PlayerStock,
  type Stock,
  supabase,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type PlayerWithPortfolio = {
  player: Player;
  stocks: (PlayerStock & { stock: Stock })[];
  totalStockValue: number;
  totalWorth: number;
  orderStatus?: "pending" | "submitted" | null;
};

function useOrderStatus(roomId: string) {
  const [orderStatuses, setOrderStatuses] = useState<
    Record<string, "pending" | "submitted" | null>
  >({});

  useEffect(() => {
    // Initial fetch
    const fetchOrderStatuses = async () => {
      const { data } = await supabase
        .from("orders")
        .select("player_id, status")
        .eq("room_id", roomId)
        .eq("status", "pending");

      if (data) {
        const statuses = data.reduce(
          (acc, order) => ({
            ...acc,
            [order.player_id]: "submitted",
          }),
          {}
        );
        setOrderStatuses(statuses);
      }
    };

    fetchOrderStatuses();

    // Subscribe to order changes
    const subscription = supabase
      .channel(`orders-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `room_id=eq.${roomId}`,
        },
        fetchOrderStatuses
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  return orderStatuses;
}

export function PlayerList({
  players,
  gameStarted,
  className,
}: {
  players: PlayerWithPortfolio[];
  gameStarted: boolean;
  className?: string;
}) {
  const orderStatuses = useOrderStatus(players[0]?.player.room_id);

  const playersWithOrderStatus = players.map((p) => ({
    ...p,
    orderStatus: orderStatuses[p.player.id] || null,
  }));

  return (
    <div className={cn("bg-white rounded-lg shadow-sm", className)}>
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Players</h2>
      </div>
      <div className="divide-y">
        {playersWithOrderStatus.map((p) => (
          <div
            key={p.player.id}
            className="px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {p.player.name[0].toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{p.player.name}</div>
                {gameStarted && (
                  <div className="text-sm text-gray-500">
                    {p.orderStatus && (
                      <span
                        className={cn(
                          "inline-block mr-2",
                          p.orderStatus === "submitted"
                            ? "text-green-600"
                            : "text-amber-600"
                        )}
                      >
                        •{" "}
                        {p.orderStatus === "submitted"
                          ? "Order submitted"
                          : "Pending order"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {gameStarted && (
              <div className="text-right">
                <div className="font-medium">
                  ${p.totalWorth.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  Cash: ${p.player.cash.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
