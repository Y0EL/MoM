"use client";

import { motion } from "framer-motion";
import { Clock, Users, Lightbulb, CheckSquare } from "lucide-react";
import { ContextCard } from "../lib/schemas/contextCard";
import { cn } from "./Common";

interface ContextCardComponentProps {
  card: ContextCard;
  isAnimating?: boolean;
}

export default function ContextCardComponent({ card, isAnimating = false }: ContextCardComponentProps) {
  const formatTimeRange = (timeRange: { start: string; end: string }) => {
    return `${timeRange.start} - ${timeRange.end}`;
  };

  return (
    <motion.div
      initial={isAnimating ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        ease: "easeOut",
        delay: isAnimating ? 0.1 : 0
      }}
      className="bg-gradient-to-br from-[var(--color-orange)]/5 to-[var(--color-orange)]/10 rounded-2xl border border-[var(--color-orange)]/20 p-6 mb-4 relative overflow-hidden group hover:shadow-lg transition-all"
    >
      {/* Glow effect on first render */}
      {isAnimating && (
        <motion.div
          initial={{ opacity: 0.8, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-0 bg-[var(--color-orange)]/20 rounded-2xl"
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-orange)]/20 flex items-center justify-center">
              <Lightbulb size={16} className="text-[var(--color-orange)]" />
            </div>
            <span className="text-xs font-black text-[var(--color-orange)] uppercase tracking-widest">
              Context #{card.segment_index + 1}
            </span>
          </div>
          
          {card.topic && (
            <h4 className="text-lg font-black text-[var(--text-main)] leading-tight">
              {card.topic}
            </h4>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-xs text-[var(--text-dim)]">
          <Clock size={12} />
          <span className="font-medium">
            {formatTimeRange(card.time_range)}
          </span>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        {/* Key Points */}
        {card.key_points.length > 0 && (
          <div>
            <h5 className="text-sm font-black text-[var(--text-main)] mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-orange)]" />
              Key Points
            </h5>
            <ul className="space-y-1">
              {card.key_points.map((point, index) => (
                <li key={index} className="text-sm text-[var(--text-main)]/80 leading-relaxed flex items-start gap-2">
                  <span className="text-[var(--color-orange)] mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisions */}
        {card.decisions.length > 0 && (
          <div>
            <h5 className="text-sm font-black text-[var(--text-main)] mb-2 flex items-center gap-2">
              <CheckSquare size={14} className="text-green-500" />
              Decisions
            </h5>
            <ul className="space-y-1">
              {card.decisions.map((decision, index) => (
                <li key={index} className="text-sm text-[var(--text-main)]/80 leading-relaxed flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {card.action_items.length > 0 && (
          <div>
            <h5 className="text-sm font-black text-[var(--text-main)] mb-2 flex items-center gap-2">
              <CheckSquare size={14} className="text-blue-500" />
              Action Items
            </h5>
            <ul className="space-y-1">
              {card.action_items.map((action, index) => (
                <li key={index} className="text-sm text-[var(--text-main)]/80 leading-relaxed flex items-start gap-2">
                  <span className="text-blue-500 mt-1">○</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Speakers */}
        {card.speakers.length > 0 && (
          <div>
            <h5 className="text-sm font-black text-[var(--text-main)] mb-2 flex items-center gap-2">
              <Users size={14} className="text-[var(--text-dim)]" />
              Speakers
            </h5>
            <div className="flex flex-wrap gap-2">
              {card.speakers.map((speaker, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-[var(--bg)] border border-[var(--border-color)] rounded-full text-xs text-[var(--text-dim)] font-medium"
                >
                  {speaker}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="mt-4 pt-4 border-t border-[var(--border-color)]/50">
        <div className="text-xs text-[var(--text-dim)] font-medium">
          Generated at {new Date(card.generated_at).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </motion.div>
  );
}
