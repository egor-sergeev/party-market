const SETTINGS_KEY = "party-market-settings";

export const MIN_INITIAL_STOCK_PRICE: number = 10;
export const MAX_INITIAL_STOCK_PRICE: number = 200;
export const MIN_INITIAL_DIVIDEND_AMOUNT: number = 5;
export const MAX_INITIAL_DIVIDEND_AMOUNT: number = 100;


export interface RoomSettings {
  initial_cash: number;
  number_of_stocks: number;
  total_rounds: number;
  events_tone: string;
  events_language: string;
}

export const defaultSettings: RoomSettings = {
  initial_cash: 100,
  number_of_stocks: 10,
  total_rounds: 10,
  events_tone: "Write in a casual, friendly tone",
  events_language: "English",
};

export function saveSettings(settings: RoomSettings) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

export function loadSettings(): RoomSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {
    return defaultSettings;
  }
}
