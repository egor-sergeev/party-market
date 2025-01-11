"use client";

import { usePlayer } from "@/lib/hooks/usePlayer";
import { useRoom } from "@/lib/hooks/useRoom";

export default function GamePage({ params }: { params: { id: string } }) {
  const { room, loading: roomLoading } = useRoom(params.id);
  const { player, loading: playerLoading } = usePlayer(params.id);

  if (roomLoading || playerLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!room || !player) {
    return <div className="p-8">Game not found</div>;
  }

  if (room.status === "WAITING") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Waiting for Game to Start
            </h1>
            <p className="text-gray-600">
              You&apos;ve joined as{" "}
              <span className="font-medium">{player.name}</span>
            </p>
            <div className="mt-4 text-sm text-gray-500">
              The game will begin when the host starts it
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-lg font-medium mb-2">Your Balance</div>
            <div className="text-3xl font-bold">
              ${player.cash.toLocaleString()}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // TODO: Implement actual player UI when status is "IN_PROGRESS"
  return <div className="p-8">Game is in progress...</div>;
}
