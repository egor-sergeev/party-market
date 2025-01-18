import { defaultSettings, loadSettings } from "./settings";
import { Room } from "./types/supabase";

export async function createRoom(): Promise<Room> {
  const settings = loadSettings();
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ settings }),
  });

  if (!response.ok) throw new Error("Failed to create room");

  const room: Room = await response.json();
  return room;
}

export async function startRoom(roomId: string): Promise<void> {
  const response = await fetch(`/api/rooms/${roomId}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ totalRounds: defaultSettings.total_rounds }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to start room:", {
      status: response.status,
      statusText: response.statusText,
      data,
    });
    throw new Error(data.error || "Failed to start room");
  }
}

export async function advancePhase(roomId: string): Promise<void> {
  const response = await fetch(`/api/rooms/${roomId}/next-phase`, {
    method: "POST",
  });

  if (!response.ok) throw new Error("Failed to advance phase");
}
