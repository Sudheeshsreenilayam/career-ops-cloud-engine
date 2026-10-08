# Codex Polish & Production-Ready Prompt: Connect Groq/Gemini & Fix UI Interactions

---

### What to Paste into Codex

```markdown
Hello Codex,

Great work on wiring the real API backend (`/api/modes`, `/api/scan`, `/api/tracker/seed`, `/api/cv`) and components! The foundation is solid.

Now, let's polish the app so it is 100% interactive, responsive, and ready for production/cloud deployment. Please fix the following items:

---

### 1. Enable Live LLM Evaluations (`.env.local` & Groq/Gemini Streaming)
1. Provide a `.env.local.example` with:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. In `/api/modes/route.ts`:
   - When `GROQ_API_KEY` or `GEMINI_API_KEY` is present, execute the real prompt logic from `D:\Antigravity\Career Ops\modes/*.md` (e.g. `oferta` evaluation, `cover` generation, `contacto` outreach, `interview-prep` STAR stories).
   - Ensure the JSON returned contains structured fields (`summary`, `scorecard`, `missing_keywords`, `red_flags`, `cover_letter`, `messages`, `stories`) so the Studio UI updates dynamically.
   - When no API key is provided, return the clean mock response instantly (within 100ms) without blocking or hanging.

---

### 2. Studio Command Center (`src/components/studio-command-center.tsx`) Polish
1. **Clear Loading States**:
   - When any mode button (e.g., "Evaluate Fit", "Generate Cover Letter") is clicked, disable the button and show a clean spinner / "Generating..." indicator.
2. **Results Display Pane**:
   - Under the Action Toolbar, render a clean card displaying the generated output for the selected mode:
     * If `oferta`: Show Fit Summary, Missing Keywords badges, and Red Flags alert.
     * If `cover`: Show editable Cover Letter text area with a "Copy Cover Letter" button.
     * If `contacto`: Show 3 distinct outreach message tabs (Hiring Manager, Peer, Recruiter) with 1-click copy buttons.
     * If `interview-prep`: Show accordion / list of interview questions and tailored STAR+R stories.
     * If `deep-research`: Show company tech stack breakdown and hiring signals.
3. **Responsive Split Layout**:
   - Ensure the left panel (inputs + modes + output) and right panel (live ATS CV draft + copy/download buttons) are neatly displayed side-by-side on desktop (`lg:grid-cols-2`).

---

### 3. Pipeline Discovery (`src/components/pipeline-discovery.tsx`) Interactivity
1. **Wire the Action Buttons**:
   - **"Evaluate in Studio"**: When clicked on a job card, navigate the user to `/` (Studio) and automatically pre-fill the Company, Role, Job URL, and Description inputs, then trigger evaluation.
   - **"Shortlist"**: Adds the job directly into the Tracker under the `Discovered` or `Evaluated` column and stores it in LocalStorage.
   - **"Discard"**: Removes the job card from the active discovery list.
2. **Filter & Search Input**:
   - Add a search input at the top to filter by company name, role title, or remote status.

---

### 4. Tracker Board (`src/components/tracker-board.tsx`) Polish
1. **Interactive Column Mover**:
   - On each application card, add a small dropdown or chevron buttons (`←` / `→`) to quickly move an application across stages (`Discovered` ➔ `Evaluated` ➔ `Applied` ➔ `Interview` ➔ `Offer` ➔ `Hired`).
2. **"Add Application" Button**:
   - A simple modal / form to manually add a new job to the tracker.
3. **Table View Polish**:
   - Clean data table with sortable columns, matching the format in `data/applications.md`.
4. **"Export Markdown" Action**:
   - 1-click button to download/copy the updated tracker as `applications.md`.

---

### 5. Verification & Clean Build
- Ensure `pnpm build` and `pnpm dev` pass with **zero TypeScript errors and zero lint warnings**.
- Clean up any character encoding glitches (replace any `I?Tm` or `A` with clean UTF-8 text).

Show me your plan and execute the polish!
```
