"use client";

import { motion } from "framer-motion";
import { Brain, Edit3, FileText } from "lucide-react";
import { useContextTimer } from "../hooks/useContextTimer";
import { useContextStore } from "../stores/contextStore";
import { useMeetingStore } from "../stores/meetingStore";
import ContextCard from "./ContextCard";
import CorrectionPanel from "./CorrectionPanel";
import SiriWaveform from "./SiriWaveform";

export default function SplitMeetingLayout() {
  const { finalTranscript, transcript, duration } = useMeetingStore();
  const { contextCards, isGeneratingContext } = useContextStore();

  useContextTimer();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
          {/* Left: Transkripsi */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                <FileText size={18} />
                Transkripsi
              </h3>
              <span className="text-xs font-black text-[var(--text-dim)] uppercase tracking-widest">
                Real-time
              </span>
            </div>

            <div className="flex-1 bg-white rounded-[2.5rem] border border-[var(--border-color)] p-8 overflow-y-auto scrollbar-hide">
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

            {/* AI Context — only after first card appears */}
            {hasContextCards && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mt-6"
              >
                <div className="bg-white rounded-[2.5rem] border border-[var(--border-color)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Brain size={20} className="text-[var(--color-orange)]" />
                      <h3 className="text-lg font-black text-[var(--text-main)]">AI Context</h3>
                    </div>
                    {isGeneratingContext && (
                      <div className="flex items-center gap-2 text-xs font-black text-[var(--color-orange)] uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-orange)] animate-pulse" />
                        Generating...
                      </div>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto scrollbar-hide space-y-4">
                    {contextCards.map((card: any, index: number) => (
                      <ContextCard
                        key={card.id || `ctx-${index}`}
                        card={card}
                        isAnimating={index === contextCards.length - 1}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
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