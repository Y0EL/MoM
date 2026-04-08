import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ContextCard } from '../lib/schemas/contextCard';

interface ContextState {
  // Context cards
  contextCards: ContextCard[];
  isGeneratingContext: boolean;
  
  // Timer state
  contextTimer: NodeJS.Timeout | null;
  lastContextTime: number; // minutes
  
  // Actions
  addContextCard: (card: ContextCard) => void;
  setContextCards: (cards: ContextCard[]) => void;
  setGeneratingContext: (generating: boolean) => void;
  startContextTimer: (callback: () => void) => void;
  stopContextTimer: () => void;
  resetContextState: () => void;
}

export const useContextStore = create<ContextState>()(
  devtools(
    (set, get) => ({
      // Initial state
      contextCards: [],
      isGeneratingContext: false,
      contextTimer: null,
      lastContextTime: 0,

      // Actions
      addContextCard: (card) => set((state) => ({
        contextCards: [...state.contextCards, card]
      })),

      setContextCards: (cards) => set({ contextCards: cards }),

      setGeneratingContext: (isGeneratingContext) => set({ isGeneratingContext }),

      startContextTimer: (callback) => {
        const state = get();
        if (state.contextTimer) return;

        const timer = setInterval(() => {
          const currentState = get();
          if (!currentState.isGeneratingContext) {
            callback();
          }
        }, 60000); // Check every minute

        set({ contextTimer: timer });
      },

      stopContextTimer: () => {
        const state = get();
        if (state.contextTimer) {
          clearInterval(state.contextTimer);
          set({ contextTimer: null });
        }
      },

      resetContextState: () => {
        const state = get();
        if (state.contextTimer) {
          clearInterval(state.contextTimer);
        }
        set({
          contextCards: [],
          isGeneratingContext: false,
          contextTimer: null,
          lastContextTime: 0
        });
      }
    }),
    {
      name: 'context-store'
    }
  )
);
