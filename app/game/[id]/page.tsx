"use client";

import { PlayerInfo } from "./PlayerInfo";
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
      <div className="container space-y-6 py-6">
        <StocksList roomId={id} />
      </div>
    </>
  );
}
