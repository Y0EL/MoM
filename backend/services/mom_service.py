"""
MoM - CrewAI Multi-Agent Service
Pipeline 4 agent untuk memproses transcript menjadi Minutes of Meeting terstruktur.

Agents:
  Agent 1: Transcript Cleaner     — Bersihkan transcript, assign speaker labels
  Agent 2: Meeting Analyst        — Identifikasi topik, agenda, keputusan
  Agent 3: Action Item Extractor  — Ekstrak tasks, PIC, deadline (JSON output)
  Agent 4: MoM Writer             — Tulis dokumen MoM final yang formal
"""

import os
import json
import logging
import asyncio
from typing import AsyncGenerator, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


PROMPTS = {
    "id": {
        "cleaner_role": "Senior Editor Notulensi Profesional",
        "cleaner_goal": "Membersihkan dan merapikan raw transcript rapat menjadi teks yang bersih dan terstruktur",
        "cleaner_backstory": (
            "Kamu adalah editor notulensi berpengalaman 15 tahun yang terbiasa bekerja "
            "dengan transcript audio dari berbagai jenis rapat korporat. Kamu ahli dalam "
            "mengidentifikasi siapa yang berbicara, memperbaiki ejaan, dan menghilangkan "
            "kata-kata filler seperti 'eh', 'um', 'anu', 'gitu'."
        ),
        "analyst_role": "Analis Rapat Senior",
        "analyst_goal": "Menganalisis isi rapat secara mendalam dan mengidentifikasi poin-poin kritis",
        "analyst_backstory": (
            "Kamu adalah konsultan manajemen senior yang spesialis dalam meeting effectiveness. "
            "Kamu bisa mengidentifikasi agenda tersembunyi, keputusan tersirat, konflik "
            "yang perlu diperhatikan, dan peluang yang muncul dalam diskusi rapat."
        ),
        "extractor_role": "Project Manager & Spesialis Action Items",
        "extractor_goal": "Mengekstrak semua action items dari transcript dengan PIC dan deadline yang akurat",
        "extractor_backstory": (
            "Kamu adalah project manager berpengalaman yang terbiasa memimpin rapat dan "
            "memastikan setiap keputusan berujung pada tindakan nyata. Kamu sangat teliti "
            "dalam mengidentifikasi siapa bertanggung jawab atas apa dan kapan harus selesai."
        ),
        "writer_role": "Technical Writer & Dokumentasi Korporat",
        "writer_goal": "Menulis Minutes of Meeting yang formal, lengkap, dan profesional",
        "writer_backstory": (
            "Kamu adalah technical writer korporat kelas dunia yang telah menulis ribuan "
            "dokumen MoM untuk perusahaan Fortune 500. Dokumen yang kamu hasilkan selalu "
            "jelas, terstruktur, dan bisa langsung digunakan sebagai referensi resmi."
        ),
    },
    "en": {
        "cleaner_role": "Senior Professional Meeting Transcript Editor",
        "cleaner_goal": "Clean and structure raw meeting transcripts into polished, readable text",
        "cleaner_backstory": (
            "You are an experienced transcript editor with 15 years working with corporate "
            "meeting audio transcripts. You excel at identifying speakers, fixing spelling, "
            "and removing filler words like 'uh', 'um', 'you know', 'like'."
        ),
        "analyst_role": "Senior Meeting Intelligence Analyst",
        "analyst_goal": "Deeply analyze meeting content and identify critical discussion points",
        "analyst_backstory": (
            "You are a senior management consultant specializing in meeting effectiveness. "
            "You can identify hidden agendas, implied decisions, conflicts that need attention, "
            "and emerging opportunities from meeting discussions."
        ),
        "extractor_role": "Project Manager & Action Items Specialist",
        "extractor_goal": "Extract all action items with accurate owners and deadlines",
        "extractor_backstory": (
            "You are an experienced project manager who ensures every decision results in "
            "tangible actions. You're meticulous about identifying who's responsible for "
            "what and when it needs to be completed."
        ),
        "writer_role": "Corporate Technical Writer",
        "writer_goal": "Write a formal, comprehensive, and professional Minutes of Meeting document",
        "writer_backstory": (
            "You are a world-class corporate technical writer who has written thousands of "
            "MoM documents for Fortune 500 companies. Your documents are always clear, "
            "structured, and ready to use as official references."
        ),
    }
}


