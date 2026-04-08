"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, ChevronRight, Cookie, Edit2, Flame, History, Info, Moon, Plus, ShieldCheck, Sparkles, Sun, SunDim, Target, Trash2, TrendingUp, User, X, Zap, Mic } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Hapus", cancelText = "Batal", isDestructive = true }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-[#2D2926]/40 backdrop-blur-[2px]"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl overflow-hidden border border-[var(--border-color)]"
          >
            <div className="absolute top-0 right-0 p-6">
               <button onClick={onCancel} className="p-2 rounded-xl hover:bg-[var(--bg)] text-[var(--text-dim)] transition">
                  <X size={22} />
               </button>
            </div>
            
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8", 
               isDestructive ? "bg-red-50 text-red-500" : "bg-[var(--color-orange)]/10 text-[var(--color-orange)]")}>
               <Trash2 size={32} />
            </div>
            
            <h3 className="text-2xl font-serif text-[var(--text-main)] mb-3">{title}</h3>
            <p className="text-[var(--text-dim)] text-base leading-relaxed mb-10">{message}</p>
            
            <div className="flex gap-4">
               <button 
                  onClick={onCancel}
                  className="flex-1 py-4 rounded-xl bg-[var(--bg)] text-[var(--text-main)] font-bold text-sm hover:bg-[var(--border-color)] transition"
               >
                  {cancelText}
               </button>
               <button 
                  onClick={onConfirm}
                  className={cn("flex-1 py-4 rounded-xl text-white font-bold text-sm transition shadow-lg", 
                     isDestructive ? "bg-red-600 hover:bg-red-700 shadow-red-200/50" : "bg-[var(--color-orange)] hover:bg-[#C86646] shadow-orange-200/50")}
               >
                  {confirmText}
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function StatItem({ label, val, unit, color }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div>
        <p className="text-[10px] text-[#8A8886] font-black uppercase leading-none mb-1">{label}</p>
        <p className="text-base font-black text-[var(--text-main)] leading-none">{val} <span className="text-[10px] text-[#8A8886]">{unit}</span></p>
      </div>
    </div>
  );
}

