interface GameResultProps {
  place: number;
  totalPlayers: number;
}

export function GameResult({ place, totalPlayers }: GameResultProps) {
  return (
    <div className="text-center p-8 bg-white rounded-lg shadow">
      <div className="text-8xl font-bold mb-4">#{place}</div>
      <div className="text-gray-500">
        out of {totalPlayers} player{totalPlayers !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
