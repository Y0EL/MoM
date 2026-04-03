"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, FileAudio, Clock, Settings, User, Zap, Loader2, Plus, ArrowRight, Save, Trash2, StopCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Components
import { NavItem, ConfirmModal, cn } from "../components/Common";
import MeetingRecorder from "../components/MeetingRecorder";
import MomCard from "../components/MomCard";
import MomViewer from "../components/MomViewer";
import UploadTab from "../components/UploadTab";
import SettingsTab from "../components/SettingsTab";

// We'll define simple placeholder components for the tabs we haven't built yet
const LiveMeetingTab = ({ onStartRecording, isProcessing, currentStage }: any) => {
  return (
    <div className="flex flex-col items-center justify-center h-full pt-10">
      <div className="w-full max-w-sm mb-10 text-center">
        <h2 className="text-3xl font-black text-[#1A1C1E] tracking-tight mb-3">Siap Rapat?</h2>
        <p className="text-[#8A8886] text-sm">Tekan tombol di bawah untuk mulai merekam dan biarkan AI yang mencatat MoM untukmu.</p>
      </div>

      <div className="relative">
        {/* Glow behind button */}
        <div className="absolute inset-0 bg-[#4F46E5]/40 rounded-full blur-[40px] animate-pulse" />
        
        <button 
          onClick={onStartRecording}
          disabled={isProcessing}
          className="relative w-40 h-40 bg-gradient-to-tr from-[#4F46E5] to-[#6366F1] rounded-full flex flex-col items-center justify-center shadow-2xl shadow-[#4F46E5]/40 active:scale-90 transition-all disabled:opacity-70 disabled:scale-100"
        >
          {isProcessing ? (
             <Loader2 size={48} className="text-white animate-spin mb-2" />
          ) : (
             <Mic size={48} className="text-white mb-2" />
          )}
          <span className="text-white font-black tracking-widest text-xs uppercase">
            {isProcessing ? "Memproses" : "Mulai Rekam"}
          </span>
        </button>

        {isProcessing && currentStage && (
           <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-white py-1.5 px-4 rounded-full shadow-lg border border-[#F0EDE8]">
              <span className="text-xs font-bold text-[#4F46E5] uppercase tracking-wider">{currentStage}</span>
           </div>
        )}
      </div>
    </div>
  );
};

const HistoryTabPlaceholder = ({ meetings, loading, onSelectMeeting, onSearch, onDelete, onRetry }: any) => {
  return (
    <div className="flex flex-col h-full pt-4">
      <div className="flex items-center gap-3 mb-8 bg-white px-5 py-4 rounded-3xl shadow-sm border border-[#F0EDE8]">
         <Loader2 className={cn("text-[#4F46E5]", loading ? "animate-spin" : "opacity-30")} size={20} />
         <input 
           type="text" 
           placeholder="Cari Judul atau Transkrip..." 
           className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-[#1A1C1E] placeholder:text-[#B0ADAA]"
           onChange={(e) => onSearch(e.target.value)}
         />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pb-10">
        {loading ? (
           <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin text-[#4F46E5]" size={24} />
           </div>
        ) : meetings.length === 0 ? (
           <div className="text-center text-[#8A8886] mt-20 flex flex-col items-center">
              <Clock size={40} className="mb-4 opacity-20" />
              <p className="font-bold">Tidak ada riwayat rapat</p>
           </div>
        ) : (
           meetings.map((m: any) => (
             <MomCard key={m.id} meeting={m} onClick={() => onSelectMeeting(m)} onDelete={onDelete} onRetry={onRetry} />
           ))
        )}
      </div>
    </div>
  );
};

const BACKEND_URL = "http://localhost:8000";

export default function App() {
  const router = useRouter();
  // State
  const [activeTab, setActiveTab] = useState<"live" | "upload" | "history" | "settings">("live");
  const [defaultLanguage, setDefaultLanguage] = useState<"id" | "en">("id");
  const [mounted, setMounted] = useState(false);
  
  // Recorder State
  const [showRecorder, setShowRecorder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [transcribeProgress, setTranscribeProgress] = useState<any>(null); // { current, total, message, status }
  const [meetings, setMeetings] = useState<any[]>([]);
  
  // History State
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Viewer State
  const [activeMeeting, setActiveMeeting] = useState<any>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem("mom_lang") as "id" | "en";
    if(savedLang) setDefaultLanguage(savedLang);
    fetchHistory();
  }, []);

  const handleChangeLanguage = (lang: "id" | "en") => {
     setDefaultLanguage(lang);
     localStorage.setItem("mom_lang", lang);
  };

  const fetchHistory = async (keyword: string = "") => {
     setLoadingHistory(true);
     try {
        const url = keyword ? `${BACKEND_URL}/mom/history?search=${keyword}` : `${BACKEND_URL}/mom/history?limit=20`;
        const res = await fetch(url);
        if (res.ok) {
           const data = await res.json();
           setMeetings(data.meetings || []);
        }
     } catch (e) {
        console.error("Gagal fetch history", e);
     } finally {
        setLoadingHistory(false);
     }
  };

  const handleDeleteMeeting = async (id: string) => {
      setDeleteId(id);
   };

   const confirmDelete = async () => {
      if (!deleteId) return;
      try {
         const res = await fetch(`${BACKEND_URL}/mom/${deleteId}`, { method: 'DELETE' });
         if(res.ok) fetchHistory();
      } catch(e) { console.error("Gagal menghapus meeting", e); }
      setDeleteId(null);
   };

   const handleRetryMeeting = async (meetingId: string) => {
      // Set meeting status to processing in local UI
      setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'processing', stage: 'Mempersiapkan...' } : m));
      
      const eventSource = new EventSource(`${BACKEND_URL}/mom/${meetingId}/retry/stream`);
      
      const labels: any = {
         "init": "Persiapan...", "cleaning": "Membersihkan...", "cleaning_done": "Selesai Bersih",
         "analyzing": "Menganalisis...", "analyzing_done": "Analisis Selesai",
         "extracting": "Ekstraksi...", "extracting_done": "Selesai Ekstraksi",
         "writing": "Menulis Dokumen...", "formatting": "Memformat...",
         "finalizing": "Finalisasi...", "done": "Selesai"
      };

      eventSource.onmessage = (event) => {
         try {
            const data = JSON.parse(event.data);
            
            // Update meetings list with progress
            const updatedMeetingData: any = { 
               status: data.stage === 'done' ? 'done' : (data.stage === 'error' ? 'error' : 'processing'),
               stage: data.stage === 'done' ? 'Selesai' : (data.stage === 'error' ? 'Error' : (labels[data.stage] || 'Memproses...')),
               stage_raw: data.stage
            };

            if (data.stage === 'done') {
                updatedMeetingData.mom_document = data.content;
                updatedMeetingData.action_items = data.action_items;
                updatedMeetingData.clean_transcript = data.clean_transcript;
            }

            setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, ...updatedMeetingData } : m));
            
            // Sync with active viewer
            setActiveMeeting((prev: any) => {
               if (prev && prev.id === meetingId) {
                  return { ...prev, ...updatedMeetingData };
               }
               return prev;
            });

            if (data.stage === "done" || data.stage === "error") {
               eventSource.close();
               fetchHistory(); 
            }
         } catch (e) {
            console.error("Retry stream parse error", e);
         }
      };

      eventSource.onerror = (err) => {
         console.error("Retry event source error", err);
         eventSource.close();
         fetchHistory();
      };
   };

  const handleSearch = (val: string) => {
      // or we could use a ref timeout
      fetchHistory(val);
   };

   const handleSelectMeeting = async (meeting: any) => {
      setActiveMeeting(meeting);
      try {
         const res = await fetch(`${BACKEND_URL}/mom/${meeting.id}`);
         if (res.ok) {
            const data = await res.json();
            // Map action_items_detail (with IDs) to action_items
            if (data.action_items_detail) {
               data.action_items = data.action_items_detail;
            }
            setActiveMeeting(data);
         }
      } catch (e) {
         console.error("Failed to fetch meeting detail:", e);
      }
   };

  const handleExport = async (meetingId: string, format: string) => {
     window.open(`${BACKEND_URL}/mom/${meetingId}/export?format=${format}`, "_blank");
  };

  const handleRecordingConfirm = async (transcript: string, audioDataUrl: string | null, duration: number) => {
    if (!transcript) {
       setShowRecorder(false);
       return;
    }
    
    setIsProcessing(true);
    setProcessingStage("transcribing");
    setTranscribeProgress(null);
    
    let finalTranscription = transcript;

    try {
      if (audioDataUrl) {
        try {
          const resB = await fetch(audioDataUrl);
          const blob = await resB.blob();
          
          const taskId = `tr-${Date.now()}`;
          const currentProgressSource = new EventSource(`${BACKEND_URL}/mom/transcribe/stream/${taskId}`);
          currentProgressSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            setTranscribeProgress(data);
          };

          const fd = new FormData();
          fd.append("audio", blob, "meeting.webm");
          fd.append("language", defaultLanguage);
          fd.append("enable_diarization", "true");
          fd.append("task_id", taskId);

          const transcribeRes = await fetch(`${BACKEND_URL}/mom/transcribe`, {
            method: "POST",
            body: fd,
          });
          
          currentProgressSource.close();
          setTranscribeProgress(null);
          
          if (transcribeRes.ok) {
            const tData = await transcribeRes.json();
            if (tData.duration_seconds) {
               duration = tData.duration_seconds;
            }
            if (tData.text && tData.text.trim().length > 2) {
              finalTranscription = tData.text; 
            } else {
               alert("Transkripsi suara kosong, coba lagi.");
               setIsProcessing(false);
               setShowRecorder(false);
               return;
            }
          } else {
             const errData = await transcribeRes.json();
             alert(`Gagal mentranskrip: ${errData.detail || "Error Unknown"}`);
             setIsProcessing(false);
             setShowRecorder(false);
             return;
          }
        } catch (e) {
          console.error("Transcribe failed, falling back to browser text:", e);
        }
      }

      setShowRecorder(false);
      setIsProcessing(false);
      setProcessingStage("");
      setActiveTab("history");
      executeStream(finalTranscription, defaultLanguage, duration);

    } catch (err) {
       console.error("Error Processing:", err);
       alert("Terjadi kesalahan saat memproses MoM");
       setIsProcessing(false);
       setProcessingStage("");
    }
  };

  const handleUploadAudio = async (file: File, language: string) => {
     setIsProcessing(true);
     setProcessingStage("transcribing");
     setTranscribeProgress(null);
     
     try {
         const taskId = `up-${Date.now()}`;
         const currentProgressSource = new EventSource(`${BACKEND_URL}/mom/transcribe/stream/${taskId}`);
         currentProgressSource.onmessage = (e) => {
           const data = JSON.parse(e.data);
           setTranscribeProgress(data);
         };

         const fd = new FormData();
         fd.append("audio", file);
         fd.append("language", language);
         fd.append("enable_diarization", "true");
         fd.append("task_id", taskId);

         const transcribeRes = await fetch(`${BACKEND_URL}/mom/transcribe`, {
            method: "POST",
            body: fd,
         });
         
         currentProgressSource.close();
         setTranscribeProgress(null);
         
         if (!transcribeRes.ok) throw new Error("Gagal mentranskripsi audio upload");
         const tData = await transcribeRes.json();
         const finalTranscription = tData.text;
         const finalDuration = tData.duration_seconds || 0;

         if (!finalTranscription) throw new Error("Audio kosong atau gagal diterjemahkan");

         setIsProcessing(false);
         setProcessingStage("");
         setActiveTab("history");
         executeStream(finalTranscription, language, finalDuration);

     } catch(err: any) {
         alert(err.message || "Gagal mengupload audio");
         setIsProcessing(false);
         setProcessingStage("");
         setTranscribeProgress(null);
     }
  };

  const handleUploadTranscript = async (text: string, language: string, duration: number) => {
     try {
        setIsProcessing(false);
        setProcessingStage("");
        setActiveTab("history");
        executeStream(text, language, duration);
     } catch (err: any) {
        alert(err.message || "Gagal memproses transcript");
        setIsProcessing(false);
        setProcessingStage("");
     }
  };

  const executeStream = async (transcript: string, language: string, duration: number) => {
      const payload = { transcript, language, participants: [], duration_seconds: duration };

      try {
         const res = await fetch(`${BACKEND_URL}/mom/process/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         if (!res.ok) throw new Error("Gagal memulai processing");
         if (!res.body) throw new Error("Tidak ada stream response");

         const reader = res.body.getReader();
         const decoder = new TextDecoder("utf-8");
         let currentMeetingId = "";

         while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
               if (line.startsWith('data: ')) {
                  try {
                     const dataStr = line.substring(6);
                     if (dataStr) {
                        const data = JSON.parse(dataStr);
                        if (data.meeting_id) currentMeetingId = data.meeting_id;

                        // Update local meetings state
                        setMeetings(prev => {
                           const idx = prev.findIndex(m => m.id === currentMeetingId);
                           const meetingData = {
                              id: currentMeetingId,
                              title: data.meeting_title || prev[idx]?.title || "Memproses Meeting...",
                              date: data.date || prev[idx]?.date || new Date().toISOString(),
                              status: data.stage === "done" ? "done" : (data.stage === "error" ? "error" : "processing"),
                              stage: data.stage === "done" ? "Selesai" : (data.stage === "error" ? "Error" : getStageLabel(data.stage)),
                              duration_seconds: duration,
                              mom_document: data.stage === "done" ? data.content : "",
                              action_items: data.stage === "done" ? JSON.stringify(data.action_items) : "[]",
                              participants: data.stage === "done" ? JSON.stringify(data.participants || []) : "[]",
                           };

                           if (idx !== -1) {
                              const newMeetings = [...prev];
                              newMeetings[idx] = { ...newMeetings[idx], ...meetingData };
                              return newMeetings;
                           } else {
                              return [meetingData, ...prev];
                           }
                        });

                        // Sync with active viewer
                        setActiveMeeting((prev: any) => {
                           if (prev && prev.id === currentMeetingId) {
                              return {
                                 ...prev,
                                 status: data.stage === "done" ? "done" : (data.stage === "error" ? "error" : "processing"),
                                 stage: data.stage === "done" ? "Selesai" : (data.stage === "error" ? "Error" : getStageLabel(data.stage)),
                                 stage_raw: data.stage,
                                 mom_document: data.stage === "done" ? data.content : prev.mom_document,
                                 action_items: data.stage === "done" ? data.action_items : prev.action_items,
                              }
                           }
                           return prev;
                        });
                     }
                  } catch (e) { /* ignore chunk error */ }
               }
            }
         }
      } catch (e: any) {
         console.error("Execute Stream Error:", e);
      }
  };

  const getStageLabel = (stage: string) => {
     const labels: any = {
        "init": "Persiapan...", "cleaning": "Membersihkan...", "cleaning_done": "Selesai Bersih",
        "analyzing": "Menganalisis...", "analyzing_done": "Analisis Selesai",
        "extracting": "Ekstraksi...", "extracting_done": "Selesai Ekstraksi",
        "writing": "Menulis Dokumen...", "formatting": "Memformat...",
        "finalizing": "Finalisasi...", "done": "Selesai"
     };
     return labels[stage] || "Memproses...";
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-[#F8F7F4] font-sans border-x border-[#F0EDE8]/50 shadow-2xl shadow-indigo-100/20">
      
      {/* ── Header ── */}
      <header className="px-6 pt-10 pb-4 flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-[#1A1C1E] tracking-tight holographic-text font-serif italic">
               YOTA
            </h1>
            <div className="bg-[#4F46E5]/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <Zap size={10} className="text-[#4F46E5] fill-[#4F46E5]" />
              <span className="text-[10px] text-[#4F46E5] font-black uppercase tracking-widest">AI Agent</span>
            </div>
          </div>
          <p className="text-xs font-bold text-[#8A8886]">Your Intelligent AI Assistant</p>
        </div>
        <button onClick={() => setActiveTab("settings")} className="relative group">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1C1E] shadow-sm border border-[#F0EDE8] active:scale-95 transition-transform">
            <User size={18} />
          </div>
        </button>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto px-6 pb-32 scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeTab === "live" && (
               <LiveMeetingTab 
                 onStartRecording={() => setShowRecorder(true)} 
                 isProcessing={isProcessing}
                 currentStage={processingStage}
               />
            )}
            {activeTab === "upload" && (
               <UploadTab 
                  isProcessing={isProcessing}
                  onTranscribeAudio={handleUploadAudio}
                  onProcessTranscript={handleUploadTranscript}
                  transcribeProgress={transcribeProgress}
               />
            )}
            {activeTab === "history" && (
               <HistoryTabPlaceholder 
                 meetings={meetings} 
                 loading={loadingHistory}
                 onSelectMeeting={handleSelectMeeting}
                 onSearch={handleSearch}
                 onDelete={handleDeleteMeeting}
                 onRetry={handleRetryMeeting}
               />
            )}
            {activeTab === "settings" && (
               <SettingsTab 
                  defaultLanguage={defaultLanguage} 
                  onChangeLanguage={handleChangeLanguage} 
               />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 h-[72px] rounded-full flex items-center justify-between px-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.14)] z-40 border border-white bg-white/80 backdrop-blur-xl w-[calc(100%-48px)] max-w-md">
        <NavItem 
            icon={<Mic size={24} strokeWidth={activeTab === "live" ? 2.5 : 2} />} 
            label="Live" 
            active={activeTab === "live"} 
            onClick={() => setActiveTab("live")} 
            activeColor="#4F46E5"
        />
        <NavItem 
            icon={<FileAudio size={24} strokeWidth={activeTab === "upload" ? 2.5 : 2} />} 
            label="Upload" 
            active={activeTab === "upload"} 
            onClick={() => setActiveTab("upload")} 
            activeColor="#4F46E5"
        />
        
        {/* Floating Center Button (Record / Add) - Optional since UI might not need it, but adds flair */}
        <div className="w-16 h-16 flex items-center justify-center -mt-8 mx-1 bg-[#F8F7F4] rounded-full p-2 border-t border-white/50">
          <motion.button 
            onClick={() => setActiveTab("live")}
            whileTap={{ scale: 0.9 }}
            className={cn(
               "w-full h-full rounded-full flex items-center justify-center relative overflow-hidden group transition-all",
               activeTab === "live" ? "bg-[#4F46E5] shadow-[0_10px_20px_-5px_#4F46E5]" : "bg-[#1A1C1E]"
            )}
          >
            <Mic className="text-white z-10" size={24} strokeWidth={2.5} />
          </motion.button>
        </div>

        <NavItem 
            icon={<Clock size={24} strokeWidth={activeTab === "history" ? 2.5 : 2} />} 
            label="Riwayat" 
            active={activeTab === "history"} 
            onClick={() => setActiveTab("history")} 
            activeColor="#4F46E5"
        />
        <NavItem 
            icon={<Settings size={24} strokeWidth={activeTab === "settings" ? 2.5 : 2} />} 
            label="Settings" 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")} 
            activeColor="#4F46E5"
        />
      </nav>

      {/* ── Modals ── */}
      <MeetingRecorder
         isOpen={showRecorder}
         onClose={() => setShowRecorder(false)}
         onConfirm={handleRecordingConfirm}
         isProcessing={isProcessing}
         currentStage={processingStage}
      />

      <AnimatePresence>
        {activeMeeting && (
           <MomViewer 
              meeting={activeMeeting}
              onClose={() => setActiveMeeting(null)}
              onExport={handleExport}
           />
        )}
      </AnimatePresence>
       <ConfirmModal
          isOpen={!!deleteId}
          title="Hapus MoM?"
          message="Dokumen Minutes of Meeting ini akan dihapus permanen dan tidak dapat dikembalikan. Lanjutkan?"
          confirmText="Ya, Hapus"
          cancelText="Batal"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
       />
    </div>
  );
}
