"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, Edit3, FileText, X } from "lucide-react";
import { useState } from "react";
import { useContextTimer } from "../hooks/useContextTimer";
import { useContextStore } from "../stores/contextStore";
import { useMeetingStore } from "../stores/meetingStore";
import ContextCard from "./ContextCard";
import CorrectionPanel from "./CorrectionPanel";
import SiriWaveform from "./SiriWaveform";

export default function SplitMeetingLayout() {
  const { finalTranscript, transcript, duration } = useMeetingStore();
  const { contextCards, isGeneratingContext } = useContextStore();

  // Local toggle state for the AI Context panel
  const [showContextPanel, setShowContextPanel] = useState(false);

  useContextTimer();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "00")}`;
  };

  const hasContextCards = contextCards.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)]">
      {/* Waveform */}
      <div className="w-full px-6 pt-6 pb-4">
        <SiriWaveform />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-black text-[var(--text-main)]">
              {formatTime(duration)}
            </span>
          </div>
          <div className="text-xs font-black text-[var(--text-dim)] uppercase tracking-widest">
            Live Meeting
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 px-6 pb-6 gap-6">
        {/* Two column: Transkripsi | Correction */}
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {/* Left panel: Transcript OR AI Context (toggleable) */}
          <div className="flex flex-col min-h-0">
            {/* Header with AI Context badge */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                {showContextPanel ? (
                  <>
                    <Brain size={18} className="text-[var(--color-orange)]" />
                    AI Context
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Transkripsi
                  </>
                )}
              </h3>

              <div className="flex items-center gap-2">
                {/* AI Context badge — always shown when cards exist */}
                {hasContextCards && !showContextPanel && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setShowContextPanel(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-orange)]/10 border border-[var(--color-orange)]/30 hover:bg-[var(--color-orange)]/20 transition-all cursor-pointer group"
                    title="Lihat AI Context"
                  >
                    <Brain size={12} className="text-[var(--color-orange)] group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black text-[var(--color-orange)] uppercase tracking-widest">
                      AI Context
                    </span>
                    <span className="w-4 h-4 rounded-full bg-[var(--color-orange)] text-white text-[9px] font-black flex items-center justify-center">
                      {contextCards.length}
                    </span>
                  </motion.button>
                )}

                {/* Generating indicator */}
                {isGeneratingContext && !showContextPanel && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--color-orange)]/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-orange)] animate-pulse" />
                    <span className="text-[9px] font-black text-[var(--color-orange)] uppercase tracking-widest">
                      AI...
                    </span>
                  </div>
                )}

                {/* X button to close context panel */}
                {showContextPanel && (
                  <button
                    onClick={() => setShowContextPanel(false)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
                    title="Kembali ke Transkripsi"
                  >
                    <X size={16} />
                  </button>
                )}

                {/* Label on the right when not showing context */}
                {!showContextPanel && !hasContextCards && (
                  <span className="text-xs font-black text-[var(--text-dim)] uppercase tracking-widest">
                    Real-time
                  </span>
                )}
              </div>
            </div>

            {/* Panel content with animation */}
            <div className="flex-1 min-h-0 relative">
              <AnimatePresence mode="wait">
                {showContextPanel ? (
                  /* AI Context Panel */
                  <motion.div
                    key="context-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="absolute inset-0 flex flex-col"
                  >
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-[var(--color-orange)]/30 overflow-y-auto scrollbar-hide">
                      <div className="p-6">
                        {/* Generating indicator inside panel */}
                        {isGeneratingContext && (
                          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-[var(--color-orange)]/5 border border-[var(--color-orange)]/10">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-orange)] animate-pulse" />
                            <span className="text-xs font-black text-[var(--color-orange)] uppercase tracking-widest">
                              Generating context...
                            </span>
                          </div>
                        )}

                        <div className="space-y-4">
                          {contextCards.map((card: any, index: number) => (
                            <ContextCard
                              key={card.id || `ctx-${index}`}
                              card={card}
                              isAnimating={index === contextCards.length - 1}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Transcript Panel */
                  <motion.div
                    key="transcript-panel"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="absolute inset-0 flex flex-col"
                  >
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-[var(--border-color)] p-8 overflow-y-auto scrollbar-hide h-full">
                      {finalTranscript || transcript ? (
                        <div className="space-y-4">
                          {finalTranscript &&
                            finalTranscript.split("\n").map((p, i) => (
                              <p
                                key={`final-${i}`}
                                className="text-lg font-medium leading-relaxed text-[var(--text-main)]/90"
                              >
                                {p}
                              </p>
                            ))}
                          {transcript && (
                            <p className="text-lg font-medium leading-relaxed text-[var(--color-orange)]/70 italic animate-pulse">
                              {transcript}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <div className="w-16 h-16 rounded-full bg-[var(--bg)] flex items-center justify-center text-[#8A8886]/30">
                            <FileText size={32} />
                          </div>
                          <p className="text-center italic text-[#8A8886]/60 font-black uppercase tracking-widest text-[10px]">
                            Menunggu transkripsi...
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Correction */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                <Edit3 size={18} />
                Correction
              </h3>
              <span className="text-xs font-black text-[var(--text-dim)] uppercase tracking-widest">
                Word-level
              </span>
            </div>

            <div className="flex-1 min-h-0">
              <CorrectionPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}