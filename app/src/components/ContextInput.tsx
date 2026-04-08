"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Plus, X } from "lucide-react";
import { useState } from "react";
import { useMeetingStore } from "../stores/meetingStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "./Common";

export default function ContextInput() {
  const { userContext, setUserContext } = useMeetingStore();
  const { showContextInput, toggleContextInput } = useUIStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!showContextInput) {
      toggleContextInput();
    }
  };

  const handleContextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserContext(e.target.value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl border border-[var(--border-color)] overflow-hidden transition-all duration-300",
        isExpanded ? "shadow-lg" : "shadow-sm"
      )}
    >
      {/* Header */}
      <div 
        onClick={handleToggle}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg)]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-orange)]/10 flex items-center justify-center">
            <MessageSquare size={16} className="text-[var(--color-orange)]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)]">
              Tambah Konteks
            </h3>
            <p className="text-xs text-[var(--text-dim)]">
              Bantu AI dengan konteks tambahan
            </p>
          </div>
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="p-1 rounded-lg hover:bg-[var(--border-color)]/50 transition-colors"
        >
          <Plus size={16} className="text-[var(--text-dim)]" />
        </motion.div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-[var(--border-color)]/50">
              <div className="mb-3">
                <label className="text-xs font-black text-[var(--text-dim)] uppercase tracking-widest">
                  Konteks Tambahan
                </label>
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Tambahkan informasi kontekstual yang akan membantu AI memahami rapat dengan lebih baik.
                </p>
              </div>
              
              <textarea
                value={userContext}
                onChange={handleContextChange}
                placeholder="Contoh: Rapat membahas proyek X, dengan fokus pada timeline dan budget. Tim terdiri dari 5 orang dari departemen berbeda..."
                className="w-full h-24 p-3 bg-[var(--bg)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] placeholder-[var(--text-dim)]/50 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent"
              />
              
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-[var(--text-dim)]">
                  {userContext.length} karakter
                </div>
                
                <button
                  onClick={() => setUserContext("")}
                  className="text-xs text-[var(--text-dim)] hover:text-[var(--color-orange)] transition-colors flex items-center gap-1"
                >
                  <X size={12} />
                  Hapus
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
