"use client";

import { Button } from "@/components/ui/button";
import { getPhaseInfo } from "@/lib/game-engine/phase-manager";
import { type RoomPhase } from "@/lib/types/game";
import { cn } from "@/lib/utils";

interface PhaseControlProps {
  phase: RoomPhase;
  onProceedPhase: () => void;
  disabled?: boolean;
  className?: string;
}

export function PhaseControl({
  phase,
  onProceedPhase,
  disabled,
  className,
}: PhaseControlProps) {
  const phaseInfo = getPhaseInfo(phase);

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Current Phase</div>
        <div className="font-medium">{phaseInfo.description}</div>
      </div>
      <Button onClick={onProceedPhase} disabled={disabled}>
        Proceed to {phaseInfo.label}
      </Button>
    </div>
  );
}
