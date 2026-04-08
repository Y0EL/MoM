"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronLeft, ChevronRight, FileAudio, FileText, Loader2, Mic, PanelLeftClose, PanelLeftOpen, Plus, Sparkle, UploadCloud, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Components
import { ConfirmModal, cn } from "../components/Common";
import MeetingRecorder from "../components/MeetingRecorder";
import MomViewer from "../components/MomViewer";
import SettingsTab from "../components/SettingsTab";
import UploadTab from "../components/UploadTab";

// Stores
import { useMeetingStore } from "../stores/meetingStore";

const BACKEND_URL = "http://127.0.0.1:8000";

export default function App() {
   const router = useRouter();
   const { setMeetingId } = useMeetingStore();

   // App State
   const [activeTab, setActiveTab] = useState<"live" | "upload" | "history" | "settings">("live");
   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
   const [defaultLanguage, setDefaultLanguage] = useState<"id" | "en">("id");
   const [mounted, setMounted] = useState(false);

   // Global Drag & Drop State
   const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
   const [globalError, setGlobalError] = useState<string | null>(null);
   const [pendingFile, setPendingFile] = useState<File | null>(null);

   // Recorder / Processing State
   const [showRecorder, setShowRecorder] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [processingStage, setProcessingStage] = useState("");
   const [transcribeProgress, setTranscribeProgress] = useState<any>(null);
   const [meetings, setMeetings] = useState<any[]>([]);

   // History State
   const [loadingHistory, setLoadingHistory] = useState(false);

   // Viewer State
   const [activeMeeting, setActiveMeeting] = useState<any>(null);

   // Delete State
   const [deleteId, setDeleteId] = useState<string | null>(null);
   const [showCancelConfirm, setShowCancelConfirm] = useState(false);

   // Track active SSE connections per taskId
   const trackingTasks = useRef<Set<string>>(new Set());

   useEffect(() => {
      setMounted(true);
      const savedLang = localStorage.getItem("mom_lang") as "id" | "en";
      if (savedLang) setDefaultLanguage(savedLang);
      fetchHistory();
   }, []);

   // Reconnect logic for long running tasks after refresh
   useEffect(() => {
      if (!mounted) return;
      meetings.forEach(m => {
         if (m.status === 'processing' && m.task_id && !trackingTasks.current.has(m.task_id)) {
            reconnectTranscriptionProgress(m.task_id, m.id);
         }
      });
   }, [meetings, mounted]);

   const reconnectTranscriptionProgress = (taskId: string, meetingId: string) => {
      if (trackingTasks.current.has(taskId)) return;
      trackingTasks.current.add(taskId);
      
      console.log(`[Reconnect] Attempting to track task: ${taskId} for meeting: ${meetingId}`);
      setIsProcessing(true); // Signal that we are processing
      const source = new EventSource(`${BACKEND_URL}/mom/transcribe/stream/${taskId}`);
      
      source.onmessage = (e) => {
         const data = JSON.parse(e.data);
         setTranscribeProgress(data);
         
         const realUpdate = (m: any) => {
            if (data.status === "transcribing" && data.current != null && data.total != null) {
               const percent = Math.round((data.current / (data.total || 1)) * 100);
               const label = `Mentranskrip (${data.current}/${data.total})`;
               return { ...m, stage: label, stage_raw: "transcribing", transcribe_percent: percent };
            } else if (data.message) {
               return { ...m, stage: data.message, stage_raw: data.status || "transcribing" };
            }
            return m;
         };

         setMeetings(prev => {
            const updated = prev.map(m => (m.id === meetingId || m.id === taskId) ? realUpdate(m) : m);
            // Auto-select if just reconnected
            const target = updated.find(m => m.id === meetingId || m.id === taskId);
            if (target) {
               setActiveMeeting((curr: any) => (!curr || curr.id === meetingId || curr.id === taskId) ? target : curr);
            }
            return updated;
         });

         if (data.status === "done" || data.status === "error") {
            source.close();
            trackingTasks.current.delete(taskId);
            setIsProcessing(false);
            fetchHistory();
         }
      };

      source.onerror = () => {
         source.close();
         trackingTasks.current.delete(taskId);
      };
   };

   const handleChangeLanguage = (lang: "id" | "en") => {
      setDefaultLanguage(lang);
      localStorage.setItem("mom_lang", lang);
   };

   const fetchHistory = async (keyword: string = "", retries = 3) => {
      setLoadingHistory(true);
      try {
         const url = keyword ? `${BACKEND_URL}/mom/history?search=${keyword}` : `${BACKEND_URL}/mom/history?limit=20`;
         const res = await fetch(url);
         if (res.ok) {
            const data = await res.json();
            setMeetings(data.meetings || []);
         } else if (retries > 0) {
            setTimeout(() => fetchHistory(keyword, retries - 1), 2000);
         }
      } catch (e) {
         console.error("Gagal fetch history", e);
         if (retries > 0) {
            setTimeout(() => fetchHistory(keyword, retries - 1), 2000);
         }
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
         if (res.ok) fetchHistory();
      } catch (e) { console.error("Gagal menghapus meeting", e); }
      setDeleteId(null);
   };

   const handleRetryMeeting = async (meetingId: string) => {
      setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'processing', stage: 'Mempersiapkan...' } : m));
      const eventSource = new EventSource(`${BACKEND_URL}/mom/${meetingId}/retry/stream`);

      const labels: any = {
         "init": "Persiapan...", "cleaning": "Membersihkan...", "cleaning_done": "Selesai Bersih",
         "analyzing": "Menganalisis...", "analyzing_done": "Analisis Selesai",
         "extracting": "Ekstraksi...", "extracting_done": "Selesai Bersih",
         "writing": "Menulis Dokumen...", "formatting": "Memformat...",
         "finalizing": "Finalisasi...", "done": "Selesai"
      };

      eventSource.onmessage = (event) => {
         try {
            const data = JSON.parse(event.data);
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
            setActiveMeeting((prev: any) => (prev && prev.id === meetingId) ? { ...prev, ...updatedMeetingData } : prev);
            if (data.stage === "done" || data.stage === "error") {
               eventSource.close();
               fetchHistory();
            }
         } catch (e) { console.error("Retry stream parse error", e); }
      };

      eventSource.onerror = (err) => {
         console.error("Retry event source error", err);
         eventSource.close();
         fetchHistory();
      };
   };

   const handleSelectMeeting = async (meeting: any) => {
      // If we are currently tracking this meeting via SSE, don't let the fetch overwrite live progress
      const isTracking = trackingTasks.current.has(meeting.task_id || meeting.id);
      const prevStage = activeMeeting?.id === meeting.id ? activeMeeting.stage : null;
      const prevPercent = activeMeeting?.id === meeting.id ? activeMeeting.transcribe_percent : null;

      setActiveMeeting(meeting);
      setMeetingId(meeting.id); // Set meeting ID for correction panel
      try {
         const res = await fetch(`${BACKEND_URL}/mom/${meeting.id}`);
         if (res.ok) {
            const data = await res.json();
            if (data.action_items_detail) data.action_items = data.action_items_detail;
            
            if (isTracking && prevStage) {
               data.stage = prevStage;
               data.transcribe_percent = prevPercent;
               data.stage_raw = "transcribing";
            }
            setActiveMeeting(data);
         }
      } catch (e) { console.error("Failed to fetch meeting detail:", e); }
   };

   const handleCancelTask = async () => {
      if (!activeMeeting) { 
         console.warn("[Cancel] No active meeting to cancel");
         setShowCancelConfirm(false); 
         return; 
      }
      const taskId = activeMeeting.task_id || activeMeeting.id;
      const meetingId = activeMeeting.id;
      console.log(`[Cancel] Sending cancel request for task: ${taskId}, meeting: ${meetingId}`);
      
      try {
         const res = await fetch(`${BACKEND_URL}/mom/transcribe/cancel/${taskId}`, { method: 'POST' });
         if (res.ok) {
            console.log("[Cancel] Success and Deleted");
            trackingTasks.current.delete(taskId);
            setTranscribeProgress(null);
            setIsProcessing(false);
            setActiveMeeting(null);
            // Hapus dari daftar lokal agar tidak reconnect
            setMeetings(prev => prev.filter(m => m.id !== meetingId && m.id !== taskId));
            fetchHistory();
         } else {
            console.error("[Cancel] Backend returned error:", await res.text());
         }
      } catch (e) { console.error("[Cancel] Request failed:", e); }
      setShowCancelConfirm(false);
   };

   const handleExport = async (meetingId: string, format: string) => {
      window.open(`${BACKEND_URL}/mom/${meetingId}/export?format=${format}`, "_blank");
   };

   const handleRecordingConfirm = async (transcript: string, audioDataUrl: string | null, duration: number) => {
      if (!transcript) { setShowRecorder(false); return; }
      setIsProcessing(true);
      setProcessingStage("transcribing");
      setTranscribeProgress(null);
      let finalTranscription = transcript;
      const taskId = `tr-${Date.now()}`;

      try {
         if (audioDataUrl) {
            const resB = await fetch(audioDataUrl);
            const blob = await resB.blob();

            // Sidebar placeholder
            const tempMeeting = {
               id: taskId,
               title: "Rekaman Baru...",
               date: new Date().toISOString(),
               status: "processing",
               stage: "Transcribing...",
               stage_raw: "init",
               is_temp: true
            };
            setMeetings(prev => [tempMeeting, ...prev]);
            setActiveMeeting(tempMeeting);

            const currentProgressSource = new EventSource(`${BACKEND_URL}/mom/transcribe/stream/${taskId}`);
            trackingTasks.current.add(taskId);

            currentProgressSource.onmessage = (e) => {
               const data = JSON.parse(e.data);
               setTranscribeProgress(data);
               
               // Use meeting_id from backend if provided
               const realId = data.meeting_id || taskId;

               if (data.status === "transcribing" && data.current != null && data.total != null) {
                  const percent = Math.round((data.current / (data.total || 1)) * 100);
                  const label = `Mentranskrip (${data.current}/${data.total})`;
                  
                  setMeetings(prev => prev.map(m => (m.id === taskId || m.id === realId) ? { ...m, id: realId, stage: label, stage_raw: "transcribing", transcribe_percent: percent } : m));
                  setActiveMeeting((prev: any) => (prev && (prev.id === taskId || prev.id === realId)) ? { ...prev, id: realId, stage: label, stage_raw: "transcribing", transcribe_percent: percent } : prev);
               } else if (data.message) {
                  setMeetings(prev => prev.map(m => (m.id === taskId || m.id === realId) ? { ...m, id: realId, stage: data.message, stage_raw: data.status || "transcribing" } : m));
                  setActiveMeeting((prev: any) => (prev && (prev.id === taskId || prev.id === realId)) ? { ...prev, id: realId, stage: data.message, stage_raw: data.status || "transcribing" } : prev);
               }
            };
            const fd = new FormData();
            fd.append("audio", blob, "meeting.webm");
            fd.append("language", defaultLanguage);
            fd.append("enable_diarization", "true");
            fd.append("task_id", taskId);
            const transcribeRes = await fetch(`${BACKEND_URL}/mom/transcribe`, { method: "POST", body: fd });
            currentProgressSource.close();
            trackingTasks.current.delete(taskId);
            setTranscribeProgress(null);
            if (transcribeRes.ok) {
               const tData = await transcribeRes.json();
               if (tData.duration_seconds) duration = tData.duration_seconds;
               if (tData.text && tData.text.trim().length > 2) finalTranscription = tData.text;
               else { alert("Transkripsi suara kosong, coba lagi."); setIsProcessing(false); setShowRecorder(false); return; }
            } else {
               const errData = await transcribeRes.json();
               alert(`Gagal mentranskrip: ${errData.detail || "Error Unknown"}`);
               setIsProcessing(false); setShowRecorder(false); return;
            }
         }
         setShowRecorder(false); setIsProcessing(false); setProcessingStage(""); setActiveTab("history");
         // Remove placeholder
         setMeetings(prev => prev.filter(m => m.id !== taskId));
         executeStream(finalTranscription, defaultLanguage, duration);
      } catch (err) { console.error("Error Processing:", err); alert("Terjadi kesalahan saat memproses MoM"); setIsProcessing(false); setProcessingStage(""); }
   };

   const handleUploadAudio = async (file: File, language: string) => {
      const taskId = `up-${Date.now()}`;
      setIsProcessing(true);
      setProcessingStage("transcribing");

      try {
         // Sidebar placeholder
         const tempMeeting = {
            id: taskId,
            title: file.name,
            date: new Date().toISOString(),
            status: "processing",
            stage: "Transcribing...",
            stage_raw: "init",
            is_temp: true
         };
         setMeetings(prev => [tempMeeting, ...prev]);
         setActiveTab("history"); // Pindah langsung biar kelihatan di sidebar
         setActiveMeeting(tempMeeting);

         const currentProgressSource = new EventSource(`${BACKEND_URL}/mom/transcribe/stream/${taskId}`);
         trackingTasks.current.add(taskId);

         currentProgressSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            setTranscribeProgress(data);
            
            // Use meeting_id from backend if provided
            const realId = data.meeting_id || taskId;

            if (data.status === "transcribing" && data.current != null && data.total != null) {
               const percent = Math.round((data.current / (data.total || 1)) * 100);
               const label = `Mentranskrip (${data.current}/${data.total})`;
               
               setMeetings(prev => prev.map(m => (m.id === taskId || m.id === realId) ? { ...m, id: realId, stage: label, stage_raw: "transcribing", transcribe_percent: percent } : m));
               setActiveMeeting((prev: any) => (prev && (prev.id === taskId || prev.id === realId)) ? { ...prev, id: realId, stage: label, stage_raw: "transcribing", transcribe_percent: percent } : prev);
            } else if (data.message) {
               setMeetings(prev => prev.map(m => (m.id === taskId || m.id === realId) ? { ...m, id: realId, stage: data.message, stage_raw: data.status || "transcribing" } : m));
               setActiveMeeting((prev: any) => (prev && (prev.id === taskId || prev.id === realId)) ? { ...prev, id: realId, stage: data.message, stage_raw: data.status || "transcribing" } : prev);
            }
         };

         const fd = new FormData();
         fd.append("audio", file);
         fd.append("language", language);
         fd.append("enable_diarization", "true");
         fd.append("task_id", taskId);
         const transcribeRes = await fetch(`${BACKEND_URL}/mom/transcribe`, { method: "POST", body: fd });
         currentProgressSource.close();
         trackingTasks.current.delete(taskId);
         setTranscribeProgress(null);
         if (!transcribeRes.ok) throw new Error("Gagal mentranskripsi audio upload");
         const tData = await transcribeRes.json();
         const finalTranscription = tData.text;
         const finalDuration = tData.duration_seconds || 0;
         if (!finalTranscription) throw new Error("Audio kosong atau gagal diterjemahkan");

         setIsProcessing(false);
         setProcessingStage("");
         // Hapus item sementara sebelum mulai stream real-id
         setMeetings(prev => prev.filter(m => m.id !== taskId));
         executeStream(finalTranscription, language, finalDuration);
      } catch (err: any) {
         alert(err.message || "Gagal mengupload audio");
         setIsProcessing(false);
         setProcessingStage("");
         setTranscribeProgress(null);
         setMeetings(prev => prev.filter(m => m.id !== taskId));
      }
   };

   const handleUploadTranscript = async (text: string, language: string, duration: number) => {
      try {
         setIsProcessing(false); setProcessingStage(""); setActiveTab("history"); executeStream(text, language, duration);
      } catch (err: any) { alert(err.message || "Gagal memproses transcript"); setIsProcessing(false); setProcessingStage(""); }
   };

   const executeStream = async (transcript: string, language: string, duration: number) => {
      if (!transcript || transcript.trim() === "") { setIsProcessing(false); setProcessingStage(""); return; }
      const payload = { transcript: String(transcript), language: language || "id", participants: [], duration_seconds: Math.floor(duration || 0) };
      try {
         const res = await fetch(`${BACKEND_URL}/mom/process/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
         if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.detail || "Gagal memulai processing di server"); }
         if (!res.body) throw new Error("Tidak ada stream response dari server");
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
                              stage_raw: data.stage,
                           };
                           if (idx !== -1) { const newMeetings = [...prev]; newMeetings[idx] = { ...newMeetings[idx], ...meetingData }; return newMeetings; }
                           else return [meetingData, ...prev];
                        });
                        setActiveMeeting((prev: any) => {
                           if (prev && prev.id === currentMeetingId) {
                              return { ...prev, status: data.stage === "done" ? "done" : (data.stage === "error" ? "error" : "processing"), stage: data.stage === "done" ? "Selesai" : (data.stage === "error" ? "Error" : getStageLabel(data.stage)), stage_raw: data.stage, mom_document: data.stage === "done" ? data.content : prev.mom_document, action_items: data.stage === "done" ? data.action_items : prev.action_items }
                           } else if (!prev || prev.is_temp) {
                              // If we are coming from a placeholder, transition to the real ID
                              return { id: currentMeetingId, status: "processing", stage: getStageLabel(data.stage), stage_raw: data.stage };
                           }
                           return prev;
                        });
                     }
                  } catch (e) { }
               }
            }
         }
      } catch (e: any) { console.error("Execute Stream Error:", e); }
   };

   const getStagePercent = (stage: string) => {
      const per: any = {
         "init": 5, "cleaning": 20, "cleaning_done": 30,
         "analyzing": 50, "analyzing_done": 70,
         "extracting": 80, "extracting_done": 85,
         "writing": 90, "formatting": 95,
         "finalizing": 98, "done": 100,
         "transcribing": 10
      };
      return per[stage] || 0;
   };

   const getStageLabel = (stage: string) => {
      const labels: any = { "init": "Persiapan...", "cleaning": "Membersihkan...", "cleaning_done": "Selesai Bersih", "analyzing": "Menganalisis...", "analyzing_done": "Analisis Selesai", "extracting": "Ekstraksi...", "extracting_done": "Selesai Ekstraksi", "writing": "Menulis Dokumen...", "formatting": "Memformat...", "finalizing": "Finalisasi...", "done": "Selesai" };
      return labels[stage] || "Memproses...";
   };

   const validateFileGlobal = (file: File) => {
      const allowedFormats = [
         "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/webm", "video/webm",
         "audio/aac", "audio/ogg", "audio/flac", "audio/x-flac", "audio/mp4",
         "text/plain"
      ];
      const allowedExtensions = [".mp3", ".wav", ".m4a", ".webm", ".txt", ".aac", ".ogg", ".flac", ".mp4"];
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      const isValid = allowedFormats.includes(file.type) || allowedExtensions.includes(extension);
      if (!isValid) {
         setGlobalError(`YoTa bingung nih sama file yang dikasih itu apa, YoTa hanya tau Audio (MP3, WAV, AAC, M4A, OGG, FLAC) atau TXT saja nih, coba hubungi 08992246000 untuk tanya lebih lanjut deh.`);
         return false;
      }
      return true;
   };

   const handleGlobalDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingGlobal(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
         const file = e.dataTransfer.files[0];
         if (validateFileGlobal(file)) {
            setPendingFile(file);
            setActiveMeeting(null);
            setActiveTab("upload");
            setGlobalError(null);
         }
      }
   };

   if (!mounted) return null;

   return (
      <div
         onDragOver={(e) => { e.preventDefault(); !isProcessing && setIsDraggingGlobal(true); }}
         className="flex h-screen bg-[var(--bg)] font-sans overflow-hidden text-[var(--text-main)] relative"
      >
         {/* Global Drop Overlay */}
         <AnimatePresence>
            {isDraggingGlobal && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onDragLeave={() => setIsDraggingGlobal(false)}
                  onDrop={handleGlobalDrop}
                  className="fixed inset-0 z-[100] bg-[var(--color-orange)]/90 backdrop-blur-md flex flex-col items-center justify-center p-10 text-white"
               >
                  <motion.div
                     initial={{ scale: 0.8 }}
                     animate={{ scale: 1.1 }}
                     className="w-32 h-32 rounded-[3.5rem] bg-white/20 flex items-center justify-center mb-8 ring-8 ring-white/10"
                  >
                     <UploadCloud size={64} strokeWidth={1.5} />
                  </motion.div>
                  <h2 className="text-4xl font-black mb-4">Lepaskan File ke Sini</h2>
                  <p className="text-xl font-serif opacity-80 max-w-lg text-center">
                     YoTa akan langsung menganalisis rekaman Anda menjadi Minutes of Meeting.
                  </p>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Sidebar Toggle Button */}
         {!isSidebarOpen && (
            <button
               onClick={() => setIsSidebarOpen(true)}
               className="absolute top-[1.35rem] left-5 z-40 p-2 rounded-xl bg-white border border-[var(--border-color)] shadow-sm text-[var(--text-dim)] hover:text-[var(--color-orange)] transition-all hover:scale-105 active:scale-95"
            >
               <PanelLeftOpen size={18} />
            </button>
         )}

         {/* ── Sidebar ── */}
         <AnimatePresence>
            {isSidebarOpen && (
               <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 288, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="h-full bg-[var(--bg-sidebar)] flex flex-col border-r border-[var(--border-color)] z-20 overflow-hidden relative"
               >
                  <button
                     onClick={() => setIsSidebarOpen(false)}
                     className="absolute top-5 right-4 z-30 p-1.5 rounded-lg hover:bg-[#E8E4D9] text-[var(--text-dim)] transition-colors"
                  >
                     <PanelLeftClose size={18} />
                  </button>

                  <div className="p-5 border-b border-[var(--border-color)]">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-orange)] flex items-center justify-center shadow-sm">
                           <Sparkle className="text-white" size={18} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight font-serif text-[var(--color-orange)]">YoTa</h1>
                     </div>
                     <button
                        onClick={() => { setActiveMeeting(null); setActiveTab("live"); setPendingFile(null); }}
                        className="w-full py-3 px-3 bg-white hover:bg-[#FDFBF7] border border-[var(--border-color)] rounded-xl flex items-center gap-3 transition card-hover"
                     >
                        <div className="bg-[var(--bg-sidebar)] p-1.5 rounded-lg">
                           <Plus size={16} className="text-[var(--color-orange)]" />
                        </div>
                        <span className="text-sm font-bold">Meeting Baru</span>
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3 space-y-1">
                     <div className="px-2 mb-3 mt-1 flex justify-between items-center">
                        <p className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-widest">Riwayat Rapat</p>
                        {loadingHistory && <Loader2 className="animate-spin text-[var(--text-dim)]" size={12} />}
                     </div>

                     {meetings.map((m) => (
                        <button
                           key={m.id}
                           onClick={() => handleSelectMeeting(m)}
                           className={cn("w-full text-left px-3 py-2.5 rounded-xl flex flex-col gap-1 transition group",
                              activeMeeting?.id === m.id ? "bg-[#E8E4D9] shadow-inner" : "hover:bg-[#E8E4D9]/40"
                           )}
                        >
                           <div className="flex items-center gap-3 w-full">
                              <div className={cn("p-1.5 rounded-lg transition", activeMeeting?.id === m.id ? "bg-white" : "bg-[var(--bg)] group-hover:bg-white")}>
                                 {m.status === 'processing' ? (
                                    <Loader2 size={14} className="text-[var(--color-orange)] animate-spin" />
                                 ) : (
                                    <FileText size={14} className={activeMeeting?.id === m.id ? "text-[var(--color-orange)]" : "text-[var(--text-dim)]"} />
                                 )}
                              </div>
                              <div className="flex-1 truncate">
                                 <p className={cn("text-sm font-semibold truncate", activeMeeting?.id === m.id ? "text-[var(--text-main)]" : "text-[var(--text-main)]/80")}>
                                    {m.title || "Untitled"}
                                 </p>
                                 <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
                                    {new Date(m.date + 'Z').toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                 </p>
                              </div>
                              {activeMeeting?.id === m.id && m.status !== 'processing' && (
                                 <ChevronRight size={14} className="text-[var(--text-dim)] opacity-50" />
                              )}
                           </div>

                           {m.status === 'processing' && (
                              <div className="w-full pl-9 pr-2 pb-1">
                                 <div className="flex justify-between items-center mb-1">
                                    <span className="text-[8px] font-black text-[var(--color-orange)] uppercase tracking-tighter">{m.stage || "Processing..."}</span>
                                 </div>
                                 <div className="w-full h-1 bg-white/50 rounded-full overflow-hidden">
                                    <motion.div
                                       initial={{ width: 0 }}
                                       animate={{ width: `${m.stage?.includes("Transcribing") ? (m.transcribe_percent || 1) : getStagePercent(m.stage_raw || 'init')}%` }}
                                       className="h-full bg-[var(--color-orange)]"
                                    />
                                 </div>
                              </div>
                           )}
                        </button>
                     ))}
                  </div>

                  <div className="p-4 border-t border-[var(--border-color)]">
                     <button
                        onClick={() => { setActiveMeeting(null); setActiveTab("settings"); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#E8E4D9]/50 rounded-xl transition group"
                     >
                        <div className="w-8 h-8 rounded-full bg-[#E8DCC8] flex items-center justify-center text-[var(--color-orange)] group-hover:bg-white group-hover:shadow-sm transition">
                           <User size={16} />
                        </div>
                        <p className="text-sm font-semibold">Pengaturan</p>
                     </button>
                  </div>
               </motion.aside>
            )}
         </AnimatePresence>

         {/* ── Main Area ── */}
         <main className="flex-1 flex flex-col relative h-full bg-[var(--bg)] overflow-hidden">
            {/* Global Error Notification */}
            <AnimatePresence>
               {globalError && (
                  <motion.div
                     initial={{ y: -50, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     exit={{ y: -50, opacity: 0 }}
                     className="absolute top-6 left-1/2 -translate-x-1/2 z-[80] w-full max-w-xl px-10"
                  >
                     <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl shadow-xl flex items-start gap-4">
                        <AlertCircle className="text-rose-500 mt-1 shrink-0" size={20} />
                        <p className="text-rose-900 text-sm font-bold leading-relaxed">{globalError}</p>
                        <button onClick={() => setGlobalError(null)} className="text-rose-400 hover:text-rose-700">
                           <X size={20} />
                        </button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            {!activeMeeting && activeTab !== "settings" ? (
               <div className="flex-1 flex flex-col items-center justify-start px-8 pt-12 pb-32 relative overflow-y-auto scrollbar-hide">
                  <AnimatePresence mode="wait">
                     {activeTab === "live" ? (
                        <motion.div
                           key="landing"
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, height: 0, scale: 0.95 }}
                           className="max-w-3xl w-full mx-auto flex flex-col items-center"
                        >
                           <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="w-20 h-20 rounded-[2.5rem] bg-[var(--color-orange)]/10 flex items-center justify-center mb-10 shadow-inner"
                           >
                              <Sparkle className="text-[var(--color-orange)]" size={40} strokeWidth={1.5} />
                           </motion.div>

                           <div className="text-center mb-12">
                              <h2 className="text-4xl md:text-5xl font-serif text-[var(--text-main)] mb-4 leading-tight">Rapat apa hari ini?</h2>
                              <p className="text-[var(--text-dim)] font-serif text-center text-lg max-w-lg mx-auto leading-tight">
                                 Pilih metode di bawah untuk mulai mengubah suara menjadi <span className="text-[var(--color-orange)] font-bold">Minutes of Meeting</span> yang rapi dan terorganisir.
                              </p>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                              <button
                                 onClick={() => setShowRecorder(true)}
                                 className="p-8 bg-white border border-[var(--border-color)] hover:border-[var(--color-orange-light)] rounded-[2rem] text-left transition-all card-hover group shadow-sm flex flex-col items-start gap-6"
                              >
                                 <div className="w-14 h-14 rounded-2xl bg-[var(--color-orange-light)]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Mic className="text-[var(--color-orange)]" size={32} />
                                 </div>
                                 <div>
                                    <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Rekam Sesi Langsung</h3>
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed">Mulai percakapan baru dan biarkan AI transkripsi secara langsung.</p>
                                 </div>
                              </button>

                              <button
                                 onClick={() => setActiveTab("upload")}
                                 className="p-8 bg-white border border-[var(--border-color)] hover:border-[var(--color-orange-light)] rounded-[2rem] text-left transition-all card-hover group shadow-sm flex flex-col items-start gap-6"
                              >
                                 <div className="w-14 h-14 rounded-2xl bg-[#E8DCC8]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileAudio className="text-[#8B7355]" size={32} />
                                 </div>
                                 <div>
                                    <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Unggah Rekaman</h3>
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed">Unggah file (MP3, WAV, AAC, M4A) untuk dianalisis oleh YoTa.</p>
                                 </div>
                              </button>
                           </div>
                        </motion.div>
                     ) : activeTab === "upload" ? (
                        <motion.div
                           key="upload-tab"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           className="w-full max-w-2xl mx-auto flex flex-col pt-4"
                        >
                           <button
                              onClick={() => { setActiveTab("live"); setPendingFile(null); }}
                              className="mb-6 flex items-center gap-2 text-xs font-black text-[var(--text-dim)] hover:text-[var(--color-orange)] transition-colors w-fit px-4 py-2 bg-white rounded-full border border-[var(--border-color)] shadow-sm"
                           >
                              <ChevronLeft size={14} /> Kembali ke Beranda
                           </button>

                           <div className="bg-white rounded-[2.5rem] p-4 border border-[var(--border-color)] shadow-xl overflow-hidden relative">
                              <UploadTab
                                 isProcessing={isProcessing}
                                 onTranscribeAudio={handleUploadAudio}
                                 onProcessTranscript={handleUploadTranscript}
                                 transcribeProgress={transcribeProgress}
                                 initialFile={pendingFile}
                              />
                           </div>
                        </motion.div>
                     ) : null}
                  </AnimatePresence>

                  <div className="flex gap-4 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mt-20 opacity-30">
                     <span>Whisper v3 powered</span>
                     <span>•</span>
                     <span>Intelligent AI Analysis</span>
                     <span>•</span>
                     <span>YoTa v1.1</span>
                  </div>
               </div>
            ) : activeMeeting ? (
               <div className="flex-1 w-full h-full relative overflow-hidden bg-white shadow-sm border-t border-l border-[var(--border-color)]">
                  {activeMeeting.status === "processing" ? (
                     <div className="flex-1 flex flex-col items-center justify-center h-full p-12 bg-[#F9F8F4]">
                        <div className="max-w-md w-full text-center">
                           <div className="relative w-48 h-48 mx-auto mb-10">
                              <motion.div
                                 animate={{ rotate: 360 }}
                                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                 className="absolute inset-0 rounded-full border-4 border-dashed border-[var(--color-orange)]/20"
                              />
                              <div className="absolute inset-4 rounded-full bg-white shadow-xl flex flex-col items-center justify-center">
                                 <span className="text-[10px] font-black text-[var(--color-orange)] uppercase tracking-widest animate-pulse">Di Analisa</span>
                              </div>
                           </div>

                           <h2 className="text-2xl font-serif text-[var(--text-main)] mb-3">YoTa sedang bekerja...</h2>
                           <p className="text-[var(--text-dim)] text-sm mb-8 leading-relaxed px-6">
                              Kami sedang merangkum transkrip Anda menjadi dokumen Minutes of Meeting yang terstruktur. Anda bisa meninggalkan halaman ini.
                           </p>

                           <div className="bg-white border border-[var(--border-color)] rounded-3xl p-6 shadow-sm">
                              <div className="flex justify-between items-center mb-3">
                                 <span className="text-sm font-serif font-bold text-[var(--text-main)]">{activeMeeting.stage || "Memproses..."}</span>
                              </div>
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-6">
                                 {(() => {
                                    const isTranscribing = activeMeeting.stage_raw === "transcribing" || activeMeeting.stage?.includes("transkrip") || activeMeeting.stage?.includes("Transkrip");
                                    const overallProgress = isTranscribing
                                       ? Math.max(5, activeMeeting.transcribe_percent || 0)
                                       : getStagePercent(activeMeeting.stage_raw || 'init');
                                    return (
                                       <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${overallProgress}%` }}
                                          className="h-full bg-[var(--color-orange)]"
                                          transition={{ duration: 0.5 }}
                                       />
                                    );
                                 })()}
                              </div>
                              
                              <div className="flex justify-center">
                                 <button 
                                    onClick={() => setShowCancelConfirm(true)}
                                    className="px-6 py-2 border border-red-200 text-red-600 rounded-full hover:bg-red-50 transition-colors text-sm font-medium flex items-center gap-2"
                                 >
                                    <X size={16} />
                                    Batalkan Proses
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <MomViewer
                        key={activeMeeting?.id}
                        meeting={activeMeeting}
                        onClose={() => setActiveMeeting(null)}
                        onExport={handleExport}
                        isSidebarOpen={isSidebarOpen}
                     />
                  )}
               </div>
            ) : activeTab === "settings" ? (
               <div className="flex-1 overflow-y-auto px-8 pt-12 pb-20 scrollbar-hide">
                  <div className="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-xl border border-[var(--border-color)] p-10">
                     <SettingsTab
                        defaultLanguage={defaultLanguage}
                        onChangeLanguage={handleChangeLanguage}
                     />
                  </div>
               </div>
            ) : null}
         </main>

         {/* ── Modals ── */}
         <MeetingRecorder
            isOpen={showRecorder}
            onClose={() => setShowRecorder(false)}
            onConfirm={handleRecordingConfirm}
            isProcessing={isProcessing}
            currentStage={processingStage}
         />

         <ConfirmModal
            isOpen={showCancelConfirm}
            title="Batalkan Proses?"
            message="Proses yang sedang berjalan akan dihentikan dan data tidak akan disimpan. Lanjutkan?"
            confirmText="Ya, Batalkan"
            cancelText="Kembali"
            onConfirm={handleCancelTask}
            onCancel={() => setShowCancelConfirm(false)}
            isDestructive={true}
         />

         <ConfirmModal
            isOpen={!!deleteId}
            title="Hapus Rapat?"
            message="Dokumen ini akan dihapus permanen. Lanjutkan?"
            confirmText="Ya, Hapus"
            cancelText="Batal"
            onConfirm={confirmDelete}
            onCancel={() => setDeleteId(null)}
         />
      </div>
   );
}
