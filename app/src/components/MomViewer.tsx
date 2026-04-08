"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckSquare, Download, FileText, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "./Common";

// A basic markdown parser for MoM documents
const renderMarkdown = (text: string) => {
  if (!text) return null;

  // Bold text (simple replacement) helper
  const renderInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-black text-[var(--text-main)]">{part.slice(2, -2)}</strong>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Headers
    if (line.startsWith('### ')) return <h4 key={i} className="text-lg font-black text-[var(--text-main)] mt-6 mb-2">{line.replace('### ', '')}</h4>;
    if (line.startsWith('## ')) return <h3 key={i} className="text-xl font-black text-[var(--text-main)] mt-8 mb-3 border-b border-[var(--border-color)] pb-2">{line.replace('## ', '')}</h3>;
    if (line.startsWith('# ')) return <h2 key={i} className="text-2xl font-black text-[var(--color-orange)] mt-4 mb-6">{line.replace('# ', '')}</h2>;

    // Checkboxes / Action Items
    if (line.trim().startsWith('- [ ] ')) return (
      <div key={i} className="flex items-start gap-3 my-2 bg-[var(--bg-sidebar)] p-3 rounded-2xl border border-[var(--border-color)]">
        <Square size={18} className="text-[#8A8886] mt-0.5 flex-shrink-0" />
        <span className="text-[var(--text-main)] font-medium leading-relaxed">{renderInline(line.replace('- [ ] ', ''))}</span>
      </div>
    );
    if (line.trim().startsWith('- [x] ') || line.trim().startsWith('- [X] ')) return (
      <div key={i} className="flex items-start gap-3 my-2 bg-[var(--bg-sidebar)] p-3 rounded-2xl border border-[var(--border-color)]/50 opacity-70">
        <CheckSquare size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
        <span className="text-[var(--text-main)] font-medium leading-relaxed line-through">{renderInline(line.replace(/- \[[xX]\] /, ''))}</span>
      </div>
    );


    // Check for Speaker Format: [SPEAKER_NAME]: Text
    const speakerMatch = line.match(/^\[(.*?)\]: (.*)$/);
    if (speakerMatch) {
      const speakerName = speakerMatch[1];
      const content = speakerMatch[2];

      return (
        <div key={i} className="my-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[var(--text-main)] text-white">
              {speakerName}
            </span>
            <div className="flex-1 h-[1px] bg-[var(--border-color)]/50" />
          </div>
          <p className="text-[var(--text-main)] font-medium leading-relaxed pl-1">{renderInline(content)}</p>
        </div>
      );
    }

    // Normal List (handles both - and *)
    const listMatch = line.trim().match(/^[-*] (.*)$/);
    if (listMatch) return (
      <div key={i} className="flex items-start gap-2 my-1.5 pl-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-orange)] mt-2 flex-shrink-0" />
        <span className="text-[var(--text-main)] leading-relaxed">{renderInline(listMatch[1])}</span>
      </div>
    );

    // Empty line
    if (line.trim() === '') return <div key={i} className="h-4" />;

    // Paragraph
    return <p key={i} className="text-[var(--text-main)] leading-relaxed my-1.5">{renderInline(line)}</p>;
  });
};

