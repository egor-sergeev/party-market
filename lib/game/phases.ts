import { RoomPhase } from "../types/supabase";

interface PhaseInfo {
  label: string;
  nextLabel: string;
}

const PHASE_INFO: Record<RoomPhase, PhaseInfo> = {
  waiting: {
    label: "Waiting for players",
    nextLabel: "Start Game",
  },
  reading_event: {
    label: "Reading Event",
    nextLabel: "Start Trading",
  },
  submitting_orders: {
    label: "Submitting Orders",
    nextLabel: "Execute Orders",
  },
  executing_orders: {
    label: "Executing Orders",
    nextLabel: "Reveal Event",
  },
  revealing_event: {
    label: "Revealing Event",
    nextLabel: "Pay Dividends",
  },
  paying_dividends: {
    label: "Paying Dividends",
    nextLabel: "Next Round",
  },
};

export function getPhaseInfo(phase: RoomPhase): PhaseInfo {
  return PHASE_INFO[phase];
}

export function getNextPhase(currentPhase: RoomPhase): RoomPhase {
  switch (currentPhase) {
    case "waiting":
      return "reading_event";
    case "reading_event":
      return "submitting_orders";
    case "submitting_orders":
      return "executing_orders";
    case "executing_orders":
      return "revealing_event";
    case "revealing_event":
      return "paying_dividends";
    case "paying_dividends":
      return "reading_event";
    default:
      return "waiting";
  }
}

export function isLastPhase(phase: RoomPhase): boolean {
  return phase === "paying_dividends";
}
