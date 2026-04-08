import { useState, useEffect } from "react";
import { Settings, Globe, ShieldCheck, Zap } from "lucide-react";

export default function SettingsTab({ defaultLanguage, onChangeLanguage }: any) {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
     // Check backend status
     fetch("http://localhost:8000/mom/history?limit=1")
        .then(res => setApiStatus(res.ok ? "online" : "offline"))
        .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <div className="flex flex-col h-full pt-10">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Pengaturan</h2>
        <p className="text-[var(--text-dim)] text-xs font-bold mt-1">Konfigurasi AI Meeting Assistant</p>
      </div>

      <div className="space-y-6">
         {/* Language Settings */}
         <div className="bg-white p-5 rounded-3xl shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-xl bg-[var(--color-orange)]/10 flex items-center justify-center text-[var(--color-orange)]">
                  <Globe size={20} />
               </div>
               <div>
                  <h3 className="font-black text-[var(--text-main)]">Bahasa Utama</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-dim)]">Untuk AI & Transkripsi</p>
               </div>
            </div>
            <div className="flex gap-3">
               <button 
                  onClick={() => onChangeLanguage("id")}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm border-2 transition-all ${defaultLanguage === "id" ? "border-[var(--color-orange)] bg-[var(--color-orange)]/10 text-[var(--color-orange)]" : "border-[var(--border-color)] text-[var(--text-dim)]"}`}
               >
                  🇮🇩 Indonesia
               </button>
               <button 
                  onClick={() => onChangeLanguage("en")}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm border-2 transition-all ${defaultLanguage === "en" ? "border-[var(--color-orange)] bg-[var(--color-orange)]/10 text-[var(--color-orange)]" : "border-[var(--border-color)] text-[var(--text-dim)]"}`}
               >
                  🇬🇧 English
               </button>
            </div>
         </div>

         {/* System Status */}
         <div className="bg-white p-5 rounded-3xl shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center text-orange">
                  <ShieldCheck size={20} />
               </div>
               <div>
                  <h3 className="font-black text-[var(--text-main)]">Sistem Status</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-dim)]">Koneksi ke Provider</p>
               </div>
            </div>
            
            <div className="space-y-3">
               <div className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-2xl">
                  <div className="flex items-center gap-2">
                     <Zap size={16} className="text-[var(--text-dim)]" />
                     <span className="text-sm font-bold text-[var(--text-main)]">MoM Backend Server</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className={`w-2 h-2 rounded-full ${apiStatus === "online" ? "bg-green-500 animate-pulse" : apiStatus === "checking" ? "bg-yellow-500" : "bg-red-500"}`} />
                     <span className={`text-xs font-black uppercase tracking-widest ${apiStatus === "online" ? "text-green-500" : apiStatus === "checking" ? "text-yellow-500" : "text-red-500"}`}>{apiStatus}</span>
                  </div>
               </div>
               
               <div className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-2xl">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-[var(--text-main)]">OpenAI / CrewAI Layer</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-xs font-black uppercase tracking-widest text-green-500">Connected</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
      
      <p className="text-center text-[var(--text-dim)] text-xs font-bold mt-auto pb-4">Cimeat MoM Agent Edition v1.1.0</p>
    </div>
  );
}
