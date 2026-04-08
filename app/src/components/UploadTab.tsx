import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileAudio, FileText, Loader2, ArrowRight, X, AlertCircle } from "lucide-react";

export default function UploadTab({ onProcessTranscript, onTranscribeAudio, isProcessing, transcribeProgress, initialFile }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [showLargeFileWarning, setShowLargeFileWarning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFile) {
       validateFile(initialFile);
       setFile(initialFile);
    }
  }, [initialFile]);

  const allowedFormats = [
    "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/webm", "video/webm", 
    "audio/aac", "audio/ogg", "audio/flac", "audio/x-flac", "audio/mp4",
    "text/plain"
  ];
  const allowedExtensions = [".mp3", ".wav", ".m4a", ".webm", ".txt", ".aac", ".ogg", ".flac", ".mp4"];

  const validateFile = (selectedFile: File) => {
    const extension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf("."));
    const isValid = allowedFormats.includes(selectedFile.type) || allowedExtensions.includes(extension);

    if (!isValid) {
      setErrorMsg(`YoTa bingung nih sama file yang dikasih itu apa, YoTa hanya tau Audio (MP3, WAV, AAC, M4A, OGG, FLAC) atau TXT saja nih, coba hubungi 08992246000 untuk tanya lebih lanjut deh.`);
      setFile(null);
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleClearFile = (e: any) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleProcess = async () => {
    if (!file) return;
    
    const isAudio = !file.name.endsWith('.txt') && !file.type.startsWith('text');
    if (isAudio && file.size > 100 * 1024 * 1024 && !showLargeFileWarning) {
       setShowLargeFileWarning(true);
       return;
    }

    setShowLargeFileWarning(false);
    
    if (file.name.endsWith('.txt') || file.type.startsWith('text')) {
       const reader = new FileReader();
       reader.onload = (e) => {
          const text = e.target?.result as string;
          onProcessTranscript(text, language, 0);
       };
       reader.readAsText(file);
    } else {
       onTranscribeAudio(file, language);
    }
  };

  const isAudioFile = file && !file.name.endsWith('.txt') && !file.type.startsWith('text');

  return (
    <div className="flex flex-col pt-6 relative h-full">
      {/* Large File Warning Overlay */}
      <AnimatePresence>
        {showLargeFileWarning && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-0 bottom-0 z-50 bg-white/95 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 bg-[var(--color-orange)]/10 text-[var(--color-orange)] rounded-3xl flex items-center justify-center mb-6">
               <FileAudio size={40} />
            </div>
            <h3 className="text-xl font-black text-[var(--text-main)] mb-2">File Ukuran Besar</h3>
            <p className="text-sm font-medium text-[var(--text-dim)] mb-8 leading-relaxed">
               File ini berukuran <b>{(file!.size / 1024 / 1024).toFixed(1)} MB</b>. <br/>
               AI akan membagi file ini menjadi beberapa bagian. Estimasi waktu proses: <b>~5-10 menit</b>.
            </p>
            <div className="flex gap-3 w-full max-w-sm">
               <button onClick={() => setShowLargeFileWarning(false)} className="flex-1 h-14 rounded-2xl border-2 border-[var(--border-color)] font-black text-sm text-[var(--text-dim)] transition-colors hover:bg-gray-50">Batal</button>
               <button onClick={handleProcess} className="flex-1 h-14 rounded-2xl bg-[var(--color-orange)] text-white font-black text-sm shadow-lg shadow-[var(--color-orange)]/20 transition-transform active:scale-95">Lanjutkan</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Upload File</h2>
        <p className="text-[var(--text-dim)] text-sm font-medium mt-3 px-10">
          Tarik file rekaman rapat Anda atau pilih secara manual untuk dianalisis oleh YoTa.
        </p>
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".mp3,.wav,.m4a,.webm,.txt"
      />

      <motion.div 
         onClick={() => !isProcessing && fileInputRef.current?.click()}
         onDragOver={onDragOver}
         onDragLeave={onDragLeave}
         onDrop={onDrop}
         animate={{ 
            borderColor: isDragging ? "var(--color-orange)" : "var(--border-color)",
            backgroundColor: isDragging ? "rgba(var(--color-orange-rgb), 0.05)" : "white",
            scale: isDragging ? 1.02 : 1
         }}
         className={`relative flex-1 min-h-[300px] rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-8 cursor-pointer transition-all mb-8 ${isProcessing ? 'cursor-not-allowed opacity-75' : 'hover:bg-orange-50/30'}`}
      >
         {file ? (
            <div className="flex flex-col items-center w-full max-w-[80%]">
               <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 rounded-3xl bg-[var(--color-orange)]/10 flex items-center justify-center text-[var(--color-orange)] mb-6 shadow-sm ring-1 ring-[var(--color-orange)]/20"
               >
                  {isAudioFile ? <FileAudio size={48} /> : <FileText size={48} />}
               </motion.div>
               <p className="text-[var(--text-main)] text-lg font-black text-center break-words w-full px-4">{file.name}</p>
               <p className="text-[var(--text-dim)] text-sm font-bold mt-2 opacity-60">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
               
               {!isProcessing && (
                 <button 
                   onClick={handleClearFile}
                   className="mt-6 flex items-center gap-2 text-xs font-black text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-full transition-colors"
                 >
                   <X size={14} /> Ganti File
                 </button>
               )}
            </div>
         ) : (
            <div className="flex flex-col items-center text-center">
               <motion.div 
                animate={{ y: isDragging ? -10 : 0 }}
                className="w-24 h-24 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--text-dim)] mb-6"
               >
                  <UploadCloud size={48} strokeWidth={1.5} />
               </motion.div>
               <p className="text-[var(--text-main)] text-xl font-black mb-2">
                 {isDragging ? "Lepaskan untuk Memproses" : "Tarik File ke Sini"}
               </p>
               <p className="text-[var(--text-dim)] text-sm font-medium opacity-60">
                 atau klik untuk memilih dari komputer Anda
               </p>
               <div className="mt-8 px-6 py-2 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Supported</span>
                 <div className="flex flex-wrap gap-2 justify-center max-w-[300px]">
                   {['MP3', 'WAV', 'AAC', 'M4A', 'OGG', 'FLAC', 'TXT'].map(fmt => (
                     <span key={fmt} className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-500 font-bold">{fmt}</span>
                   ))}
                 </div>
               </div>
            </div>
         )}
      </motion.div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 p-5 rounded-[1.5rem] bg-rose-50 border border-rose-100 flex items-start gap-4"
          >
            <div className="mt-0.5 text-rose-500">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-900 leading-relaxed italic">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {file && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-8 pb-10"
            >
               {!isProcessing && (
                  <div className="px-2">
                     <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-orange)]" />
                        <p className="text-xs font-black text-[var(--text-dim)] uppercase tracking-widest">Bahasa Meeting</p>
                     </div>
                     <div className="flex gap-4">
                        <button 
                           onClick={() => setLanguage("id")}
                           className={`flex-1 py-4 rounded-[1.25rem] font-black text-sm border-2 transition-all ${language === "id" ? "border-[var(--color-orange)] bg-[var(--color-orange)] shadow-md shadow-orange-200 text-white" : "border-[var(--border-color)] text-[var(--text-dim)] hover:border-gray-300"}`}
                        >
                           Indonesia
                        </button>
                        <button 
                           onClick={() => setLanguage("en")}
                           className={`flex-1 py-4 rounded-[1.25rem] font-black text-sm border-2 transition-all ${language === "en" ? "border-[var(--color-orange)] bg-[var(--color-orange)] shadow-md shadow-orange-200 text-white" : "border-[var(--border-color)] text-[var(--text-dim)] hover:border-gray-300"}`}
                        >
                           English
                        </button>
                     </div>
                  </div>
               )}

               <button 
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full h-18 rounded-[1.75rem] bg-[var(--color-orange)] text-white font-black text-lg tracking-tight active:scale-95 transition-all shadow-2xl shadow-[var(--color-orange)]/40 flex flex-col items-center justify-center disabled:opacity-50 group overflow-hidden relative"
               >
                  <div className="flex items-center gap-3 relative z-10">
                    {isProcessing ? <Loader2 size={24} className="animate-spin" /> : null}
                    <span className="uppercase tracking-wide">
                      {isProcessing 
                        ? (transcribeProgress?.current != null && transcribeProgress?.total != null 
                            ? `TRANSKRIPSI (${transcribeProgress.current}/${transcribeProgress.total})` 
                            : (transcribeProgress?.message || "Processing...")) 
                        : "Mulai Analisis"}
                    </span>
                    {!isProcessing && <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />}
                  </div>
                  
                  {isProcessing && transcribeProgress?.total > 0 && (
                    <div className="w-1/2 h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden relative z-10">
                       <motion.div 
                          className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
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
