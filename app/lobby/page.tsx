import CreateRoomForm from "@/components/lobby/CreateRoomForm";
import RoomsList from "@/components/lobby/RoomsList";

export default function ControlPanel() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Control Panel</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Create New Game</h2>
          <CreateRoomForm />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Active Games</h2>
          <RoomsList />
        </div>
      </div>
    </main>
  );
}
