"""
MoM - Speaker Diarization Service
Strategi: NeMo (GPU) → SpeechBrain (CPU fallback) → Whisper-only graceful degradation
NO HuggingFace dependencies.
"""

import os
import tempfile
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class DiarizationService:
    """
    Speaker diarization dengan dual-engine strategy:
    1. NVIDIA NeMo (titanet_large) — optimal dengan CUDA GPU
    2. SpeechBrain (ECAPA-TDNN) — CPU-friendly fallback
    3. Whisper-only fallback — jika keduanya tidak tersedia
    """

    def __init__(self):
        self.engine = self._detect_engine()
        logger.info(f"[Diarization] Engine aktif: {self.engine.upper()}")

    def _detect_engine(self) -> str:
        """Auto-detect engine terbaik yang tersedia."""
        # Option A: NeMo (preferred, GPU)
        try:
            import nemo.collections.asr as nemo_asr  # noqa
            logger.info("[Diarization] NVIDIA NeMo tersedia → engine: nemo")
            return "nemo"
        except ImportError:
            logger.info("[Diarization] NeMo tidak tersedia, coba SpeechBrain...")

        # Option B: SpeechBrain (CPU fallback)
        try:
            import speechbrain  # noqa
            logger.info("[Diarization] SpeechBrain tersedia → engine: speechbrain")
            return "speechbrain"
        except ImportError:
            logger.warning("[Diarization] SpeechBrain tidak tersedia, fallback ke whisper-only")

        return "whisper_only"

    async def diarize(self, audio_path: str) -> list[dict]:
        """
        Jalankan diarization pada file audio.
        Returns list of segments: [{start, end, speaker, text?}]
        """
        if self.engine == "nemo":
            return await self._diarize_nemo(audio_path)
        elif self.engine == "speechbrain":
            return await self._diarize_speechbrain(audio_path)
        else:
            return []  # Whisper-only: no diarization segments

    async def _diarize_nemo(self, audio_path: str) -> list[dict]:
        """Speaker diarization menggunakan NVIDIA NeMo TitaNet."""
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._nemo_sync, audio_path)
        except Exception as e:
            logger.error(f"[NeMo] Error: {e}")
            return await self._diarize_speechbrain(audio_path)

    def _nemo_sync(self, audio_path: str) -> list[dict]:
        """Synchronous NeMo diarization (dijalankan di thread executor)."""
        try:
            from nemo.collections.asr.models import NeuralDiarizer
            import omegaconf
            import torch

            # NeMo diarization config
            model_path = os.getenv("NEMO_DIARIZER_MODEL", "diar_msdd_telephonic")
            device = "cuda" if torch.cuda.is_available() else "cpu"

            cfg = omegaconf.OmegaConf.structured({
                "diarizer": {
                    "manifest_filepath": "",
                    "out_dir": tempfile.mkdtemp(),
                    "device": device,
                    "speaker_embeddings": {
                        "model_path": os.getenv("NEMO_TITANET_MODEL", "titanet_large"),
                        "parameters": {
                            "window_length_in_sec": [1.5, 1.25, 1.0, 0.75],
                            "shift_length_in_sec": [0.75, 0.625, 0.5, 0.375],
                            "multiscale_weights": [1, 1, 1, 1],
                        }
                    },
                    "oracle_vad": False,
                    "clustering": {
                        "parameters": {
                            "oracle_num_speakers": False,
                            "max_num_speakers": 8,
                        }
                    },
                    "msdd_model": {
                        "model_path": model_path,
                        "parameters": {"sigmoid_threshold": [0.7, 0.75]},
                    },
                    "vad": {
                        "model_path": "vad_multilingual_marblenet",
                        "parameters": {
                            "window_length_in_sec": 0.15,
                            "shift_length_in_sec": 0.01,
                            "smoothing": "median",
                            "overlap": 0.875,
                        }
                    }
                }
            })

            # Create manifest
            manifest_dir = tempfile.mkdtemp()
            manifest_path = os.path.join(manifest_dir, "manifest.json")
            with open(manifest_path, "w") as f:
                json.dump({"audio_filepath": audio_path, "offset": 0, "duration": None, "label": "infer", "text": "-"}, f)
                f.write("\n")

            cfg.diarizer.manifest_filepath = manifest_path

            diarizer = NeuralDiarizer(cfg=cfg)
            diarizer.diarize()

            # Parse RTTM output
            rttm_dir = Path(cfg.diarizer.out_dir)
            rttm_files = list(rttm_dir.rglob("*.rttm"))
            if not rttm_files:
                return []

            segments = []
            with open(rttm_files[0]) as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 8 and parts[0] == "SPEAKER":
                        start = float(parts[3])
                        duration = float(parts[4])
                        speaker = parts[7]
                        segments.append({
                            "start": round(start, 2),
                            "end": round(start + duration, 2),
                            "speaker": speaker
                        })

            return sorted(segments, key=lambda x: x["start"])

        except Exception as e:
            logger.error(f"[NeMo Sync] Error: {e}")
            return []

    async def _diarize_speechbrain(self, audio_path: str) -> list[dict]:
        """Speaker diarization menggunakan SpeechBrain (CPU-friendly)."""
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._speechbrain_sync, audio_path)
        except Exception as e:
            logger.error(f"[SpeechBrain] Error: {e}")
            return []

    def _speechbrain_sync(self, audio_path: str) -> list[dict]:
        """Synchronous SpeechBrain diarization."""
        try:
            import torch
            import torchaudio
            from speechbrain.inference.speaker import EncoderClassifier
            from sklearn.cluster import AgglomerativeClustering
            import numpy as np

            # Load speaker encoder dari SpeechBrain Hub (NON-HuggingFace)
            classifier = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                savedir=os.path.join(os.path.expanduser("~"), ".cache", "speechbrain"),
                run_opts={"device": "cpu"}
            )

            # Load audio
            waveform, sr = torchaudio.load(audio_path)
            if sr != 16000:
                resampler = torchaudio.transforms.Resample(sr, 16000)
                waveform = resampler(waveform)
            if waveform.shape[0] > 1:
                waveform = waveform.mean(dim=0, keepdim=True)

            # Segment audio into 2-second windows
            window_size = 32000  # 2 seconds at 16kHz
            hop_size = 16000     # 1 second hop
            total_samples = waveform.shape[1]

            embeddings = []
            timestamps = []

            for start in range(0, total_samples - window_size, hop_size):
                end = start + window_size
                segment = waveform[:, start:end]
                with torch.no_grad():
                    embedding = classifier.encode_batch(segment)
                embeddings.append(embedding.squeeze().numpy())
                timestamps.append((start / 16000, end / 16000))

            if not embeddings:
                return []

            # Cluster speakers
            embeddings_array = np.array(embeddings)
            n_speakers = min(8, max(2, len(embeddings) // 10))

            clustering = AgglomerativeClustering(n_clusters=n_speakers, linkage="ward")
            labels = clustering.fit_predict(embeddings_array)

            # Convert to segments (merge consecutive same-speaker segments)
            segments = []
            for i, (ts, label) in enumerate(zip(timestamps, labels)):
                speaker = f"SPEAKER_{label:02d}"
                if segments and segments[-1]["speaker"] == speaker:
                    segments[-1]["end"] = round(ts[1], 2)
                else:
                    segments.append({
                        "start": round(ts[0], 2),
                        "end": round(ts[1], 2),
                        "speaker": speaker
                    })

            return segments

        except Exception as e:
            if "WinError 1314" in str(e):
                logger.warning("[SpeechBrain] Permission error for symlinks (WinError 1314). Fallback to whisper-only.")
            else:
                logger.error(f"[SpeechBrain Sync] Error: {e}")
            return []

    def merge_transcript_with_diarization(
        self, transcript_segments: list[dict], diarization_segments: list[dict]
    ) -> list[dict]:
        """
        Gabungkan Whisper transcript segments dengan diarization speaker labels.
        Setiap kalimat Whisper akan di-assign ke speaker dari diarization.

        Args:
            transcript_segments: List dari Whisper dengan {start, end, text}
            diarization_segments: List dari diarizer dengan {start, end, speaker}

        Returns:
            List {start, end, speaker, text}
        """
        if not diarization_segments:
            # Fallback: semua satu speaker
            return [
                {**seg, "speaker": "SPEAKER_00"}
                for seg in transcript_segments
            ]

        merged = []
        for t_seg in transcript_segments:
            t_mid = (t_seg["start"] + t_seg["end"]) / 2

            # Cari diarization segment yang overlap dengan midpoint kalimat
            best_speaker = "SPEAKER_00"
            for d_seg in diarization_segments:
                if d_seg["start"] <= t_mid <= d_seg["end"]:
                    best_speaker = d_seg["speaker"]
                    break

            merged.append({
                "start": t_seg.get("start", 0),
                "end": t_seg.get("end", 0),
                "speaker": best_speaker,
                "text": t_seg.get("text", "").strip()
            })

        return merged


# Singleton
diarization_service = DiarizationService()
