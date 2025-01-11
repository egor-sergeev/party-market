"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PHASE_INFO = {
  submitting_orders: {
    next: "executing_orders",
    label: "Execute Orders",
    description: "All players must submit their orders",
  },
  executing_orders: {
    next: "revealing_event",
    label: "Reveal Event",
    description: "Orders are being executed in sequence",
  },
  revealing_event: {
    next: "paying_dividends",
    label: "Pay Dividends",
    description: "Event effects are being applied",
  },
  paying_dividends: {
    next: "submitting_orders",
    label: "Next Round",
    description: "Dividends are being paid",
  },
} as const;

export function PhaseControl({
  currentPhase,
  onProceed,
  disabled,
  className,
}: {
  currentPhase: keyof typeof PHASE_INFO;
  onProceed: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const phase = PHASE_INFO[currentPhase];

  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm p-4 flex items-center justify-between",
        className
      )}
    >
      <div>
        <div className="text-sm font-medium text-gray-500">Current Phase</div>
        <div className="font-medium">{phase.description}</div>
      </div>
      <Button onClick={onProceed} disabled={disabled}>
        Proceed to {phase.label}
      </Button>
    </div>
  );
}
