"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Edit2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMeetingStore } from "../stores/meetingStore";

export default function CorrectionPanel() {
  const { finalTranscript, corrections, updateCorrectionWithSync, loadCorrectionsFromBackend, meetingId } = useMeetingStore();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [originalWord, setOriginalWord] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const words = finalTranscript
    ? finalTranscript.split(/\s+/).filter((w) => w.length > 0)
    : [];

  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingIndex]);

  useEffect(() => {
    // Load corrections from backend when meetingId changes and we have transcript (only for saved meetings)
    if (meetingId && finalTranscript && words.length > 0) {
      loadCorrectionsFromBackend(meetingId);
    }
  }, [meetingId]); // Only depend on meetingId, not finalTranscript

  const handleWordClick = (index: number, word: string) => {
    const correction = corrections?.find((c: any) => c.index === index);
    const current = correction?.word || word;
    setOriginalWord(word);
    setEditValue(current);
    setEditingIndex(index);
  };

  const handleConfirm = async () => {
    if (editingIndex !== null && editValue.trim()) {
      await updateCorrectionWithSync(editingIndex, editValue.trim(), originalWord);
    }
    setEditingIndex(null);
    setEditValue("");
    setOriginalWord("");
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditValue("");
    setOriginalWord("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    else if (e.key === "Escape") handleCancel();
  };

  return (
    <div className="flex-1 bg-white rounded-[2.5rem] border border-[var(--border-color)] p-8 flex flex-col relative overflow-hidden h-full">
      {/* Mode Indicator */}
      {meetingId && (
        <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
          Meeting Tersimpan - Koreksi akan disimpan permanen
        </div>
      )}
      
      {/* Word-level Text */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {words.length > 0 ? (
          <div className="text-lg font-medium leading-relaxed text-[var(--text-main)]/90">
            {words.map((word, index) => {
              const correction = corrections?.find((c: any) => c.index === index);
              const displayed = correction?.word || word;
              const isCorrected = !!correction?.isCorrected;

              return (
                <span key={`word-${index}`}>
                  {index > 0 && " "}
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleWordClick(index, word)}
                    className={`inline-block cursor-pointer transition-all rounded px-1 ${
                      isCorrected
                        ? "bg-blue-50 text-blue-700 border-b-2 border-blue-300"
                        : "hover:bg-[var(--color-orange)]/10 hover:text-[var(--color-orange)]"
                    }`}
                    title={isCorrected ? `Original: ${word}` : "Klik untuk edit"}
                  >
                    {displayed}
                    {isCorrected && (
                      <span className="ml-1 text-blue-400 text-xs">✓</span>
                    )}
                  </motion.span>
                </span>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--bg)] flex items-center justify-center text-[#8A8886]/30">
              <Edit2 size={32} />
            </div>
            <p className="text-center italic text-[#8A8886]/60 font-black uppercase tracking-widest text-[10px]">
              Mulai transkripsi untuk mengedit kata...
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => e.target === e.currentTarget && handleCancel()}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-[var(--text-main)]">Edit Kata</h3>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                    Kata Asli
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-[var(--text-main)] font-medium">{originalWord}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                    Koreksi
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full p-3 bg-white border border-[var(--border-color)] rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]"
                    placeholder="Ketik koreksi..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-[var(--color-orange)] text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Konfirmasi
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-100 text-[var(--text-dim)] py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}