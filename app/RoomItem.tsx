import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { RoomStatus } from "@/lib/types/supabase";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface RoomItemProps {
  id: string;
  code: string;
  status: RoomStatus;
  createdAt: string;
}

export function RoomItem({ id, code, status, createdAt }: RoomItemProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <p className="font-semibold">Room {code}</p>
            <Badge
              variant={
                status === "WAITING"
                  ? "secondary"
                  : status === "IN_PROGRESS"
                  ? "default"
                  : "outline"
              }
            >
              {status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt))} ago
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/lobby/${id}`} className="w-full">
          <Button className="w-full">Enter Room</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
