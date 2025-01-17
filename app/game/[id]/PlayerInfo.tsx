"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/auth";
import { Player } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

interface PlayerInfoProps {
  roomId: string;
}

interface OrderRow {
  room_id: string;
  user_id: string;
  requested_price_total: number;
  type: "buy" | "sell";
  status: "pending" | "executed" | "failed";
}

interface PlayerRow {
  room_id: string;
  user_id: string;
  name: string;
  cash: number;
}

export function PlayerInfo({ roomId }: PlayerInfoProps) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [pendingOrdersTotal, setPendingOrdersTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const { user, isLoading: isAuthLoading } = useUser();

  const fetchPendingOrders = useCallback(async () => {
    if (!user) return;

    const { data: orders } = await supabase
      .from("orders")
      .select("requested_price_total, type")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .eq("status", "pending");

    const pendingTotal = (orders || []).reduce(
      (total, order) =>
        total + (order.type === "buy" ? order.requested_price_total : 0),
      0
    );
    setPendingOrdersTotal(pendingTotal);
  }, [roomId, supabase, user]);

  const fetchPlayer = useCallback(async () => {
    try {
      if (!user) return;

      const { data: player } = await supabase
        .from("players")
        .select()
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .single();

      if (player) {
        setPlayer(player);
        await fetchPendingOrders();
      }
    } catch (error) {
      console.error("Error fetching player:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase, user, fetchPendingOrders]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchPlayer();
    }
  }, [isAuthLoading, fetchPlayer]);

  useEffect(() => {
    if (!user?.id) return;

    function isOrderRow(record: any): record is OrderRow {
      return record && typeof record.room_id === "string";
    }

    function isPlayerRow(record: any): record is PlayerRow {
      return record && typeof record.room_id === "string";
    }

    const channel = supabase
      .channel(`player-info:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<OrderRow>) => {
          const record =
            payload.eventType === "DELETE" ? payload.old : payload.new;
          if (isOrderRow(record) && record.room_id === roomId) {
            fetchPendingOrders();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<PlayerRow>) => {
          const record =
            payload.eventType === "DELETE" ? payload.old : payload.new;
          if (isPlayerRow(record) && record.room_id === roomId) {
            fetchPlayer();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchPlayer, fetchPendingOrders, user?.id]);

  return (
    <div className="sticky top-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-full items-center justify-between">
        <div className="flex items-center gap-4">
          {isLoading || isAuthLoading ? (
            <Skeleton className="h-7 w-32" />
          ) : player ? (
            <h2 className="text-lg font-semibold">{player.name}</h2>
          ) : (
            <p className="text-sm text-muted-foreground">Player not found</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isLoading || isAuthLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : player ? (
            <div className="text-right">
              <p className="text-lg font-mono">
                $ {(player.cash - pendingOrdersTotal).toLocaleString()}
              </p>
              {pendingOrdersTotal > 0 && (
                <p className="text-sm text-muted-foreground">
                  $ {pendingOrdersTotal.toLocaleString()} in pending orders
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