export default function MomViewer({ meeting, onClose, onExport, isSidebarOpen }: any) {
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Sync state whenever meeting changes
  useEffect(() => {
    if (!meeting) return;
    let items = [];
    if (Array.isArray(meeting.action_items)) {
      items = meeting.action_items;
    } else {
      try { items = JSON.parse(meeting.action_items || "[]"); } catch (e) { items = []; }
    }
    setActionItems(items);
  }, [meeting?.id, meeting?.action_items]);

  const handleToggleTask = async (taskId: string | number, currentStatus: string, index: number) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';

    // Optimistic UI update - try using ID, fallback to index if no ID
    setActionItems(prev => prev.map((item, i) => {
      if (taskId && item.id === taskId) return { ...item, status: newStatus };
      if (i === index) return { ...item, status: newStatus };
      return item;
    }));

    if (!taskId) return; // If no backend ID, we stop after local update

    try {
      await fetch(`http://localhost:8000/action-items/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error("Failed to toggle task", e);
      // Optional: Revert local state on backend failure, or just keep it
    }
  };

  const copySummary = () => {
    // Extract bullets for a quick summary
    const lines = (meeting.mom_document || "").split('\n');
    const summaryBullets = lines
      .filter((l: string) => l.trim().startsWith('- '))
      .slice(0, 8)
      .join('\n');

    const textToCopy = `RIWAYAT RAPAT: ${meeting.title}\n\nRINGKASAN:\n${summaryBullets}\n\nSelengkapnya di YOTA AI.`;
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-white flex flex-col pt-0 z-0"
    >
      <div className={cn("flex items-center justify-between py-5 border-b border-[var(--border-color)] bg-white/90 backdrop-blur-md sticky top-0 z-10 w-full px-8 transition-all", 
                       !isSidebarOpen && "pl-20")}>
        <span className="font-bold text-lg text-[var(--text-main)] italic font-serif">Rincian Rapat</span>
        <div className="flex items-center gap-2 relative">
           <button 
              onClick={() => {
                 const text = `*📋 YOTA - ${meeting.title}*\n` +
                              `📅 _${new Date(meeting.date + 'Z').toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}_\n\n` +
                              `*📌 Poin Utama:*\n` +
                              (meeting.mom_document || "").split('\n')
                                 .filter((l: string) => l.trim().startsWith('- '))
                                 .slice(0, 3)
                                 .map((l: string) => `• ${l.replace('- ', '')}`)
                                 .join('\n') + 
                              `\n\n*✅ Action Items:*\n` +
                              (Array.isArray(actionItems) ? actionItems : [])
                                 .slice(0, 2)
                                 .map((a: any) => `- [ ] ${a.task} (_PIC: ${a.pic || 'TBD'}_)`)
                                 .join('\n') +
                              `\n\n_Selengkapnya di YOTA AI._`;
                 navigator.clipboard.writeText(text);
                 setCopySuccess(true);
                 setTimeout(() => setCopySuccess(false), 2000);
              }} 
              className={cn(
                 "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                 copySuccess ? "bg-green-500 text-white" : "bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366] hover:text-white"
              )}
           >
              {copySuccess ? "BERHASIL!" : "SALIN WA"}
           </button>

           <button 
             onClick={() => setShowExportMenu(!showExportMenu)} 
             className="p-2 -mr-2 rounded-xl hover:bg-[var(--bg)] text-[var(--color-orange)] transition"
           >
             <Download size={24} />
           </button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-[var(--border-color)] w-48 overflow-hidden z-20"
              >
                <div className="p-2 text-xs font-black text-[#8A8886] uppercase tracking-widest border-b border-[var(--border-color)]/50 ml-2">Export As...</div>
                <button onClick={() => { onExport(meeting.id, "pdf"); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] transition">📄 PDF Formal</button>
                <button onClick={() => { onExport(meeting.id, "docx"); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] transition">📝 DOCX Editable</button>
                <button onClick={() => { onExport(meeting.id, "txt"); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] transition">📃 MoM (Plain Text)</button>
                <button onClick={() => { onExport(meeting.id, "md"); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] transition">🔤 MoM (Markdown)</button>
                <div className="border-t border-[var(--border-color)]/50 my-1" />
                <button onClick={() => { onExport(meeting.id, "raw"); setShowExportMenu(false); }} className="w-full text-left px-4 py-4 text-xs font-black text-[var(--color-orange)] hover:bg-[var(--color-orange)]/5 transition flex items-center justify-between uppercase tracking-widest">
                  <span>Transkrip Mentah</span>
                  <span className="bg-[var(--color-orange)]/10 px-1.5 py-0.5 rounded text-[9px] lowercase italic">.txt</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Bar for Active Processing */}
      {meeting.status === 'processing' && (
        <div className="absolute top-[72px] left-0 w-full h-1 bg-[var(--color-orange)]/10 z-20">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--color-orange)] to-[var(--color-orange-light)]"
            initial={{ width: "0%" }}
            animate={{
              width: (() => {
                const stages: any = {
                  "init": "10%", "cleaning": "25%", "cleaning_done": "35%",
                  "analyzing": "50%", "analyzing_done": "65%",
                  "extracting": "75%", "extracting_done": "85%",
                  "writing": "95%", "done": "100%"
                };
                return stages[meeting.stage_raw] || stages[Object.keys(stages).find(k => meeting.stage?.toLowerCase().includes(k.toLowerCase())) || ""] || "15%";
              })()
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto w-full scrollbar-hide">
        <div className="px-8 py-8 md:px-12 pb-32 max-w-4xl mx-auto">
          <div className="mb-10 block">
          <div className="flex gap-4 items-center mb-6">
            <div className="w-14 h-14 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-color)] flex items-center justify-center text-[var(--color-orange)] shadow-sm">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-[var(--text-main)] leading-tight mb-2">{meeting.title || "Minutes of Meeting"}</h1>
              <p className="text-sm font-semibold text-[var(--text-dim)]">
                {new Date(meeting.date + 'Z').toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
        {/* Quick Summary Block (only shown when not processing) */}
        {meeting.status !== 'processing' && (
          <div className="bg-[var(--color-orange)]/5 rounded-3xl p-6 border border-[var(--color-orange)]/10 mb-10 overflow-hidden relative group shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-[var(--color-orange)] uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-orange)] animate-pulse" />
                Ringkasan Cepat
              </span>
              <button
                onClick={copySummary}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border border-[var(--color-orange)]/20",
                  copySuccess ? "bg-green-500 text-white border-green-500" : "bg-white text-[var(--color-orange)] hover:bg-[var(--color-orange)] hover:text-white"
                )}
              >
                {copySuccess ? "TERSALIN!" : "SALIN"}
              </button>
            </div>
            <ul className="space-y-2 ml-2">
              {(meeting.mom_document || "").split('\n')
                .filter((l: string) => l.trim().startsWith('- '))
                .slice(0, 4)
                .map((l: string, idx: number) => (
                  <li key={idx} className="text-sm text-[var(--text-main)]/90 leading-relaxed flex items-start gap-3">
                    <span className="text-[var(--color-orange)] mt-0.5 font-bold">•</span>
                    <span className="line-clamp-2 font-medium">{l.replace('- ', '')}</span>
                  </li>
                ))
              }
            </ul>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[var(--color-orange)]/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        {/* Content Area */}
        <div className={cn("prose prose-sm max-w-none pb-8 border-b border-[var(--border-color)]/50 mb-8", meeting.status === 'processing' && "opacity-80")}>
          {meeting.status === 'processing' && !meeting.mom_document ? (
            <div className="space-y-12 py-6">
              {/* Skeleton for Executive Summary */}
              <div className="space-y-4">
                <div className="h-8 bg-[var(--border-color)] rounded-xl w-1/2 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--bg-sidebar)] rounded-lg w-full animate-pulse" />
                  <div className="h-4 bg-[var(--bg-sidebar)] rounded-lg w-11/12 animate-pulse" />
                  <div className="h-4 bg-[var(--bg-sidebar)] rounded-lg w-5/6 animate-pulse" />
                </div>
              </div>

              {/* Skeleton for Agenda Items */}
              <div className="space-y-4">
                <div className="h-8 bg-[var(--border-color)] rounded-xl w-1/3 animate-pulse" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="w-1.5 h-1.5 bg-[var(--color-orange)]/20 rounded-full" />
                      <div className="h-4 bg-[var(--bg-sidebar)] rounded-lg flex-1 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Skeleton for Discussion Points (more detailed) */}
              <div className="space-y-6">
                <div className="h-8 bg-[var(--border-color)] rounded-xl w-2/5 animate-pulse" />
                {[1, 2].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-5 bg-[var(--border-color)]/50 rounded-lg w-1/4 animate-pulse mb-3" />
                    <div className="h-4 bg-[var(--bg-sidebar)] rounded-lg w-full animate-pulse" />
                    <div className="h-4 bg-[var(--bg-sidebar)] rounded-lg w-full animate-pulse" />
                    <div className="h-4 bg-[var(--bg-sidebar)] rounded-lg w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            renderMarkdown(meeting.mom_document)
          )}
        </div>

        {actionItems && actionItems.length > 0 && (
          <div className="pb-20">
            <h3 className="text-xl font-black text-[var(--text-main)] mb-4">Daftar Tugas (Action Items)</h3>
            <div className="space-y-3">
              {actionItems.map((item: any, idx: number) => (
                <div
                  key={item.id || `task-${idx}`}
                  onClick={() => handleToggleTask(item.id, item.status, idx)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${item.status === 'done' ? 'bg-[var(--bg-sidebar)] border-[var(--border-color)]/50 opacity-70' : 'bg-white border-[var(--border-color)] hover:border-[var(--color-orange)]/40 shadow-sm'}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {item.status === 'done' ? (
                      <CheckSquare size={20} className="text-green-500" />
                    ) : (
                      <Square size={20} className="text-[#8A8886]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium leading-relaxed ${item.status === 'done' ? 'text-[#8A8886] line-through' : 'text-[var(--text-main)]'}`}>
                      {item.task}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {item.pic && (
                        <span className="text-[10px] font-bold text-[var(--color-orange)] bg-[var(--color-orange)]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          PIC: {item.pic}
                        </span>
                      )}
                      {item.deadline && (
                        <span className="text-[10px] font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Target: {item.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </motion.div>
  );
}