export function NavItem({ icon, label, active, onClick, activeColor = "var(--color-orange)" }: any) {
  return (
    <button onClick={onClick} className={cn("relative flex-1 flex flex-col items-center justify-center h-full",
      active ? "" : "text-[#B0ADAA]")} style={active ? {color: activeColor} : {}}>
      <motion.div 
        animate={{ scale: active ? 1.15 : 1, y: active ? -8 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className={cn("p-2.5 rounded-2xl", active && "shadow-inner")}
        style={active ? {backgroundColor: `${activeColor}1A`} : {}}
      >
        {icon}
      </motion.div>
      <AnimatePresence>
        {active && (
          <motion.span 
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute bottom-2.5 text-[9px] font-black uppercase tracking-tighter"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function HistoryCard({ item, onClick, onDelete }: any) {
  const scoreColor = item.score >= 80 ? "#22C55E" : item.score >= 50 ? "#F59E0B" : "#EF4444";
  const catIcon = item.category === "Sarapan" ? <Sun size={13} /> :
    item.category === "Makan Siang" ? <SunDim size={13} /> :
    item.category === "Makan Malam" ? <Moon size={13} /> : <Cookie size={13} />;

  return (
    <div className="w-full bg-white rounded-[2rem] p-4 flex items-center gap-3 shadow-sm border border-[#E8E4D9]/60 hover:border-var(--color-orange)/30 hover:shadow-lg transition-all active:scale-[0.98] card-hover group cursor-pointer" onClick={onClick}>
      <div className="w-16 h-16 rounded-[1.2rem] bg-[var(--bg)] overflow-hidden flex-shrink-0 border border-[#E8E4D9]/50 relative flex items-center justify-center">
        {item.image ? (
          <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="food" />
        ) : (
          <div className="relative flex items-center justify-center">
             <Mic className="text-var(--color-orange)/60" size={24} />
             {item.audioLog && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-var(--color-orange) rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                   <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-white border-b-[3px] border-b-transparent ml-0.5" />
                </div>
             )}
          </div>
        )}
        <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[1.2rem]" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-[16px] font-black text-[var(--text-main)] leading-tight mb-1 truncate tracking-tight">{item.name}</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--bg)] px-2.5 py-0.5 rounded-full border border-[#E8E4D9]">
            <span className="text-var(--color-orange)">{catIcon}</span>
            <p className="text-[9px] text-[var(--text-main)] font-black uppercase tracking-tighter">{item.category}</p>
          </div>
          <div className="w-1 h-1 rounded-full bg-[#E5E2DE]" />
          <div className="flex items-center gap-1">
             <span className="text-[10px]">⭐</span>
             <p className="text-[10px] font-black" style={{ color: scoreColor }}>{item.score}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0 pl-2">
        <p className="text-2xl font-black text-[var(--text-main)] leading-none tracking-tighter">{item.calories}<span className="text-[10px] ml-0.5 text-[#8A8886] font-bold">kcal</span></p>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-[9px] text-[#8A8886] font-bold uppercase tracking-tighter">{item.time}</p>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-full text-[#EF4444] bg-red-50 hover:bg-red-500 hover:text-white transition-all active:scale-90 ml-1">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MacroBar({ label, current, target, color }: any) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-[#8A8886] font-black uppercase w-11 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#E8E4D9] rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full" style={{ backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-[var(--text-main)] font-black w-20 text-right flex-shrink-0">{Math.round(current)}/{target}g</span>
    </div>
  );
}

export function NutrientBox({ label, val, unit, color }: any) {
  return (
    <div className="bg-white p-4 rounded-3xl border border-[#E8E4D9]/60 text-center shadow-sm card-hover flex flex-col items-center">
      <p className="text-[9px] font-black text-[#8A8886] uppercase tracking-[0.15em] mb-2">{label}</p>
      <p className="text-xl font-black text-[var(--text-main)] leading-none mb-3">{Math.round(val)}<span className="text-[10px] ml-1 text-[#8A8886] font-bold uppercase">{unit}</span></p>
      <div className="h-1.5 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[#E8E4D9]/20">
        <motion.div 
           initial={{ width: 0 }} 
           animate={{ width: "70%" }} 
           className="h-full rounded-full" 
           style={{ backgroundColor: color }} 
        />
      </div>
    </div>
  );
}

export function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/50 rounded-[2rem] p-10 border border-dashed border-[#E8E6E1] text-center">
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        className="text-4xl mb-3 opacity-20">🥗</motion.div>
      <p className="text-sm font-black text-[var(--text-main)] mb-1">Belum ada makanan hari ini!</p>
      <p className="text-xs text-[#8A8886] mb-5">Foto makananmu — AI hitung kalorinya dalam detik ⚡</p>
      <button onClick={onScan}
        className="inline-flex items-center gap-2 bg-var(--color-orange) text-white text-xs font-black px-5 py-2.5 rounded-full active:scale-95 transition-transform shadow-lg shadow-var(--color-orange)/20">
        Scan Sekarang 📸
      </button>
    </motion.div>
  );
}

export function GoalSlider({ label, unit, value, onChange, min, max, step }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] font-black text-[#8A8886] uppercase tracking-[0.2em]">{label}</label>
        <span className="text-lg font-black text-var(--color-orange)">{value} <span className="text-xs text-[#8A8886] font-bold">{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full accent-var(--color-orange) h-1.5 cursor-pointer bg-[var(--bg)] rounded-full" />
    </div>
  );
}

export function WeeklyChart({ data, goal }: { data: any[]; goal: number }) {
  const maxVal = Math.max(...data.map(d => d.calories), goal, 1);
  const barH   = 80;
  return (
    <div className="flex items-end gap-1.5" style={{ height: barH + 32 }}>
      {data.map((d, i) => {
        const h  = d.calories === 0 ? 3 : (d.calories / maxVal) * barH;
        const bg = d.isToday ? "var(--color-orange)" : d.calories > goal ? "#EF4444" : "#E8E4D9";
        const tc = d.isToday ? "var(--color-orange)" : "#BDBDBD";
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: barH }}>
              <motion.div initial={{ height: 0 }} animate={{ height: h }}
                transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
                className="w-full rounded-t-lg" style={{ backgroundColor: bg, minHeight: 3 }} />
            </div>
            <span className="text-[7px] sm:text-[9px] font-black uppercase text-center" style={{ color: tc }}>{d.day?.slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}
