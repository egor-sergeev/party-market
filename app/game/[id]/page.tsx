"use client";

import { PlayerInfo } from "./PlayerInfo";
import { SkipOrderButton } from "./SkipOrderButton";
import { StocksList } from "./StocksList";

interface GamePageProps {
  params: {
    id: string;
  };
}

export default function GamePage({ params: { id } }: GamePageProps) {
  return (
    <>
      <PlayerInfo roomId={id} />
      <div className="container max-w-2xl space-y-4 py-4">
        <StocksList roomId={id} />
        <SkipOrderButton roomId={id} />
      </div>
    </>
  );
}
