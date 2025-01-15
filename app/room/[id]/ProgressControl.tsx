"use client";

import { Button } from "@/components/ui/button";
import { advancePhase, createRoom, startRoom } from "@/lib/rooms";
import { Room, RoomPhase } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";

interface ProgressControlProps {
  roomId: string;
}

const PHASE_LABELS: Record<RoomPhase, string> = {
  waiting: "Waiting",
  submitting_orders: "Order Submission",
  executing_orders: "Order Execution",
  revealing_event: "Event Reveal",
  paying_dividends: "Dividend Payment",
};

const getNextPhaseLabel = (currentPhase: RoomPhase): string => {
  switch (currentPhase) {
    case "waiting":
      return "Submit Orders";
    case "submitting_orders":
      return "Reveal Events";
    case "revealing_event":
      return "Execute Orders";
    case "executing_orders":
      return "Pay Dividends";
    case "paying_dividends":
      return "Next Round";
    default:
      return "Next Phase";
  }
};

function useRoomProgress(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const [roomData, playersData, ordersData] = await Promise.all([
        supabase.from("rooms").select().eq("id", roomId).single(),
        supabase.from("players").select("id").eq("room_id", roomId),
        supabase
          .from("orders")
          .select("player_id")
          .eq("room_id", roomId)
          .eq("status", "pending"),
      ]);

      if (roomData.error || playersData.error || ordersData.error)
        throw roomData.error;

      const allPlayerIds = new Set(playersData.data.map((p) => p.id));
      const submittedPlayerIds = new Set(
        ordersData.data?.map((o) => o.player_id)
      );

      setRoom(roomData.data);
      setPlayerCount(allPlayerIds.size);
      setPendingOrders(submittedPlayerIds);
      setError(null);
    } catch (error) {
      setError(error as Error);
      console.error("Error fetching game state:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase]);

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
      setError(null);

      if (room.status === "WAITING") {
        await startRoom(roomId);
      } else if (room.status === "IN_PROGRESS") {
        await advancePhase(roomId);
      } else {
        const newRoom = await createRoom();
        router.push(`/room/${newRoom.id}`);
      }
    } catch (error) {
      console.error("Error advancing game:", error);
      setError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  }, [room, roomId, router, isProcessing]);

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
    error,
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
    error,
    handleAdvance,
  } = useRoomProgress(roomId);

  if (isLoading || !room) return null;

  const getButtonText = () => {
    if (isProcessing) {
      if (room.status === "WAITING") return "Starting Game...";
      if (room.status === "FINISHED") return "Creating Room...";
      return "Processing...";
    }

    if (room.status === "WAITING") return "Start Game";
    if (room.status === "FINISHED") return "Create New Room";
    return `Proceed to ${getNextPhaseLabel(room.current_phase)}`;
  };

  const getDisabledReason = () => {
    if (room.status === "WAITING" && playerCount < 2) {
      return "Waiting for more players to join...";
    }
    if (
      room.status === "IN_PROGRESS" &&
      room.current_phase === "submitting_orders" &&
      pendingOrders.size < playerCount
    ) {
      return "Waiting for all players to submit orders...";
    }
    return null;
  };

  const disabledReason = getDisabledReason();
  const isDisabled = Boolean(disabledReason);

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-2">
        <div className="text-sm text-muted-foreground h-5">
          {room.status === "IN_PROGRESS" && (
            <>
              <span className="font-medium">
                {PHASE_LABELS[room.current_phase]}
              </span>
              {room.current_phase === "submitting_orders" && (
                <>
                  {" "}
                  • {pendingOrders.size} of {playerCount} orders submitted
                </>
              )}
            </>
          )}
        </div>

        <div className="w-full max-w-2xl mx-auto relative">
          {error && (
            <div className="absolute -top-8 left-0 right-0 text-sm text-red-500 text-center">
              {error.message}
            </div>
          )}
          <Button
            size="lg"
            disabled={isDisabled}
            onClick={handleAdvance}
            className="w-full h-16 text-lg font-semibold relative"
          >
            <span className="flex items-center gap-2">
              {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
              {getButtonText()}
              {!isProcessing && (
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌴</span>
                  SPACE
                </kbd>
              )}
            </span>
          </Button>
        </div>

        <div className="h-5 text-sm">
          {disabledReason && (
            <div className="text-muted-foreground">{disabledReason}</div>
          )}
        </div>
      </div>
    </div>
  );
});
