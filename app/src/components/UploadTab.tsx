import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileAudio, FileText, Loader2, ArrowRight } from "lucide-react";

export default function UploadTab({ onProcessTranscript, onTranscribeAudio, isProcessing, transcribeProgress }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [showLargeFileWarning, setShowLargeFileWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    
    // Check if it's a large audio file (> 100MB)
    const isAudio = !file.name.endsWith('.txt') && !file.type.startsWith('text');
    if (isAudio && file.size > 100 * 1024 * 1024 && !showLargeFileWarning) {
       setShowLargeFileWarning(true);
       return;
    }

    setShowLargeFileWarning(false);
    
    // Check if text or audio
    if (file.name.endsWith('.txt') || file.type.startsWith('text')) {
       // Read text locally
       const reader = new FileReader();
       reader.onload = (e) => {
          const text = e.target?.result as string;
          onProcessTranscript(text, language, 0); // duration unknown
       };
       reader.readAsText(file);
    } else {
       // It's audio
       onTranscribeAudio(file, language);
    }
  };

  const isAudio = file && !file.name.endsWith('.txt') && !file.type.startsWith('text');

  return (
    <div className="flex flex-col h-full pt-6 pt-10 relative">
      {/* Large File Warning Overlay */}
      <AnimatePresence>
        {showLargeFileWarning && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 bg-orange/10 text-orange rounded-3xl flex items-center justify-center mb-6">
               <FileAudio size={40} />
            </div>
            <h3 className="text-xl font-black text-[#1A1C1E] mb-2">File Ukuran Besar Terdeteksi</h3>
            <p className="text-sm font-medium text-[#8A8886] mb-8 leading-relaxed">
               File ini berukuran <b>{(file!.size / 1024 / 1024).toFixed(1)} MB</b>. <br/>
               AI akan membagi file ini menjadi beberapa bagian. Estimasi waktu proses: <b>~5-10 menit</b>.
            </p>
            <div className="flex gap-3 w-full">
               <button onClick={() => setShowLargeFileWarning(false)} className="flex-1 h-14 rounded-2xl border-2 border-[#E5E5E5] font-black text-sm text-[#8A8886]">Batal</button>
               <button onClick={handleProcess} className="flex-1 h-14 rounded-2xl bg-[#4F46E5] text-white font-black text-sm shadow-lg shadow-[#4F46E5]/20">Lanjutkan</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-[#1A1C1E] tracking-tight">Upload File</h2>
        <p className="text-[#8A8886] text-xs font-bold mt-2">Punya rekaman suara sendiri? Upload ke sini untuk diproses menjadi MoM.</p>
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="audio/*,video/*,.txt"
      />

      <div 
         onClick={() => !isProcessing && fileInputRef.current?.click()}
         className="flex-1 max-h-[220px] bg-white rounded-[2rem] border-2 border-dashed border-[#E5E5E5] hover:border-[#4F46E5]/50 hover:bg-[#F8F7F4] flex flex-col items-center justify-center p-6 cursor-pointer transition-all mb-6"
      >
         {file ? (
            <div className="flex flex-col items-center">
               <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-4">
                  {isAudio ? <FileAudio size={32} /> : <FileText size={32} />}
               </div>
               <p className="text-[#1A1C1E] font-black text-center truncate max-w-[200px]">{file.name}</p>
               <p className="text-[#8A8886] text-xs font-bold mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
         ) : (
            <div className="flex flex-col items-center text-center">
               <div className="w-16 h-16 rounded-full bg-[#F8F7F4] flex items-center justify-center text-[#8A8886] mb-4">
                  <UploadCloud size={32} />
               </div>
               <p className="text-[#1A1C1E] font-black mb-1">Tap untuk Memilih File</p>
               <p className="text-[#8A8886] text-xs font-bold">Mendukung MP3, WAV, M4A, WebM, atau TXT</p>
            </div>
         )}
      </div>

      <AnimatePresence>
         {file && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-6"
            >
               {!isProcessing && (
                  <div>
                     <p className="text-xs font-black text-[#8A8886] uppercase tracking-widest mb-3">Bahasa Meeting</p>
                     <div className="flex gap-3">
                        <button 
                           onClick={() => setLanguage("id")}
                           className={`flex-1 py-3 rounded-2xl font-black text-sm border-2 transition-all ${language === "id" ? "border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5]" : "border-[#E5E5E5] text-[#8A8886]"}`}
                        >
                           🇮🇩 Indonesia
                        </button>
                        <button 
                           onClick={() => setLanguage("en")}
                           className={`flex-1 py-3 rounded-2xl font-black text-sm border-2 transition-all ${language === "en" ? "border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5]" : "border-[#E5E5E5] text-[#8A8886]"}`}
                        >
                           🇬🇧 English
                        </button>
                     </div>
                  </div>
               )}

               <button 
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full h-16 rounded-[1.5rem] bg-[#4F46E5] text-white font-black tracking-tight active:scale-95 transition-all shadow-xl shadow-[#4F46E5]/30 flex flex-col items-center justify-center disabled:opacity-50"
               >
                  <div className="flex items-center gap-2">
                    {isProcessing ? <Loader2 size={20} className="animate-spin" /> : null}
                    <span>{isProcessing ? (transcribeProgress?.message || "Mengunggah & Memproses...") : "Proses Sekarang"}</span>
                    {!isProcessing && <ArrowRight size={20} />}
                  </div>
                  {isProcessing && transcribeProgress?.total > 0 && (
                    <div className="w-1/2 h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
                       <motion.div 
                          className="h-full bg-white" 
                          initial={{ width: 0 }} 
                          animate={{ width: `${(transcribeProgress.current / transcribeProgress.total) * 100}%` }}
                       />
                    </div>
                  )}
               </button>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
