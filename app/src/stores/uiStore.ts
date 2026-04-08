import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Panel states
  activePanel: 'transcription' | 'correction';
  showContextInput: boolean;
  
  // Visualizer settings
  visualizerEnabled: boolean;
  
  // Layout states
  sidebarOpen: boolean;
  
  // Actions
  setActivePanel: (panel: 'transcription' | 'correction') => void;
  toggleContextInput: () => void;
  setVisualizerEnabled: (enabled: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Initial state
      activePanel: 'transcription',
      showContextInput: false,
      visualizerEnabled: true,
      sidebarOpen: true,

      // Actions
      setActivePanel: (activePanel) => set({ activePanel }),
      
      toggleContextInput: () => set((state) => ({ 
        showContextInput: !state.showContextInput 
      })),
      
      setVisualizerEnabled: (visualizerEnabled) => set({ visualizerEnabled }),
      
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen })
    }),
    {
      name: 'ui-store'
    }
  )
);
