"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface RoomCodeProps {
  code: string;
}

export function RoomCode({ code }: RoomCodeProps) {
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setHasCopied(true);
    toast({
      description: "Room code copied to clipboard",
      duration: 1000,
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="font-mono"
      onClick={copyToClipboard}
    >
      {code}
      {hasCopied ? (
        <Check className="ml-2 h-4 w-4" />
      ) : (
        <Copy className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}
