"use client";

import { useEffect, useRef, useState } from "react";
import { useMeetingStore } from "../stores/meetingStore";

type WaveMode = "idle" | "talking" | "active";

interface SiriWaveformProps {
  className?: string;
}

export default function SiriWaveform({ className = "" }: SiriWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const tRef = useRef(0);
  const currentAmpRef = useRef(0.06);
  const targetAmpRef = useRef(0.06);

  const { isListening, setVolumes } = useMeetingStore();
  const [mode, setMode] = useState<WaveMode>("idle");
  const [micDenied, setMicDenied] = useState(false);

  // start/stop mic based on isListening
  useEffect(() => {
    if (isListening) {
      startMic();
    } else {
      stopMic();
      setMode("idle");
      targetAmpRef.current = 0.08;
    }
    return () => stopMic();
  }, [isListening]);

  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setMicDenied(false);
    } catch {
      setMicDenied(true);
      setMode("idle");
    }
  }

  function stopMic() {
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    sourceRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
  }

  // draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function getAmplitudeFromMic(): number {
      const analyser = analyserRef.current;
      if (!analyser) return 0;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / data.length);
    }

    function drawLayer(
      phase: number,
      amp: number,
      freq: number,
      color: string,
      alpha: number,
      lineWidth: number = 2.5,
      offset: number = 0
    ) {
      if (!canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      const cy = H / 2 + offset;

      ctx.beginPath();
      for (let x = 0; x <= W; x += 1.5) {
        const nx = x / W;
        
        // Super complex wave formula untuk efek yang gila!
        const y =
          cy +
          // Primary wave
          Math.sin(nx * Math.PI * 2 * freq + phase) * amp * cy +
          // Secondary harmonics
          Math.sin(nx * Math.PI * 2 * freq * 2.1 + phase * 1.7) * amp * cy * 0.3 +
          Math.sin(nx * Math.PI * 2 * freq * 0.6 + phase * 2.3) * amp * cy * 0.4 +
          // Tertiary harmonics
          Math.sin(nx * Math.PI * 2 * freq * 3.7 + phase * 0.9) * amp * cy * 0.15 +
          Math.sin(nx * Math.PI * 2 * freq * 1.3 + phase * 3.1) * amp * cy * 0.2 +
          // Noise/chaos factor
          Math.sin(nx * Math.PI * 13 + phase * 5.7) * amp * cy * 0.05 +
          Math.cos(nx * Math.PI * 7 + phase * 2.1) * amp * cy * 0.08;
          
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lineWidth * window.devicePixelRatio;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Epic color palette - lebih banyak variasi!
    const COLORS = [
      "rgba(255, 255, 255, 0.9)",   // putih utama - paling depan
      "rgba(255, 220, 150, 0.8)",   // kuning muda
      "rgba(255, 180, 100, 0.75)",  // oranye cerah
      "rgba(255, 140, 60, 0.65)",   // oranye standar
      "rgba(230, 110, 40, 0.55)",   // oranye gelap
      "rgba(200, 80, 30, 0.45)",    // oranye tua
      "rgba(180, 60, 25, 0.35)",   // merah-oranye
      "rgba(255, 200, 200, 0.25)", // pink muda
      "rgba(200, 200, 255, 0.2)",  // biru muda
    ];

    function loop() {
      animFrameRef.current = requestAnimationFrame(loop);
      tRef.current += 0.04; // 2X LEBIH CEPAT! Super energik!

      if (analyserRef.current) {
        const rms = getAmplitudeFromMic();
        // Range lebih dinamis untuk respons yang lebih gila
        targetAmpRef.current = 0.08 + rms * 2.2;
        if (targetAmpRef.current > 0.65) targetAmpRef.current = 0.65;
      }

      // Lebih agresif lerp untuk respons yang lebih cepat
      currentAmpRef.current += (targetAmpRef.current - currentAmpRef.current) * 0.12;

      const W = canvas!.width;
      const H = canvas!.height;
      ctx.clearRect(0, 0, W, H);

      const a = currentAmpRef.current;
      const t = tRef.current;

      // EPIC MULTI-LAYER WAVEFORM - 9 LAYER SUPER RAMAI!
      
      // Layer 1-3: High frequency, thin lines - detail atas (FASTEST!)
      drawLayer(t * 3.5,           a * 0.12, 12.0, COLORS[8], 0.6, 1.0, -15);
      drawLayer(t * 2.9 + 0.8,       a * 0.15, 10.5, COLORS[7], 0.65, 1.2, -10);
      drawLayer(t * 4.1 - 0.5,       a * 0.10, 13.2, COLORS[6], 0.55, 0.8, -5);
      
      // Layer 4-6: Mid frequency, medium lines - body utama (FAST)
      drawLayer(t * 2.1,             a * 0.35, 7.5,  COLORS[0], 0.9, 2.8, 0);
      drawLayer(t * 1.8 + 1.5,       a * 0.28, 8.8,  COLORS[1], 0.8, 2.2, 3);
      drawLayer(t * 2.4 - 1.0,       a * 0.22, 6.2,  COLORS[2], 0.7, 2.0, -3);
      
      // Layer 7-9: Low frequency, thick lines - foundation (MEDIUM)
      drawLayer(t * 1.2 + 2.8,       a * 0.45, 4.8,  COLORS[3], 0.6, 3.5, 8);
      drawLayer(t * 0.9 - 1.8,       a * 0.38, 5.5,  COLORS[4], 0.5, 3.0, 12);
      drawLayer(t * 1.4 + 4.0,       a * 0.32, 4.2,  COLORS[5], 0.4, 2.5, -8);
      
      // BONUS: Noise layer untuk efek yang lebih chaotic (SUPER FAST!)
      if (a > 0.15) {
        drawLayer(t * 8.0,           a * 0.05, 20.0, "rgba(255, 255, 255, 0.3)", 0.4, 0.5, 0);
      }
    }

    loop();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "200px", // Lebih tinggi untuk gelombang yang lebih ramai!
        borderRadius: "16px",
        overflow: "hidden",
        background: "transparent",
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {micDenied && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            color: "var(--color-text-secondary)",
          }}
        >
          Akses mikrofon ditolak
        </div>
      )}
    </div>
  );
}