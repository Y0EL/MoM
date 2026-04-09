"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { ContextCard } from "../lib/schemas/contextCard";

interface ContextCardComponentProps {
  card: ContextCard;
  isAnimating?: boolean;
}

export default function ContextCardComponent({ card, isAnimating = false }: ContextCardComponentProps) {
  // The narrative is stored as the first (and only) key_point
  const narrative = card.key_points[0] || "";

  return (
    <motion.div
      initial={isAnimating ? { opacity: 0, y: 12, scale: 0.98 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: isAnimating ? 0.05 : 0 }}
      className="relative"
    >
      {/* Glow flash on first appear */}
      {isAnimating && (
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 rounded-2xl bg-[var(--color-orange)]/15 pointer-events-none"
        />
      )}

      <div className="flex gap-3 items-start">
        {/* AI Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-orange)]/15 border border-[var(--color-orange)]/20 flex items-center justify-center mt-0.5">
          <Brain size={14} className="text-[var(--color-orange)]" />
        </div>

        {/* Bubble content */}
        <div className="flex-1 bg-[var(--color-orange)]/5 border border-[var(--color-orange)]/15 rounded-2xl rounded-tl-sm px-4 py-3">
          {/* Header: segment label + time */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-[var(--color-orange)] uppercase tracking-widest">
              {card.topic}
            </span>
            <span className="text-[10px] text-[var(--text-dim)] font-medium">
              {new Date(card.generated_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Narrative text */}
          <p className="text-sm text-[var(--text-main)]/85 leading-relaxed font-medium">
            {narrative}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

