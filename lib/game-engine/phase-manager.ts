import { type RoomPhase } from "@/lib/types/game";
import { supabase } from "@/lib/utils";
import { distributeDividends } from "./dividends";
import { generateNewEvent, revealEventEffects } from "./events";
import { executeAllOrders } from "./order-execution";

interface PhaseConfig {
  next: RoomPhase;
  label: string;
  description: string;
  action?: (roomId: string) => Promise<any>;
  shouldIncrementRound?: boolean;
}

export const PHASE_CONFIG: Record<RoomPhase, PhaseConfig> = {
  waiting: {
    next: "submitting_orders",
    label: "Start Game",
    description: "Waiting for players to join",
  },
  submitting_orders: {
    next: "executing_orders",
    label: "Execute Orders",
    description: "Players are submitting their orders",
    action: executeAllOrders,
  },
  executing_orders: {
    next: "revealing_event",
    label: "Reveal Event",
    description: "Orders are being executed",
    action: revealEventEffects,
  },
  revealing_event: {
    next: "paying_dividends",
    label: "Pay Dividends",
    description: "Event effects are being revealed and applied",
    action: revealEventEffects,
  },
  paying_dividends: {
    next: "generating_event",
    label: "Generate Event",
    description: "Dividends are being paid to players",
    action: distributeDividends,
  },
  generating_event: {
    next: "submitting_orders",
    label: "Next Round",
    description: "Preparing the next round",
    action: generateNewEvent,
    shouldIncrementRound: true,
  },
};

export async function advancePhase(roomId: string, currentPhase: RoomPhase) {
  try {
    const phaseConfig = PHASE_CONFIG[currentPhase];
    if (!phaseConfig) {
      throw new Error(`Invalid phase: ${currentPhase}`);
    }

    // Execute phase action if exists
    if (phaseConfig.action) {
      await phaseConfig.action(roomId);
    }

    // Update room phase and round if needed
    const updates: Partial<{
      current_phase: RoomPhase;
      current_round: number;
    }> = {
      current_phase: phaseConfig.next,
    };

    if (phaseConfig.shouldIncrementRound) {
      const { data: room } = await supabase
        .from("rooms")
        .select("current_round")
        .eq("id", roomId)
        .single();

      if (room) {
        updates.current_round = room.current_round + 1;
      }
    }

    const { error } = await supabase
      .from("rooms")
      .update(updates)
      .eq("id", roomId);

    if (error) throw error;

    return {
      success: true,
      nextPhase: phaseConfig.next,
      description: PHASE_CONFIG[phaseConfig.next].description,
    };
  } catch (error) {
    console.error("Error advancing phase:", error);
    throw error;
  }
}

export function getPhaseInfo(phase: RoomPhase) {
  return PHASE_CONFIG[phase];
}

export function formatPhase(phase: RoomPhase): string {
  return phase
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
