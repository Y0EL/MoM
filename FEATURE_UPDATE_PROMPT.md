# Feature Update: Meeting Interface Overhaul
**Repository:** https://github.com/Y0EL/mom

---

## Context

You are working on a Meeting Minutes / Transcription application. The codebase is at the repository linked above. Before making any changes, you must first:

1. Read and understand the full codebase structure
2. Identify the existing transcription flow, UI components, and database schema
3. Understand how the current meeting session is managed (start, stop, data flow)
4. Identify the state management solution being used (Zustand, Redux, Context API, etc.)
5. Identify the UI framework and animation libraries already in use

Do not assume anything about the stack. Read the code first.

---

## Feature Requirements

### 1. Split-Panel Meeting Interface

During an active meeting session, the main interface must be restructured into a **two-column layout with a top audio visualizer**:

- **Top Center:** An audio visualizer styled like Apple Siri's waveform — smooth, animated, ambient sound waves that react to microphone input in real time. Use the Web Audio API `AnalyserNode` to drive this. The waveform should feel calm and fluid, not aggressive or technical.
- **Left Panel:** The existing transcription display, shown as a live-updating text block or card list. Label this tab **"Transkripsi"**.
- **Right Panel:** A new **"Correction"** tab — see detail below.

This layout is only active during an active meeting. Outside of meeting sessions, the interface can remain as-is.

---

### 2. Correction Panel (Right Panel)

This panel shows the transcribed text in an **interactive, word-selectable format**.

Behavior requirements:

- The text must be **word-chunked**, not character-by-character. Each word is an independent selectable unit.
- When the user **hovers** over a word, that word is highlighted to signal it is selectable.
- When the user **clicks** a word, it enters edit mode — a small inline input or popover appears, pre-filled with the current word, allowing the user to correct it.
- The correction must update only that specific word/chunk in the transcript, not the whole text block.
- The interaction must feel precise and intentional — not accidental. Consider using a small confirm button or pressing Enter to commit the edit.
- Words that have already been corrected should have a **subtle visual indicator** (e.g., slightly underlined, different color) to distinguish them from original AI output.

---

### 3. Pre-Send User Context Input

Before the user ends the meeting or sends data to the AI for final processing, there must be a way for the user to **inject free-form context** to improve AI accuracy.

Implementation:

- Add a **context input area** (textarea or expandable input) accessible during the meeting.
- Label it something like **"Tambah Konteks"** or **"Bantu AI dengan konteks tambahan"**.
- This context is stored in the current session state and sent alongside the transcript when the meeting ends or when final AI processing is triggered.
- Keep it accessible but not intrusive — it should not block the main transcription view.

---

### 4. AI Context Panel (Below Transcription Tab)

Below the **"Transkripsi"** panel, add a dedicated **AI Context** section.

Behavior:

- As the meeting runs, the AI works in the background to build **contextual summaries** of the conversation.
- Every **10 minutes** of meeting time, the AI automatically **compacts the accumulated transcript** into a structured contextual summary using a **Zod schema** to ensure no important information is lost. Example fields to capture: `topic`, `keyPoints`, `decisions`, `actionItems`, `speakers`, `timeRange`.
- Each 10-minute chunk produces one **Context Card** — a compact, scrollable summary block displayed in this section.
- The Context Cards **stack vertically and are scrollable** — context 1, context 2, context 3, and so on.
- Context Cards must **never be deleted or overwritten** during the session.

The tone of the AI's summary output should feel slightly conversational and observational — something like:

> "Menarik, di segmen ini diskusi mulai bergeser ke arah X. Ada keputusan penting soal Y yang perlu dicatat."

This should be part of the AI prompt used to generate the summary.

**Important:** The 10-minute compaction must be triggered by a timer tied to the active meeting duration, not wall clock time. If the meeting is paused, the timer should pause too.

---

### 5. Animation: Context Discovery Moment

When a new Context Card is generated (i.e., the 10-minute threshold is hit and the AI finishes compacting), the appearance of the new card must have a **purposeful animation**:

- The card should **slide in or fade in from below** with a smooth easing curve.
- There should be a brief **"thinking" or loading state** before the card appears — a skeleton or animated placeholder to signal the AI is working.
- The entrance animation must feel like a **discovery moment**, not a generic list append. Consider a subtle glow or pulse on first render that fades out.
- Do not use jarring or fast animations. The meeting is a focused environment.

Use whatever animation library is already in the project (Framer Motion, CSS transitions, etc.). If none exists, use CSS keyframes or Framer Motion.

---

### 6. Persistence: Context Cards Must Survive

Context Cards generated during a meeting must be:

- **Stored in the database** alongside the meeting record when the meeting ends.
- **Retrievable and displayed** when the user opens a past meeting from history.
- **Ordered and intact** — context card 1 through N, in chronological order, exactly as they were generated.
- Never truncated or summarized further in storage — store the full structured Zod output per card.

Update the database schema if needed to support this. If using an ORM (Prisma, Drizzle, etc.), add a migration. If raw SQL, write the ALTER TABLE or CREATE TABLE statement as part of your implementation.

---

## Implementation Notes

- Do not break any existing functionality. Work additively.
- If the project uses TypeScript, maintain strict typing throughout. Use Zod for the context card schema validation on both client and server.
- The Zod schema for a Context Card should be defined once and shared between the AI prompt output parsing and the database layer.
- For the audio visualizer, the waveform should degrade gracefully if microphone permission is denied — show a flat idle animation instead of erroring.
- All new UI components should be consistent with the existing design system and component patterns in the project.
- Add comments where the logic is non-obvious, especially around the 10-minute timer and context compaction trigger.

---

## Deliverables

When done, confirm:

- [ ] Split-panel layout works during active meeting
- [ ] Siri-style audio visualizer renders and reacts to audio
- [ ] Correction panel allows word-level inline editing
- [ ] Corrected words are visually marked
- [ ] Pre-send context input works and is passed to final AI call
- [ ] AI Context section appears below transcription
- [ ] 10-minute compaction fires correctly and produces a Zod-validated Context Card
- [ ] Context Card entrance animation feels intentional and smooth
- [ ] Context Cards scroll correctly and are never deleted
- [ ] Context Cards are saved to DB on meeting end
- [ ] Context Cards load correctly from history view
