import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-4">
      <h1 className="text-4xl font-bold mb-8">Party Market Game</h1>
      <div className="flex gap-4">
        <Link href="/lobby">
          <Button size="lg">Control Panel</Button>
        </Link>
        <Link href="/join">
          <Button size="lg" variant="secondary">
            Join Game
          </Button>
        </Link>
      </div>
    </main>
  );
}
