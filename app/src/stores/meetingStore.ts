import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface WordCorrection {
  word: string;
  originalWord: string;
  index: number;
  isCorrected: boolean;
}

export interface MeetingState {
  // Meeting session state
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  startTime: number | null;
  meetingId: string | null;
  
  // Transcript state
  transcript: string;
  finalTranscript: string;
  corrections: WordCorrection[];
  
  // Audio state
  isListening: boolean;
  volumes: number[];
  
  // User context
  userContext: string;
  
  // Actions
  startMeeting: () => void;
  pauseMeeting: () => void;
  resumeMeeting: () => void;
  endMeeting: () => void;
  setTranscript: (transcript: string) => void;
  setFinalTranscript: (transcript: string) => void;
  addCorrection: (correction: WordCorrection) => void;
  updateCorrection: (index: number, word: string) => void;
  updateCorrectionWithSync: (index: number, word: string, originalWord: string) => Promise<void>;
  loadCorrectionsFromBackend: (meetingId: string) => Promise<void>;
  setVolumes: (volumes: number[]) => void;
  setListening: (listening: boolean) => void;
  setDuration: (duration: number) => void;
  setUserContext: (context: string) => void;
  setMeetingId: (meetingId: string | null) => void;
  resetMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isActive: false,
      isPaused: false,
      duration: 0,
      startTime: null,
      meetingId: null,
      transcript: '',
      finalTranscript: '',
      corrections: [],
      isListening: false,
      volumes: new Array(25).fill(5),
      userContext: '',

      // Actions
      startMeeting: () => set({ 
        isActive: true, 
        isPaused: false, 
        startTime: Date.now(),
        duration: 0,
        meetingId: null,
        transcript: '',
        finalTranscript: '',
        corrections: [],
        userContext: ''
      }),

      pauseMeeting: () => set({ isPaused: true }),

      resumeMeeting: () => set({ isPaused: false }),

      endMeeting: () => set({ 
        isActive: false, 
        isPaused: false,
        isListening: false 
      }),

      setTranscript: (transcript) => set({ transcript }),

      setFinalTranscript: (finalTranscript) => set({ finalTranscript }),

      addCorrection: (correction) => set((state) => ({
        corrections: [...state.corrections, correction]
      })),

      updateCorrection: (index, word) => set((state) => {
        const newCorrections = [...state.corrections];
        const existingIndex = newCorrections.findIndex(c => c && c.index === index);
        
        if (existingIndex !== -1) {
          // Update existing correction
          newCorrections[existingIndex] = {
            ...newCorrections[existingIndex],
            word,
            isCorrected: true
          };
        } else {
          // Add new correction
          newCorrections.push({
            word,
            originalWord: word, // Fallback, seharusnya di-set dari luar
            index,
            isCorrected: true
          });
        }
        return { corrections: newCorrections };
      }),

      setVolumes: (volumes) => set({ volumes }),

      setListening: (isListening) => set({ isListening }),

      setDuration: (duration) => set({ duration }),

      setUserContext: (userContext) => set({ userContext }),

      setMeetingId: (meetingId) => set({ meetingId }),

      updateCorrectionWithSync: async (index: number, word: string, originalWord: string) => {
        const { meetingId, corrections } = get();
        
        // Update local state first (always update, regardless of meetingId)
        const newCorrections = [...corrections];
        const existingIndex = newCorrections.findIndex(c => c && c.index === index);
        
        if (existingIndex !== -1) {
          // Update existing correction
          newCorrections[existingIndex] = {
            ...newCorrections[existingIndex],
            word,
            originalWord,
            isCorrected: true
          };
        } else {
          // Add new correction
          newCorrections.push({
            word,
            originalWord,
            index,
            isCorrected: true
          });
        }
        set({ corrections: newCorrections });

        // Only sync to backend if we have a meetingId (for saved meetings)
        if (!meetingId) {
          console.log('Live transcript mode - correction saved locally only');
          return;
        }

        // Sync to backend for saved meetings
        try {
          const response = await fetch('http://localhost:8000/word-corrections', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meeting_id: meetingId,
              word_index: index,
              original_word: originalWord,
              corrected_word: word
            })
          });

          if (!response.ok) {
            console.error('Failed to sync correction to backend');
          }
        } catch (error) {
          console.error('Error syncing correction to backend:', error);
        }
      },

      loadCorrectionsFromBackend: async (meetingId: string) => {
        try {
          const response = await fetch(`http://localhost:8000/word-corrections/${meetingId}`);
          if (!response.ok) {
            console.error('Failed to load corrections from backend');
            return;
          }

          const data = await response.json();
          if (data.success && data.corrections) {
            const corrections: WordCorrection[] = data.corrections.map((c: any) => ({
              word: c.corrected_word,
              originalWord: c.original_word,
              index: c.word_index,
              isCorrected: true
            }));
            set({ corrections });
          }
        } catch (error) {
          console.error('Error loading corrections from backend:', error);
        }
      },

      resetMeeting: () => set({
        isActive: false,
        isPaused: false,
        duration: 0,
        startTime: null,
        meetingId: null,
        transcript: '',
        finalTranscript: '',
        corrections: [],
        isListening: false,
        volumes: new Array(25).fill(5),
        userContext: ''
      })
    }),
    {
      name: 'meeting-store'
    }
  )
);