class MomService:
    """
    CrewAI-powered MoM processing service.
    Menggunakan 4 AI agents secara sekuensial untuk menghasilkan MoM berkualitas tinggi.
    """

    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MOM_MODEL", os.getenv("OPENAI_MODEL", "gpt-4.1-nano"))

    def _get_prompts(self, language: str) -> dict:
        return PROMPTS.get(language, PROMPTS["id"])

    async def process_transcript_stream(
        self,
        transcript: str,
        language: str = "id",
        participants: Optional[list] = None,
        meeting_title: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream processing transcript menjadi MoM.
        Yields JSON strings untuk setiap tahap progress.
        Format: {"stage": "cleaning|analyzing|extracting|writing|done", "content": "..."}
        """
        try:
            from crewai import Agent, Task, Crew, Process
            from crewai import LLM
        except ImportError:
            yield json.dumps({"stage": "error", "content": "CrewAI tidak terinstall. Jalankan: pip install crewai"})
            return

        prompts = self._get_prompts(language)
        participants_str = ", ".join(participants) if participants else "Tidak disebutkan"
        lang_instruction = "dalam Bahasa Indonesia formal" if language == "id" else "in formal English"

        try:
            llm = LLM(
                model=f"openai/{self.model}",
                api_key=self.openai_api_key,
                temperature=0.3,
            )

            # ── AGENT 1: Transcript Cleaner ───────────────────────
            yield json.dumps({"stage": "cleaning", "content": "🧹 Membersihkan transcript..."})
            await asyncio.sleep(0.1)

            cleaner_agent = Agent(
                role=prompts["cleaner_role"],
                goal=prompts["cleaner_goal"],
                backstory=prompts["cleaner_backstory"],
                llm=llm,
                verbose=False,
                allow_delegation=False,
            )

            clean_task_desc = f"""
            Bersihkan transcript rapat berikut {lang_instruction}:
            
            Peserta diketahui: {participants_str}
            
            RAW TRANSCRIPT:
            {transcript}
            
            INSTRUKSI:
            1. Identifikasi pembicara — jika nama peserta disebutkan, gunakan nama mereka. 
               Jika tidak bisa diidentifikasi, gunakan [SPEAKER_A], [SPEAKER_B], dst.
            2. Hilangkan kata filler berlebihan (eh, um, anu, gitu, you know, uh)
            3. Perbaiki ejaan dan tanda baca
            4. Pertahankan MAKNA dan SUBSTANSI asli — jangan tambahkan atau hapus poin penting
            5. Format: [NAMA_PEMBICARA]: teks ucapan
            6. Jika ada dialog panjang dari satu pembicara, boleh digabung menjadi satu blok.
            
            Output: Transcript yang bersih dan terstruktur.
            """

            clean_task = Task(
                description=clean_task_desc,
                expected_output="Transcript yang sudah dibersihkan dengan format [NAMA]: teks",
                agent=cleaner_agent,
            )

            clean_crew = Crew(agents=[cleaner_agent], tasks=[clean_task], process=Process.sequential, verbose=False)
            clean_result = clean_crew.kickoff()
            clean_transcript = str(clean_result)

            yield json.dumps({"stage": "cleaning_done", "content": clean_transcript[:500] + "..."})

            # ── AGENT 2: Meeting Analyst ──────────────────────────
            yield json.dumps({"stage": "analyzing", "content": "🔍 Menganalisis isi rapat..."})
            await asyncio.sleep(0.1)

            analyst_agent = Agent(
                role=prompts["analyst_role"],
                goal=prompts["analyst_goal"],
                backstory=prompts["analyst_backstory"],
                llm=llm,
                verbose=False,
                allow_delegation=False,
            )

            analyst_task_desc = f"""
            Analisis transcript rapat yang sudah dibersihkan ini {lang_instruction}:
            
            {clean_transcript}
            
            Buat ringkasan analisis yang mencakup:
            1. **Judul Meeting** yang tepat (jika belum ada: {meeting_title or 'inferensi dari konteks'})
            2. **Agenda/Topik Utama** yang dibahas (bullet points)
            3. **Poin-Poin Diskusi Penting** — apa yang diperdebatkan, disetujui, dipertanyakan
            4. **Keputusan yang Diambil** — list keputusan konkret
            5. **Isu yang Belum Terselesaikan** — hal yang masih perlu ditindaklanjuti
            6. **Tingkat Produktivitas Rapat** — singkat (sangat produktif / cukup produktif / perlu follow-up)
            
            Format output dalam Markdown.
            """

            analyst_task = Task(
                description=analyst_task_desc,
                expected_output="Analisis meeting dalam format Markdown dengan semua 6 poin di atas",
                agent=analyst_agent,
            )

            analyst_crew = Crew(agents=[analyst_agent], tasks=[analyst_task], process=Process.sequential, verbose=False)
            analysis_result = analyst_crew.kickoff()
            analysis = str(analysis_result)

            yield json.dumps({"stage": "analyzing_done", "content": analysis[:300] + "..."})

            # ── AGENT 3: Action Item Extractor ────────────────────
            yield json.dumps({"stage": "extracting", "content": "✅ Mengekstrak action items..."})
            await asyncio.sleep(0.1)

            extractor_agent = Agent(
                role=prompts["extractor_role"],
                goal=prompts["extractor_goal"],
                backstory=prompts["extractor_backstory"],
                llm=llm,
                verbose=False,
                allow_delegation=False,
            )

            extractor_task_desc = f"""
            Dari transcript dan analisis rapat ini, ekstrak SEMUA action items:
            
            TRANSCRIPT:
            {clean_transcript}
            
            ANALISIS:
            {analysis}
            
            INSTRUKSI:
            - Temukan SEMUA komitmen, tugas, dan tindak lanjut yang disebutkan atau tersirat
            - Setiap action item harus memiliki task yang jelas dan spesifik
            - Identifikasi PIC (Penanggung Jawab) berdasarkan konteks — siapa yang menyanggupi atau ditunjuk. Jika tidak ada: "-"
            - Identifikasi deadline jika disebutkan (format: tanggal/minggu/bulan). Jika tidak ada: "-"
            - Priority: "high" (kritis/urgent), "medium" (penting tapi tidak mendesak), "low" (nice-to-have)
            
            KEMBALIKAN HANYA JSON ARRAY (tanpa markdown, tanpa penjelasan):
            [
              {{
                "task": "Deskripsi task yang jelas dan actionable",
                "pic": "Nama orang atau divisi yang bertanggung jawab atau -",
                "deadline": "Deadline atau - estimasikan waktu yang masuk akal jika tidak ada",
                "priority": "high|medium|low",
                "notes": "Catatan tambahan jika ada"
              }}
            ]
            """

            extractor_task = Task(
                description=extractor_task_desc,
                expected_output="JSON array of action items tanpa markdown formatting",
                agent=extractor_agent,
            )

            extractor_crew = Crew(agents=[extractor_agent], tasks=[extractor_task], process=Process.sequential, verbose=False)
            extraction_result = extractor_crew.kickoff()
            action_items_raw = str(extraction_result)

            # Parse JSON action items
            action_items = []
            try:
                import re
                json_match = re.search(r'\[.*?\]', action_items_raw, re.DOTALL)
                if json_match:
                    action_items = json.loads(json_match.group())
            except (json.JSONDecodeError, AttributeError) as e:
                logger.warning(f"[MoM] Action items parsing failed: {e}")
                action_items = []

            yield json.dumps({"stage": "extracting_done", "content": json.dumps(action_items)})

            # ── AGENT 4: MoM Writer ───────────────────────────────
            yield json.dumps({"stage": "writing", "content": "✍️ Menulis dokumen MoM..."})
            await asyncio.sleep(0.1)

            writer_agent = Agent(
                role=prompts["writer_role"],
                goal=prompts["writer_goal"],
                backstory=prompts["writer_backstory"],
                llm=llm,
                verbose=False,
                allow_delegation=False,
            )

            action_items_formatted = "\n".join([
                f"- [{item.get('priority','medium').upper()}] {item.get('task','')} | PIC: {item.get('pic','-')} | Deadline: {item.get('deadline','-')}"
                for item in action_items
            ]) if action_items else "Tidak ada action items yang teridentifikasi."

            writer_task_desc = f"""
            Tulis Minutes of Meeting (MoM) yang FORMAL, LENGKAP, dan PROFESIONAL {lang_instruction}.
            
            Gunakan semua informasi berikut:
            
            PESERTA: {participants_str}
            
            ANALISIS RAPAT:
            {analysis}
            
            ACTION ITEMS:
            {action_items_formatted}
            
            FORMAT OUTPUT (Markdown):
            
            # [JUDUL MEETING]
            
            ## Ringkasan Eksekutif
            [2-3 kalimat yang merangkum keseluruhan rapat dengan jelas]
            
            ## Agenda yang Dibahas
            [Daftar agenda/topik]
            
            ## Poin-Poin Diskusi
            [Detail diskusi yang terjadi, per topik]
            
            ## Keputusan yang Diambil
            [List keputusan konkret]
            
            ## Action Items
            [Ringkasan action items — detail sudah di dokumen terpisah]
            
            ## Isu Terbuka & Tindak Lanjut
            [Hal yang belum terselesaikan dan perlu dibahas di rapat berikutnya]
            
            ## Catatan Penutup
            [Penutup singkat — jadwal rapat berikutnya jika disebutkan, dll]
            
            ATURAN:
            - Gunakan bahasa formal dan profesional
            - Hindari opini subjektif
            - Pastikan setiap poin berdasarkan apa yang benar-benar dibahas dalam transcript
            - Gunakan heading Markdown (# ## ###)
            """

            writer_task = Task(
                description=writer_task_desc,
                expected_output="Dokumen MoM lengkap dalam format Markdown yang siap digunakan",
                agent=writer_agent,
            )

            writer_crew = Crew(agents=[writer_agent], tasks=[writer_task], process=Process.sequential, verbose=False)
            mom_result = writer_crew.kickoff()
            mom_document = str(mom_result)

            # ── FINAL OUTPUT ──────────────────────────────────────
            yield json.dumps({
                "stage": "done",
                "content": mom_document,
                "action_items": action_items,
                "clean_transcript": clean_transcript,
                "analysis": analysis,
            })

        except Exception as e:
            logger.error(f"[MomService] Pipeline error: {e}")
            yield json.dumps({"stage": "error", "content": f"Error dalam proses CrewAI: {str(e)}"})

    async def process_transcript(
        self,
        transcript: str,
        language: str = "id",
        participants: Optional[list] = None,
        meeting_title: Optional[str] = None,
    ) -> dict:
        """
        Non-streaming version: Proses transcript dan kembalikan hasil lengkap.
        Returns dict: {mom_document, action_items, clean_transcript, analysis}
        """
        result = {}
        async for chunk in self.process_transcript_stream(transcript, language, participants, meeting_title):
            try:
                data = json.loads(chunk)
                if data["stage"] == "done":
                    result = data
                elif data["stage"] == "error":
                    raise RuntimeError(data["content"])
            except json.JSONDecodeError:
                continue

        return result

    async def infer_meeting_title(self, transcript: str, language: str = "id") -> str:
        """Inferensi judul meeting profesional menggunakan AI."""
        if not transcript or len(transcript.strip()) < 20:
            return "Untitled Meeting"

        try:
            from crewai import LLM
            llm = LLM(
                model=f"openai/{self.model}",
                api_key=self.openai_api_key,
                temperature=0.4,
            )
            
            prompt = (
                "Berdasarkan potongan transkrip rapat berikut, buatlah judul rapat yang singkat, padat, dan profesional (Maksimum 6 kata).\n"
                "JANGAN gunakan kata 'Rapat' atau 'Meeting' atau 'Title' sebagai awalan.\n"
                "Cukup berikan judulnya saja.\n\n"
                f"TRANSKRIP: {transcript[:1000]}"
            )
            
            # Simple one-shot inference
            response = llm.call([{"role": "user", "content": prompt}])
            title = str(response).strip().strip('"').strip("'")
            
            # Remove common prefixes if AI ignored the instruction
            for prefix in ["Rapat -", "Rapat —", "Meeting -", "Meeting —", "Judul:", "Title:"]:
                if title.lower().startswith(prefix.lower()):
                    title = title[len(prefix):].strip()
            
            return title
        except Exception as e:
            logger.error(f"[MoM] Title inference failed: {e}")
            # Fallback simple logic
            words = transcript.strip().split()[:7]
            return " ".join(words) + "..."


# Singleton
mom_service = MomService()
