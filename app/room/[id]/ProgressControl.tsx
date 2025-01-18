"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getPhaseInfo } from "@/lib/game/phases";
import { advancePhase, startRoom } from "@/lib/rooms";
import { Room } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";

interface ProgressControlProps {
  roomId: string;
}

function useRoomProgress(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [roomData, playersData, ordersData] = await Promise.all([
        supabase.from("rooms").select().eq("id", roomId).single(),
        supabase.from("players").select("user_id").eq("room_id", roomId),
        supabase
          .from("orders")
          .select("user_id")
          .eq("room_id", roomId)
          .eq("status", "pending"),
      ]);
      if (roomData.error) throw roomData.error;
      if (playersData.error) throw playersData.error;
      if (ordersData.error) throw ordersData.error;

      const allPlayerIds = new Set(playersData.data.map((p) => p.user_id));
      const submittedPlayerIds = new Set(
        ordersData.data?.map((o) => o.user_id)
      );

      setRoom(roomData.data);
      setPlayerCount(allPlayerIds.size);
      setPendingOrders(submittedPlayerIds);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error fetching game state",
        description: (error as Error).message,
      });
      console.error("Error fetching game state:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase, toast]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`room-progress:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        fetchData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        fetchData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `room_id=eq.${roomId}`,
        },
        fetchData
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchData]);

  const handleAdvance = useCallback(async () => {
    if (!room || isProcessing) return;

    try {
      setIsProcessing(true);

      if (room.status === "WAITING") {
        await startRoom(roomId);
      } else if (room.status === "IN_PROGRESS") {
        await advancePhase(roomId);
      } else if (room.status === "FINISHED") {
        // TODO: Create new room
      }

      router.refresh();
    } catch (error) {
      console.error("Error advancing game:", error);
      toast({
        variant: "destructive",
        title: "Error advancing game",
        description: (error as Error).message,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [room, roomId, router, isProcessing, toast]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName !== "INPUT" &&
          activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          handleAdvance();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAdvance]);

  return {
    room,
    playerCount,
    pendingOrders,
    isLoading,
    isProcessing,
    handleAdvance,
  };
}

export const ProgressControl = memo(function ProgressControl({
  roomId,
}: ProgressControlProps) {
  const {
    room,
    playerCount,
    pendingOrders,
    isLoading,
    isProcessing,
    handleAdvance,
  } = useRoomProgress(roomId);

  const getButtonText = () => {
    if (isProcessing) {
      return "Processing...";
    }

    if (isLoading || !room) {
      return "Loading...";
    }

    return room.current_phase
      ? getPhaseInfo(room.current_phase)?.nextLabel || "Next Phase"
      : "Start Game";
  };

  const isDisabled =
    isLoading ||
    !room ||
    (room.status === "IN_PROGRESS" &&
      room.current_phase === "submitting_orders" &&
      pendingOrders.size < playerCount);

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="h-5 text-sm text-muted-foreground text-center font-medium">
        {!isLoading && room?.status === "IN_PROGRESS" && room.current_phase && (
          <>
            {getPhaseInfo(room.current_phase)?.label}
            {room.current_phase === "submitting_orders" && (
              <>
                {" "}
                • {pendingOrders.size} of {playerCount} orders submitted
              </>
            )}
          </>
        )}
      </div>
      <Button
        size="lg"
        disabled={isDisabled}
        onClick={handleAdvance}
        className="w-full h-14 text-lg font-semibold relative"
      >
        <span className="flex items-center gap-2">
          {(isProcessing || isLoading) && (
            <Loader2 className="w-5 h-5 animate-spin" />
          )}
          {getButtonText()}
          {!isProcessing && !isLoading && (
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌴</span>
              SPACE
            </kbd>
          )}
        </span>
      </Button>
    </div>
  );
});
