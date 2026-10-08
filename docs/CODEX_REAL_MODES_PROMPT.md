# Comprehensive Codex Build Prompt: Implementing Real Career-Ops Modes & Workspaces

---

### What to Paste into Codex

```markdown
Hello Codex,

I inspected the codebase in `src/`. Currently, the project only has static layout templates and hardcoded scoring constants (`defaultScorecard`). None of the actual Career-Ops backend modes, API routes, or interactive workflows are wired up.

Please implement the real, dynamic Career-Ops architecture as specified below:

---

### 1. Integrate the 14 Career-Ops Modes (`/api/modes/route.ts` & UI Triggers)
Reference the mode definitions in `D:\Antigravity\Career Ops\modes/*.md`.
Create an API route `/api/modes` that takes `{ mode: string, jobText?: string, jobUrl?: string, company?: string, role?: string }` and uses Groq (`llama-3.3-70b-versatile`) or Gemini 2.5 Flash to execute the mode:

1. **`oferta` (Fit Evaluator)**: Takes a JD -> parses requirements -> scores against candidate's archetypes in `modes/_profile.md` -> outputs A–F grades, missing keywords, and red flags.
2. **`contacto` (LinkedIn Outreach)**: Generates 3 personalized outreach messages (Hiring Manager, Peer, Recruiter) based on proof points.
3. **`interview-prep` (STAR+R Stories)**: Pulls relevant achievements from candidate's CV and generates tailored STAR stories for the JD questions.
4. **`cover` (Cover Letter)**: Generates a natural, 1-page conversational cover letter adhering to `modes/_custom.md`.
5. **`deep-research`**: Synthesizes company tech stack, recent funding, business model, and interview culture.
6. **`patterns`**: Analyzes rejection trends and matches against candidate archetypes.

---

### 2. Studio Command Center (`/` or `src/app/page.tsx`) -> Real Dynamic Evaluation
Transform `src/app/page.tsx` into a functional Split-Screen Studio:
- **Left Panel**:
  - URL / Textarea input to paste a Job Description.
  - "Evaluate Fit" button calling `/api/modes` with mode `oferta`.
  - Dynamic `ScoringPanel` that updates live from the LLM output (not hardcoded `defaultScorecard`).
  - Interactive Action Toolbar with 1-click mode triggers:
    * `[Generate Cover Letter]`
    * `[LinkedIn Outreach Messages]`
    * `[Interview STAR Prep]`
    * `[Deep Research]`
- **Right Panel (Live ATS Resume Studio)**:
  - Displays the candidate's canonical resume (from `D:\Antigravity\Career Ops\cv.md`).
  - Highlights tailored bullet point suggestions based on the evaluated JD.
  - 1-click "Copy Tailored Markdown" and "Download ATS PDF".

---

### 3. Pipeline Discovery Inbox (`src/app/pipeline/page.tsx`) -> Real Scraped Postings
Replace the placeholder with a working job feed:
- Create `/api/scan/route.ts` that fetches live public postings from ATS APIs (Greenhouse, Lever, Ashby) using the target companies in `D:\Antigravity\Career Ops\portals.yml`.
- Display real job cards with: Company, Role Title, Location, Remote/Hybrid Badge, ATS Source, and Discovered Date.
- Add 1-click actions:
  - `[Evaluate in Studio]`: Loads the job directly into the Studio for scoring.
  - `[Shortlist]`: Moves the job to the Tracker inbox.
  - `[Discard]`: Filters out the job.

---

### 4. Interactive Tracker (`src/app/tracker/page.tsx`) -> Dynamic Kanban & Table
Replace the 3 static cards with a real state ledger:
- Store applications in React State / LocalStorage (seeded with existing applications from `D:\Antigravity\Career Ops\data\applications.md`).
- Kanban Columns: `Discovered`, `Evaluated`, `Applied`, `Interview`, `Offer`, `Rejected`, `Hired`.
- Drag/Click to move applications between stages.
- Toggle between Kanban Board and Table View.
- "Export to Markdown" button that generates the exact format of `applications.md`.

---

### 5. API Keys & LLM Setup
- Add `GROQ_API_KEY` and `GEMINI_API_KEY` to `.env.local.example`.
- Ensure fallback mock responses exist if no API key is provided so the UI remains fully testable offline.

Please implement these real API routes and dynamic components now, ensuring `pnpm dev` compiles cleanly with zero errors.
```
