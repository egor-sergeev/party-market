"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/auth";
import { RoomPhase } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface SkipOrderButtonProps {
  roomId: string;
}

export function SkipOrderButton({ roomId }: SkipOrderButtonProps) {
  const { user, isLoading: isUserLoading } = useUser();
  const [isSkipped, setIsSkipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingOrder, setHasPendingOrder] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<RoomPhase | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const fetchState = useCallback(async () => {
    if (!user) return;

    try {
      const [{ data: pendingOrders }, { data: room }] = await Promise.all([
        supabase
          .from("orders")
          .select("type")
          .eq("room_id", roomId)
          .eq("user_id", user.id)
          .eq("status", "pending"),
        supabase
          .from("rooms")
          .select("current_phase")
          .eq("id", roomId)
          .single(),
      ]);

      const hasSkipOrder =
        pendingOrders?.some((order) => order.type === "skip") || false;
      const hasPendingOrder = (pendingOrders || []).length > 0;

      setHasPendingOrder(hasPendingOrder);
      setCurrentPhase(room?.current_phase || null);
      setIsSkipped(hasSkipOrder);
    } catch (error) {
      console.error("Error fetching state:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, user, supabase]);

  useEffect(() => {
    if (!isUserLoading) {
      fetchState();
    }
  }, [isUserLoading, fetchState]);

  useEffect(() => {
    const channel = supabase
      .channel(`skip-button:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `room_id=eq.${roomId}`,
        },
        fetchState
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        fetchState
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchState]);

  const handleToggleSkip = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      if (isSkipped) {
        // Delete skip order
        const { error } = await supabase
          .from("orders")
          .delete()
          .eq("room_id", roomId)
          .eq("user_id", user.id)
          .eq("type", "skip");

        if (error) throw error;
      } else {
        // Create skip order
        const { error } = await supabase.from("orders").insert({
          room_id: roomId,
          user_id: user.id,
          type: "skip",
          status: "pending",
          requested_quantity: 0,
          requested_price_total: 0,
        });

        if (error) throw error;
      }

      router.refresh();
    } catch (error) {
      console.error("Error toggling skip:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isSkipped, roomId, user, supabase, router]);

  const canSubmitOrders = currentPhase === "submitting_orders";
  const isDisabled =
    isLoading ||
    isUserLoading ||
    !user ||
    !canSubmitOrders ||
    (hasPendingOrder && !isSkipped);

  return (
    <div className="mx-auto">
      <Button
        variant={isSkipped ? "destructive" : "secondary"}
        onClick={handleToggleSkip}
        disabled={isDisabled}
        className="w-full"
      >
        {isLoading || isUserLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSkipped ? (
          "Cancel Skip"
        ) : (
          "Skip Order"
        )}
      </Button>
    </div>
  );
}
