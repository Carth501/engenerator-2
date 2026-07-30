import { create } from "zustand";
import type { ScaleName } from "./lib/types";

interface AppState {
  seed: string;
  scale: ScaleName;
  selectedId: number | null;
  setSeed: (seed: string) => void;
  setScale: (scale: ScaleName) => void;
  selectCharacter: (id: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  seed: "ashgrove-01",
  scale: "Regional",
  selectedId: null,
  setSeed: (seed) => set({ seed }),
  setScale: (scale) => set({ scale }),
  selectCharacter: (selectedId) => set({ selectedId }),
}));
