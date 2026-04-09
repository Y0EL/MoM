import { useCallback, useEffect, useRef } from 'react';
import { useContextStore } from '../stores/contextStore';
import { useMeetingStore } from '../stores/meetingStore';

export const useContextTimer = () => {
  const { isActive, isPaused, duration, userContext } = useMeetingStore();
  const { isGeneratingContext, lastGeneratedSegment, addContextCard, setGeneratingContext, setLastGeneratedSegment, resetContextState } = useContextStore();

  // Use a ref so generateContext always has fresh values without being a dep of the duration effect
  const stateRef = useRef({ isGeneratingContext, lastGeneratedSegment, userContext });
  useEffect(() => {
    stateRef.current = { isGeneratingContext, lastGeneratedSegment, userContext };
  }, [isGeneratingContext, lastGeneratedSegment, userContext]);

  const generateContext = useCallback(async (segmentIndex: number) => {
    const finalTranscript = useMeetingStore.getState().finalTranscript;
    const currentDuration = useMeetingStore.getState().duration;
    if (!finalTranscript.trim()) return;

    setGeneratingContext(true);
    // Mark this segment as in-progress immediately so we don't double-trigger
    setLastGeneratedSegment(segmentIndex);

    try {
      const startMin = segmentIndex * 10;
      const endMin = Math.min((segmentIndex + 1) * 10, Math.floor(currentDuration / 60));

      const timeRange = {
        start: `${startMin.toString().padStart(2, '0')}:00`,
        end: `${endMin.toString().padStart(2, '00')}:00`
      };

      const response = await fetch('http://localhost:8000/mom/context/compact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: finalTranscript,
          segment_index: segmentIndex,
          time_range: timeRange,
          user_context: stateRef.current.userContext
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          addContextCard(data.context_card);
        }
      } else {
        console.error('[Context] Failed to generate context card:', response.status);
      }
    } catch (error) {
      console.error('[Context] Error generating context:', error);
    } finally {
      setGeneratingContext(false);
    }
  }, [addContextCard, setGeneratingContext, setLastGeneratedSegment]);

  useEffect(() => {
    // Only run during an active, non-paused live meeting
    if (!isActive || isPaused) return;

    // Current 2-minute segment (0-indexed): segment 0 = 0-2 min, segment 1 = 2-4 min, etc.
    // Trigger at the START of each new segment (i.e., duration just crossed a 2-min boundary)
    const currentSegment = Math.floor(duration / 600); // 120 seconds = 2 minutes (testing)

    // Only generate if:
    // 1. We have passed at least 1 full segment (duration >= 600s = 10 min)
    // 2. The current segment is new (hasn't been generated yet)
    // 3. Not currently generating
    if (
      duration >= 600 &&
      currentSegment > stateRef.current.lastGeneratedSegment &&
      !stateRef.current.isGeneratingContext
    ) {
      // The completed segment is currentSegment - 1 (the one that just ended)
      const completedSegment = currentSegment - 1;
      if (completedSegment > stateRef.current.lastGeneratedSegment) {
        generateContext(completedSegment);
      }
    }
  }, [duration, isActive, isPaused, generateContext]);

  // Reset context state when meeting ends
  useEffect(() => {
    if (!isActive) {
      resetContextState();
    }
  }, [isActive, resetContextState]);
};

