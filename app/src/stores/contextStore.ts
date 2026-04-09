import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ContextCard } from '../lib/schemas/contextCard';

interface ContextState {
  // Context cards
  contextCards: ContextCard[];
  isGeneratingContext: boolean;
  
  // Segment tracking (replaces interval-based timer with stale closure bug)
  lastGeneratedSegment: number; // last segment index that was generated (-1 = none)
  
  // Actions
  addContextCard: (card: ContextCard) => void;
  setContextCards: (cards: ContextCard[]) => void;
  setGeneratingContext: (generating: boolean) => void;
  setLastGeneratedSegment: (segment: number) => void;
  resetContextState: () => void;
}

export const useContextStore = create<ContextState>()(
  devtools(
    (set) => ({
      // Initial state
      contextCards: [],
      isGeneratingContext: false,
      lastGeneratedSegment: -1,

      // Actions
      addContextCard: (card) => set((state) => ({
        contextCards: [...state.contextCards, card]
      })),

      setContextCards: (cards) => set({ contextCards: cards }),

      setGeneratingContext: (isGeneratingContext) => set({ isGeneratingContext }),

      setLastGeneratedSegment: (lastGeneratedSegment) => set({ lastGeneratedSegment }),

      resetContextState: () => {
        set({
          contextCards: [],
          isGeneratingContext: false,
          lastGeneratedSegment: -1,
        });
      }
    }),
    {
      name: 'context-store'
    }
  )
);
