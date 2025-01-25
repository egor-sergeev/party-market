"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Event, Room, Stock } from "@/lib/types/supabase";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface EventCardProps {
  roomId: string;
}

export function EventCard({ roomId }: EventCardProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [stocks, setStocks] = useState<Record<string, Stock>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClientComponentClient();

  // Auto-expand on order execution phase
  useEffect(() => {
    setIsOpen(true);
  }, [room?.current_phase]);

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
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select()
        .eq("room_id", roomId)
        .eq("round", room.current_round)
        .maybeSingle();

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
      <Card className="h-[120px] flex items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading event...</p>
      </Card>
    );
  }

  if (!event || !room) {
    return null;
  }

  const shouldShowEffects = (room: Room) =>
    room.status === "IN_PROGRESS" && room.current_phase !== "submitting_orders";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("transition-shadow", isOpen && "shadow-lg")}>
        <CollapsibleTrigger className="w-full outline-none">
          <CardHeader className="px-6 py-3 flex flex-row items-center hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-1 h-6 rounded-full bg-primary/30" />
              <CardTitle className="text-lg font-semibold">
                {event.title}
              </CardTitle>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground/50 transition-transform duration-200 shrink-0",
                isOpen && "transform rotate-180"
              )}
            />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pr-5 pl-0 pb-3 pt-0">
            <p className="text-muted-foreground leading-relaxed pl-5">
              {event.description}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
