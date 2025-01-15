import { RoomPhase } from "@/lib/types/supabase";

export const PHASE_ORDER: RoomPhase[] = [
  "submitting_orders",
  "revealing_event",
  "executing_orders",
  "paying_dividends",
];

interface PhaseInfo {
  label: string;
  description: string;
  nextLabel: string;
}

const PHASE_INFO: Record<RoomPhase, PhaseInfo> = {
  submitting_orders: {
    label: "Submitting Orders",
    description: "Players are submitting their buy/sell orders",
    nextLabel: "Reveal Event",
  },
  revealing_event: {
    label: "Event Revealed",
    description: "Event effects are being applied to stocks",
    nextLabel: "Execute Orders",
  },
  executing_orders: {
    label: "Executing Orders",
    description: "Orders are being executed in chronological order",
    nextLabel: "Pay Dividends",
  },
  paying_dividends: {
    label: "Paying Dividends",
    description: "Dividends are being paid to stockholders",
    nextLabel: "Next Round",
  },
  waiting: {
    label: "Waiting",
    description: "Waiting for the game to start",
    nextLabel: "Start Game",
  },
};

export function getPhaseInfo(phase: RoomPhase): PhaseInfo {
  return PHASE_INFO[phase];
}

export function getNextPhase(currentPhase: RoomPhase): RoomPhase {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  return PHASE_ORDER[(currentIndex + 1) % PHASE_ORDER.length];
}

export function isLastPhase(phase: RoomPhase): boolean {
  return phase === PHASE_ORDER[PHASE_ORDER.length - 1];
}
