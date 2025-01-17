"use client";

import { toast } from "@/hooks/use-toast";

interface RoomCodeProps {
  code: string;
}

export function RoomCode({ code }: RoomCodeProps) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        description: "Room code copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      console.debug("Could not copy to clipboard:", error);
    }
  };

  return (
    <div
      onClick={copyToClipboard}
      className="text-2xl font-mono font-medium tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
    >
      {code}
    </div>
  );
}
