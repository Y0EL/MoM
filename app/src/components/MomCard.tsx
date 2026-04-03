import { Clock, Users, ChevronRight, FileText, CheckCircle2, Trash2, RefreshCw } from "lucide-react";
import { cn } from "./Common";

export default function MomCard({ meeting, onClick, onDelete, onRetry }: any) {
  const dateObj = new Date(meeting.date + 'Z'); // adjust for UTC if needed
  const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  
  const participantsCount = Array.isArray(meeting.participants) ? meeting.participants.length : 
                            (meeting.participants && typeof meeting.participants === "string" ? (()=>{ try{ return JSON.parse(meeting.participants).length; } catch(e){ return 0; }})() : 0);
  
  // Action Items counts
  let actionItems = [];
  try {
     actionItems = JSON.parse(meeting.action_items || "[]");
  } catch (e) {}
  
  const totalActionItems = actionItems.length;
  const doneActionItems = actionItems.filter((a: any) => a.status === 'done').length;
  
  const StatusBadge = () => {
    if (meeting.status === 'processing') return (
      <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
        {meeting.stage || "Memproses..."}
      </div>
    );
    if (meeting.status === 'error') return (
      <div className="flex items-center gap-2">
         <div className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest border border-red-100">Error</div>
         <button 
            onClick={(e) => { 
               e.stopPropagation(); 
               if (typeof onRetry === 'function') {
                  onRetry(meeting.id); 
               } else {
                  console.warn("onRetry prop is missing in MomCard");
               }
            }}
            className="p-1.5 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA] active:scale-95 transition shadow-sm"
            title="Coba Lagi (Retry)"
         >
            <RefreshCw size={10} strokeWidth={3} />
         </button>
      </div>
    );
    return <div className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest border border-green-100">Selesai</div>;
  };

  return (
    <div 
       onClick={onClick}
       className="w-full bg-white rounded-3xl p-5 flex flex-col gap-3 shadow-sm border border-[#F0EDE8]/60 hover:border-[#4F46E5]/30 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
             <StatusBadge />
             <span className="text-[10px] text-[#8A8886] font-bold">{dateStr} • {timeStr}</span>
          </div>
          <h4 className="text-lg font-black text-[#1A1C1E] leading-tight line-clamp-2">{meeting.title || "Untitled Meeting"}</h4>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#F8F7F4] flex items-center justify-center flex-shrink-0 text-[#8A8886]">
          <FileText size={18} />
        </div>
      </div>

      <div className="flex items-center gap-4 mt-1 border-t border-[#F0EDE8] pt-3">
        {meeting.duration_seconds > 0 && (
           <div className="flex items-center gap-1.5 text-[#8A8886]">
             <Clock size={14} />
             <span className="text-xs font-bold">
               {meeting.duration_seconds >= 3600 ? 
                 `${Math.floor(meeting.duration_seconds / 3600)}j ${Math.floor((meeting.duration_seconds % 3600) / 60)}m` : 
                 `${Math.floor(meeting.duration_seconds / 60)}m ${Math.floor(meeting.duration_seconds % 60)}s`}
             </span>
           </div>
        )}
        
        {participantsCount > 0 && (
           <div className="flex items-center gap-1.5 text-[#8A8886]">
             <Users size={14} />
             <span className="text-xs font-bold">{participantsCount} Peserta</span>
           </div>
        )}

        {totalActionItems > 0 && (
           <div className="flex items-center gap-1.5 text-[#8A8886]">
             <CheckCircle2 size={14} className={doneActionItems === totalActionItems ? "text-green-500" : ""} />
             <span className="text-xs font-bold">{doneActionItems}/{totalActionItems} Tasks</span>
           </div>
        )}
        
        {onDelete && (
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(meeting.id); }}
             className="ml-auto p-1.5 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition"
           >
             <Trash2 size={16} />
           </button>
        )}
      </div>
    </div>
  );
}
