"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Check, Loader2, StopCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "./Common";

export default function MeetingRecorder({ isOpen, onClose, onConfirm, isProcessing, currentStage }: any) {
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [volumes, setVolumes] = useState(new Array(25).fill(5));
  const [duration, setDuration] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup Visualizer
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 64;
      startVisualizerAnimation();

      // Setup Recorder
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
         if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.start(200);

      // Start Listening (SpeechRecognition for live preview)
      startListening();
      
      // Start Timer
      setDuration(0);
      timerRef.current = setInterval(() => {
         setDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      console.error("Session start error:", err);
      alert("Microphone tidak dapat diakses.");
      onClose();
    }
  };

  const startVisualizerAnimation = () => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const raw = [];
      const step = Math.floor(dataArray.length / 25);
      for (let i = 0; i < 25; i++) {
        let sum = 0;
        const start = i * step;
        for (let j = 0; j < step; j++) sum += dataArray[start + j];
        raw.push(Math.max(5, (sum / step / 255) * 65));
      }

      const mid = new Array(25);
      let l = 12, r = 13;
      for (let i = 0; i < 25; i++) {
         if (i % 2 === 0) {
            if (l >= 0) mid[l--] = raw[i];
         } else {
            if (r < 25) mid[r++] = raw[i];
         }
      }

      setVolumes(mid);
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };

  useEffect(() => {
    if (isOpen) {
      setTranscript("");
      setFinalTranscript("");
      setIsConfirming(false);
      startSession();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [isOpen]);

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = "id-ID";
    recognitionRef.current.interimResults = true;
    recognitionRef.current.continuous = true;

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      if (final) {
         setFinalTranscript(prev => prev + final);
      }
      setTranscript(interim);
    };

    recognitionRef.current.onend = () => {
       // Auto-restart jika terputus secara tidak sengaja (browser limitation)
       if (isOpen && !isConfirming && !isProcessing) {
          try { recognitionRef.current.start(); } catch(e) {}
       } else {
          setIsListening(false);
       }
    };
    try { recognitionRef.current.start(); } catch(e) {}
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
       mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  };

  const [isConfirming, setIsConfirming] = useState(false);

  const handleStopAndProcess = async () => {
    if (isConfirming || isProcessing) return;
    setIsConfirming(true);

    const fullText = (finalTranscript + " " + transcript).trim();

    // Stop segalanya
    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      const stopPromise = new Promise<string | null>((resolve) => {
        if (!mediaRecorderRef.current) return resolve(null);
        mediaRecorderRef.current.onstop = () => {
          if (audioChunksRef.current.length === 0) return resolve(null);
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        };
        mediaRecorderRef.current.stop();
      });

      const audioData = await stopPromise;
      onConfirm(fullText, audioData, duration);
    } else {
      onConfirm(fullText, null, duration);
    }
    
    // Cleanup stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  };

  const formatTime = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentText = (finalTranscript + " " + transcript).trim();

  // Scroll to bottom effect for transcript
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
     if (transcriptScrollRef.current) {
        transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
     }
  }, [currentText]);

  const mapStageToLabel = (stage: string) => {
     switch(stage) {
        case 'cleaning': return '🧹 Membersihkan Transcript...';
        case 'analyzing': return '🔍 Menganalisis Meeting...';
        case 'extracting': return '✅ Mengekstrak Action Items...';
        case 'writing': return '✍️ Menulis Dokumen MoM...';
        case 'saved': return '💾 Menyimpan Hasil...';
        default: return 'Memproses AI...';
     }
  };

   const handleCancel = () => {
      if (isProcessing) return;
      stopListening();
      onClose();
   };

   return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           key="live-recorder-modal"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[120] flex flex-col bg-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-[var(--border-color)]/50 pt-10">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100/50">
                   <Mic size={20} className={cn(isListening && "animate-pulse")} />
                </div>
                <div>
                   <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">Live Meeting</h2>
                   <p className="text-[10px] font-black text-[#8A8886] uppercase tracking-widest leading-none mt-0.5">Recording in progress</p>
                </div>
             </div>

             <div className="flex items-center gap-3">
                <div className="bg-[#FEF2F2] px-5 py-2.5 rounded-2xl flex items-center gap-2.5 border border-red-100 shadow-sm">
                   <div className={cn("w-2 h-2 rounded-full", isListening ? "bg-red-500 animate-pulse" : "bg-gray-300")} />
                   <span className="text-red-500 font-black text-base tabular-nums tracking-widest">{formatTime(duration)}</span>
                </div>
                
                <button 
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="p-3 rounded-2xl bg-[var(--bg)] hover:bg-[var(--border-color)] transition disabled:opacity-50 border border-[var(--border-color)]"
                >
                   <X size={20} className="text-[var(--text-main)]" />
                </button>
             </div>
          </div>
          
          <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6 overflow-hidden">
             {/* Visualizer Area */}
             <div className="w-full bg-[var(--bg)] rounded-[2.5rem] border border-[var(--border-color)] p-8 flex items-center justify-center gap-2 shadow-inner h-32">
               {volumes.map((vol, i) => (
                 <motion.div
                   key={`bar-${i}`}
                   animate={{ 
                     height: isProcessing ? [10, 30, 10] : (isListening ? vol : 5),
                     opacity: isProcessing ? 0.3 : (isListening ? 1 : 0.3)
                   }}
                   transition={isProcessing ? { repeat: Infinity, duration: 1.5, delay: i * 0.08 } : { duration: 0.1 }}
                   className="w-2 bg-[var(--color-orange)] rounded-full shadow-sm"
                 />
               ))}
             </div>

             {/* Transcript Scroll Area */}
             <div 
                ref={transcriptScrollRef}
                className="flex-1 w-full bg-white rounded-[2.5rem] border border-[var(--border-color)] p-10 flex flex-col relative overflow-hidden shadow-sm shadow-indigo-100/10"
             >
                {!currentText && !isProcessing && (
                   <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-16 h-16 rounded-full bg-[var(--bg)] flex items-center justify-center text-[#8A8886]/30">
                         <Mic size={32} />
                      </div>
                      <p className="text-center italic text-[#8A8886]/60 font-black uppercase tracking-widest text-[10px]">Silakan mulai berbicara...</p>
                   </div>
                )}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {finalTranscript && (
                     <p className="text-lg font-bold leading-relaxed text-[var(--text-main)]/80 mb-4 antialiased whitespace-pre-wrap">{finalTranscript}</p>
                  )}
                  {transcript && (
                     <p className="text-lg font-bold leading-relaxed text-[var(--color-orange)] antialiased animate-pulse">{transcript}</p>
                  )}
                </div>

                {/* Processing Overlay inside Transcript block */}
                <AnimatePresence>
                   {isProcessing && (
                      <motion.div 
                         initial={{ opacity: 0 }} 
                         animate={{ opacity: 1 }} 
                         className="absolute inset-0 bg-white/90 backdrop-blur-[6px] flex flex-col items-center justify-center z-10 p-10"
                      >
                         <div className="w-16 h-16 rounded-full bg-[var(--color-orange)]/10 flex items-center justify-center mb-6">
                            <Loader2 size={32} className="text-[var(--color-orange)] animate-spin" />
                         </div>
                         <h3 className="font-black text-2xl text-[var(--text-main)] text-center max-w-sm tracking-tight">{mapStageToLabel(currentStage)}</h3>
                         <p className="text-xs font-black text-[#8A8886] uppercase tracking-widest mt-4 bg-[var(--bg)] px-4 py-1.5 rounded-full border border-[var(--border-color)]">Durasi Rekaman: {formatTime(duration)}</p>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
          </div>

          {/* Actions Footer */}
          <div className="p-6 border-t border-[var(--border-color)]/50 bg-white">
             <div className="max-w-4xl mx-auto w-full">
                {!isProcessing ? (
                   <button 
                      onClick={handleStopAndProcess}
                      disabled={isConfirming || (!currentText && duration < 3)}
                      className="w-full h-16 rounded-2xl bg-[var(--color-orange)] hover:bg-[#C86646] text-white font-black tracking-tight active:scale-[0.98] transition-all shadow-xl shadow-[var(--color-orange)]/30 flex items-center justify-center gap-3 disabled:opacity-50 text-lg"
                   >
                      {isConfirming ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} strokeWidth={3} />}
                      {isConfirming ? "Menyiapkan File..." : "Akhiri & Simpan MoM"}
                   </button>
                ) : (
                   <div className="w-full h-16 rounded-2xl bg-[var(--bg)] border border-[var(--border-color)] text-[#8A8886] font-black tracking-widest uppercase text-xs flex items-center justify-center gap-2 italic">
                      Sedang Diproses oleh AI Assistant...
                   </div>
                )}
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
