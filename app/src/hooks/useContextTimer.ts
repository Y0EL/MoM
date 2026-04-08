import { useEffect, useCallback } from 'react';
import { useMeetingStore } from '../stores/meetingStore';
import { useContextStore } from '../stores/contextStore';

export const useContextTimer = () => {
  const { isActive, isPaused, duration, finalTranscript, userContext } = useMeetingStore();
  const { addContextCard, setGeneratingContext, startContextTimer, stopContextTimer } = useContextStore();

  const generateContext = useCallback(async () => {
    if (!finalTranscript.trim()) return;

    setGeneratingContext(true);
    
    try {
      // Calculate segment index based on duration
      const segmentIndex = Math.floor(duration / 600); // 10 minutes = 600 seconds
      
      // Calculate time range
      const startMin = segmentIndex * 10;
      const endMin = Math.min((segmentIndex + 1) * 10, Math.floor(duration / 60));
      
      const timeRange = {
        start: `${startMin.toString().padStart(2, '0')}:00`,
        end: `${endMin.toString().padStart(2, '0')}:00`
      };

      // Call backend to generate context
      const response = await fetch('http://localhost:8000/mom/context/compact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: finalTranscript,
          segment_index: segmentIndex,
          time_range: timeRange,
          user_context: userContext
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          addContextCard(data.context_card);
        }
      } else {
        console.error('Failed to generate context card');
      }
    } catch (error) {
      console.error('Error generating context:', error);
    } finally {
      setGeneratingContext(false);
    }
  }, [finalTranscript, duration, userContext, addContextCard, setGeneratingContext]);

  useEffect(() => {
    if (isActive && !isPaused) {
      // Start context timer
      startContextTimer(() => {
        const currentDuration = useMeetingStore.getState().duration;
        const minutesElapsed = Math.floor(currentDuration / 60);
        
        // Generate context every 10 minutes
        if (minutesElapsed > 0 && minutesElapsed % 10 === 0) {
          generateContext();
        }
      });
    } else {
      // Stop context timer when meeting is paused or ended
      stopContextTimer();
    }

    return () => {
      stopContextTimer();
    };
  }, [isActive, isPaused, startContextTimer, stopContextTimer, generateContext]);
};
