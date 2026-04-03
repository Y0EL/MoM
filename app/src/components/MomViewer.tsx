"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckSquare, Download, FileText, Square } from "lucide-react";
import { useState } from "react";
import { cn } from "./Common";

// A basic markdown parser for MoM documents
const renderMarkdown = (text: string) => {
  if (!text) return null;

  // Bold text (simple replacement) helper
  const renderInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-black text-[#1A1C1E]">{part.slice(2, -2)}</strong>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Headers
    if (line.startsWith('### ')) return <h4 key={i} className="text-lg font-black text-[#1A1C1E] mt-6 mb-2">{line.replace('### ', '')}</h4>;
    if (line.startsWith('## ')) return <h3 key={i} className="text-xl font-black text-[#1A1C1E] mt-8 mb-3 border-b border-[#F0EDE8] pb-2">{line.replace('## ', '')}</h3>;
    if (line.startsWith('# ')) return <h2 key={i} className="text-2xl font-black text-[#4F46E5] mt-4 mb-6">{line.replace('# ', '')}</h2>;

    // Checkboxes / Action Items
    if (line.trim().startsWith('- [ ] ')) return (
      <div key={i} className="flex items-start gap-3 my-2 bg-[#F8F7F4] p-3 rounded-2xl border border-[#F0EDE8]">
        <Square size={18} className="text-[#8A8886] mt-0.5 flex-shrink-0" />
        <span className="text-[#1A1C1E] font-medium leading-relaxed">{renderInline(line.replace('- [ ] ', ''))}</span>
      </div>
    );
    if (line.trim().startsWith('- [x] ') || line.trim().startsWith('- [X] ')) return (
      <div key={i} className="flex items-start gap-3 my-2 bg-[#F8F7F4] p-3 rounded-2xl border border-[#F0EDE8]/50 opacity-70">
        <CheckSquare size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
        <span className="text-[#1A1C1E] font-medium leading-relaxed line-through">{renderInline(line.replace(/- \[[xX]\] /, ''))}</span>
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
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#1A1C1E] text-white">
              {speakerName}
            </span>
            <div className="flex-1 h-[1px] bg-[#F0EDE8]/50" />
          </div>
          <p className="text-[#1A1C1E] font-medium leading-relaxed pl-1">{renderInline(content)}</p>
        </div>
      );
    }

    // Normal List (handles both - and *)
    const listMatch = line.trim().match(/^[-*] (.*)$/);
    if (listMatch) return (
      <div key={i} className="flex items-start gap-2 my-1.5 pl-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] mt-2 flex-shrink-0" />
        <span className="text-[#1A1C1E] leading-relaxed">{renderInline(listMatch[1])}</span>
      </div>
    );

    // Empty line
    if (line.trim() === '') return <div key={i} className="h-4" />;

    // Paragraph
    return <p key={i} className="text-[#1A1C1E] leading-relaxed my-1.5">{renderInline(line)}</p>;
  });
};

