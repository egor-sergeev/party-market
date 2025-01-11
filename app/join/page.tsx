import JoinGameForm from "@/components/game/JoinGameForm";

export default function JoinGame() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Join Game</h1>
          <p className="mt-2 text-gray-600">
            Enter your name and game ID to join
          </p>
        </div>

        <JoinGameForm />
      </div>
    </main>
  );
}
