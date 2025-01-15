"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Event, Room, Stock } from "@/lib/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useCallback, useEffect, useState } from "react";

interface EventCardProps {
  roomId: string;
}

export function EventCard({ roomId }: EventCardProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [stocks, setStocks] = useState<Record<string, Stock>>({});
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  const fetchData = useCallback(async () => {
    try {
      // Get current room to know the round
      const { data: room } = await supabase
        .from("rooms")
        .select()
        .eq("id", roomId)
        .single();

      if (!room) return;

      setRoom(room);

      // Get event for current round
      const { data: event } = await supabase
        .from("events")
        .select()
        .eq("room_id", roomId)
        .eq("round", room.current_round)
        .single();

      if (!event) {
        setEvent(null);
        return;
      }

      // Get stocks for effect descriptions
      const { data: stocks } = await supabase
        .from("stocks")
        .select()
        .eq("room_id", roomId);

      setEvent(event);
      setStocks(
        stocks?.reduce(
          (acc, stock) => ({ ...acc, [stock.id]: stock }),
          {} as Record<string, Stock>
        ) || {}
      );
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, supabase]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`event:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `room_id=eq.${roomId}`,
        },
        fetchData
      )
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
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, supabase, fetchData]);

  if (isLoading) {
    return (
      <Card className="h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading event...</p>
      </Card>
    );
  }

  if (!event || !room) {
    return (
      <Card className="h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No event for this round</p>
      </Card>
    );
  }

  const shouldShowEffects = (room: Room) =>
    room.status === "IN_PROGRESS" && room.current_phase !== "submitting_orders";

  const formatEffect = (effect: Event["effects"][number]) => {
    const stock = stocks[effect.stock_id];
    if (!stock) return null;

    const change = effect.amount;
    const isPositive = change > 0;
    const changeText = isPositive ? `+${change}` : change;

    return (
      <div
        key={`${effect.stock_id}-${effect.type}`}
        className="flex items-center justify-between text-sm"
      >
        <span>{stock.symbol}</span>
        <span
          className={
            isPositive
              ? "text-green-500 font-medium"
              : "text-red-500 font-medium"
          }
        >
          {effect.type === "price_change" ? "$" : ""}
          {changeText}
          {effect.type === "dividend_change" ? " dividend" : ""}
        </span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{event.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{event.description}</p>

        {shouldShowEffects(room) ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Effects:</p>
            <div className="space-y-1">{event.effects.map(formatEffect)}</div>
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            Effects will be revealed after all orders are submitted
          </p>
        )}
      </CardContent>
    </Card>
  );
}