export default function MomViewer({ meeting, onClose, onExport }: any) {
  const [actionItems, setActionItems] = useState<any[]>(() => {
    if (Array.isArray(meeting?.action_items)) return meeting.action_items;
    try { return JSON.parse(meeting?.action_items || "[]"); } catch { return []; }
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';

    // Optimistic UI update
    setActionItems(prev => prev.map(a => (taskId && a.id === taskId) ? { ...a, status: newStatus } : a));

    if (!taskId) {
      console.warn("Cannot sync to backend: Action item ID missing.");
      return;
    }

    try {
      await fetch(`http://localhost:8000/action-items/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error("Failed to toggle task", e);
      // Revert on error
      setActionItems(prev => prev.map(a => a.id === taskId ? { ...a, status: currentStatus } : a));
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
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white z-[120] flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#F0EDE8] bg-white sticky top-0 z-10 pt-10">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-[#F8F7F4] active:bg-[#F0EDE8] transition">
          <ArrowLeft size={24} className="text-[#1A1C1E]" />
        </button>
        <span className="font-black text-lg tracking-tight">YOTA Viewer</span>
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
                 "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black transition-all",
                 copySuccess ? "bg-green-500 text-white" : "bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366] hover:text-white"
              )}
           >
              {copySuccess ? "BERHASIL!" : "SALIN WA"}
           </button>

           <button 
             onClick={() => setShowExportMenu(!showExportMenu)} 
             className="p-2 -mr-2 rounded-full hover:bg-[#F8F7F4] text-[#4F46E5] active:bg-[#F0EDE8] transition"
           >
             <Download size={24} />
           </button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-[#F0EDE8] w-48 overflow-hidden z-20"
              >
                <div className="p-2 text-xs font-black text-[#8A8886] uppercase tracking-widest border-b border-[#F0EDE8]/50 ml-2">Export As...</div>
                <button onClick={() => { onExport(meeting.id, "pdf"); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#1A1C1E] hover:bg-[#F8F7F4] transition">📄 PDF Formal</button>
                <button onClick={() => { onExport(meeting.id, "docx"); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#1A1C1E] hover:bg-[#F8F7F4] transition">📝 DOCX Editable</button>
                <button onClick={() => { onExport(meeting.id, "txt"); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#1A1C1E] hover:bg-[#F8F7F4] transition">📃 MoM (Plain Text)</button>
                <button onClick={() => { onExport(meeting.id, "md"); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#1A1C1E] hover:bg-[#F8F7F4] transition">🔤 MoM (Markdown)</button>
                <div className="border-t border-[#F0EDE8]/50 my-1" />
                <button onClick={() => { onExport(meeting.id, "raw"); setShowExportMenu(false); }} className="w-full text-left px-4 py-4 text-xs font-black text-[#4F46E5] hover:bg-[#4F46E5]/5 transition flex items-center justify-between uppercase tracking-widest">
                  <span>Transkrip Mentah</span>
                  <span className="bg-[#4F46E5]/10 px-1.5 py-0.5 rounded text-[9px] lowercase italic">.txt</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Bar for Active Processing */}
      {meeting.status === 'processing' && (
        <div className="fixed top-[88px] left-0 w-full h-1 bg-[#4F46E5]/5 z-[130]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#4F46E5] to-[#818CF8]"
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

      <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto px-6 py-8 pb-32">
        <div className="bg-[#F8F7F4] rounded-[2rem] p-6 border border-[#F0EDE8] mb-8 flex gap-4 items-center">
          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-[#F0EDE8] flex items-center justify-center text-[#4F46E5]">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A1C1E] leading-tight mb-1">{meeting.title || "Minutes of Meeting"}</h1>
            <p className="text-xs font-bold text-[#8A8886]">
              {new Date(meeting.date + 'Z').toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        {/* Quick Summary Block (only shown when not processing) */}
        {meeting.status !== 'processing' && (
          <div className="bg-[#4F46E5]/5 rounded-3xl p-5 border border-[#4F46E5]/10 mb-10 overflow-hidden relative group">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-[#4F46E5] uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-[#4F46E5] animate-pulse" />
                Ringkasan Cepat
              </span>
              <button
                onClick={copySummary}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black transition-all",
                  copySuccess ? "bg-green-500 text-white" : "bg-white text-[#4F46E5] border border-[#4F46E5]/20 hover:bg-[#4F46E5] hover:text-white"
                )}
              >
                {copySuccess ? "BERHASIL DISALIN!" : "SALIN RINGKASAN"}
              </button>
            </div>
            <ul className="space-y-1.5 ml-2">
              {(meeting.mom_document || "").split('\n')
                .filter((l: string) => l.trim().startsWith('- '))
                .slice(0, 4)
                .map((l: string, idx: number) => (
                  <li key={idx} className="text-xs font-bold text-[#1A1C1E]/80 leading-relaxed flex items-start gap-2">
                    <span className="text-[#4F46E5] font-black mt-0.5">•</span>
                    <span className="line-clamp-1">{l.replace('- ', '')}</span>
                  </li>
                ))
              }
            </ul>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#4F46E5]/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        {/* Content Area */}
        <div className={cn("prose prose-sm max-w-none pb-8 border-b border-[#F0EDE8]/50 mb-8", meeting.status === 'processing' && "opacity-80")}>
          {meeting.status === 'processing' && !meeting.mom_document ? (
            <div className="space-y-12 py-6">
              {/* Skeleton for Executive Summary */}
              <div className="space-y-4">
                <div className="h-8 bg-[#F0EDE8] rounded-xl w-1/2 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-[#F8F7F4] rounded-lg w-full animate-pulse" />
                  <div className="h-4 bg-[#F8F7F4] rounded-lg w-11/12 animate-pulse" />
                  <div className="h-4 bg-[#F8F7F4] rounded-lg w-5/6 animate-pulse" />
                </div>
              </div>

              {/* Skeleton for Agenda Items */}
              <div className="space-y-4">
                <div className="h-8 bg-[#F0EDE8] rounded-xl w-1/3 animate-pulse" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="w-1.5 h-1.5 bg-[#4F46E5]/20 rounded-full" />
                      <div className="h-4 bg-[#F8F7F4] rounded-lg flex-1 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Skeleton for Discussion Points (more detailed) */}
              <div className="space-y-6">
                <div className="h-8 bg-[#F0EDE8] rounded-xl w-2/5 animate-pulse" />
                {[1, 2].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-5 bg-[#F0EDE8]/50 rounded-lg w-1/4 animate-pulse mb-3" />
                    <div className="h-4 bg-[#F8F7F4] rounded-lg w-full animate-pulse" />
                    <div className="h-4 bg-[#F8F7F4] rounded-lg w-full animate-pulse" />
                    <div className="h-4 bg-[#F8F7F4] rounded-lg w-3/4 animate-pulse" />
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
            <h3 className="text-xl font-black text-[#1A1C1E] mb-4">Daftar Tugas (Action Items)</h3>
            <div className="space-y-3">
              {actionItems.map((item: any, idx: number) => (
                <div
                  key={item.id || `task-${idx}`}
                  onClick={() => handleToggleTask(item.id, item.status)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${item.status === 'done' ? 'bg-[#F8F7F4] border-[#F0EDE8]/50 opacity-70' : 'bg-white border-[#F0EDE8] hover:border-[#4F46E5]/40 shadow-sm'}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {item.status === 'done' ? (
                      <CheckSquare size={20} className="text-green-500" />
                    ) : (
                      <Square size={20} className="text-[#8A8886]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium leading-relaxed ${item.status === 'done' ? 'text-[#8A8886] line-through' : 'text-[#1A1C1E]'}`}>
                      {item.task}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {item.pic && (
                        <span className="text-[10px] font-bold text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
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
    </motion.div>
  );
}
