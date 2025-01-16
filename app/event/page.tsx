"use client";

import { Button } from "@/components/ui/button";
import { Event } from "@/lib/types/supabase";
import { useState } from "react";

export default function EventDebugPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateEvent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/event");
      if (!response.ok) throw new Error("Failed to generate event");
      const newEvent = await response.json();
      setEvent(newEvent);
    } catch (error) {
      console.error("Error generating event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button onClick={handleGenerateEvent} disabled={isLoading}>
          Get Event
        </Button>

        {event && (
          <pre className="p-4 rounded-lg border bg-muted whitespace-pre-wrap overflow-auto">
            {JSON.stringify(event, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
