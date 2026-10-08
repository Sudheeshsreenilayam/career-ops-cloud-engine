# Codex Master Build Prompt & Phased Execution Plan
## Project: Career-Ops Web App (Zero-Cost, Minimal Latency)

---

### Critical Guardrails for Codex
> [!CAUTION]
> **READ-ONLY CONSTRAINTS**:
> 1. **DO NOT MODIFY** any files in `D:\Antigravity\Career Ops` or `D:\Antigravity\Career-ops-cloud-engine`. These directories are **Strictly Read-Only** reference sources.
> 2. You will work **exclusively** in the designated project folder (e.g., `D:\Codex\CareerOps-Web`).
> 3. Never invent facts, dates, or metrics. All candidate data must strictly adhere to the reference files.
> 4. **Milestone UI Checkpoints**: At the end of every phase, the app must run with `pnpm dev` so the user can inspect the live UI.

---

### Reference Sources (Read-Only)

Codex should reference **only** these specific configuration, profile, and logic files from `D:\Antigravity\Career Ops`:

| Component | Source File to Read / Copy | Purpose |
| :--- | :--- | :--- |
| **User Profile & Targets** | `D:\Antigravity\Career Ops\config\profile.yml` | Candidate facts, target roles, salary, and narrative |
| **Personalized Archetypes** | `D:\Antigravity\Career Ops\modes\_profile.md` | 5 Custom career archetypes, matching weights, constraints |
| **Formatting Rules** | `D:\Antigravity\Career Ops\modes\_custom.md` | Strict formatting, banned words, bullet conventions |
| **Canonical CV** | `D:\Antigravity\Career Ops\cv.md` | Source of truth career history & metrics |
| **14 Career-Ops Modes** | `D:\Antigravity\Career Ops\modes/*.md` | Prompt logic for `oferta`, `contacto`, `interview-prep`, `pdf`, `patterns`, etc. |
| **Scanner Portals** | `D:\Antigravity\Career Ops\portals.yml` | Configured target companies & ATS portals |
| **Canonical States** | `D:\Antigravity\Career Ops\templates\states.yml` | Tracker statuses (`Evaluated`, `Applied`, `Interview`, etc.) |

---

### Core UI Architecture (Uncluttered 3-Workspace Layout)

The web app is structured into 3 clean, uncluttered core tabs (Dark mode by default with Tailwind + Shadcn UI):

1. **Studio (`/`) - Command Center**:
   * **Left Panel**: Input URL / Paste JD $\to$ Streamed A–F Scorecard (fit score, salary radar, missing keywords, red flags) + Action buttons for all 14 Career-Ops Modes.
   * **Right Panel**: Live ATS Split-Screen Resume & Cover Letter Preview (rendered instantly via WASM/HTML).
2. **Pipeline (`/pipeline`) - Discovery Inbox**:
   * Card/Table view of discovered postings from Ashby/Greenhouse/Lever scanners.
   * Quick Triage buttons (`Evaluate`, `Pass`, `Archive`).
3. **Tracker (`/tracker`) - Kanban & Table**:
   * Visual Kanban board across canonical statuses (`Evaluated` $\to$ `Applied` $\to$ `Interview` $\to$ `Offer` $\to$ `Hired`).
   * Filterable table with 1-click Markdown / TSV export.

---

### Phased Build Instructions for Codex

#### Phase 1: Clean Foundation, Onboarding Flow & Design System (UI Checkpoint 1)
* **Goal**: Scaffold Next.js 15 with TypeScript, Tailwind CSS, Lucide Icons, and Shadcn UI with an interactive Onboarding Wizard.
* **Deliverables**:
  1. Responsive top navigation with dark-mode palette and 3 main tabs: Studio (`/`), Pipeline (`/pipeline`), Tracker (`/tracker`).
  2. **Interactive Onboarding Modal/Page (`/onboarding`)**:
     * Step 1: Upload CV (Markdown / PDF / Text) $\to$ auto-parses candidate facts.
     * Step 2: Auto-detects & proposes 3–5 Career Archetypes with customizable weights.
     * Step 3: Sets target locations, salary expectations, and work preferences.
     * "Pre-populate from local setup" button for instant testing with your existing `profile.yml` and `_profile.md`.
* **Verification**: `pnpm dev` opens at `http://localhost:3000` showing the onboarding flow (or pre-populated studio) cleanly.

#### Phase 2: Pipeline Inbox & Portal Scanner (UI Checkpoint 2)
* **Goal**: Enable job ingestion and zero-token ATS scraping.
* **Deliverables**:
  1. `/api/scan` route that reads `portals.yml` and queries public Greenhouse, Lever, and Ashby APIs.
  2. Discovery Inbox view in `/pipeline` displaying newly discovered jobs with company badges, salary ranges, and direct links.
  3. "Quick Triage" actions: 1-click to push a job into the Studio for evaluation.
* **Verification**: User can see live job cards in `/pipeline` and click "Evaluate" to open the Studio.

#### Phase 3: Instant Studio & 14 Mode Workflows (UI Checkpoint 3)
* **Goal**: Ultra-fast A–F job evaluation and mode actions.
* **Deliverables**:
  1. Groq (`llama-3.3-70b-versatile`) / Gemini Flash streaming API in `/api/evaluate` implementing the exact logic from `modes/oferta.md` and `modes/_profile.md`.
  2. Studio Left Panel: Live streaming markdown scorecard with radar chart and fit badges in <2 seconds.
  3. Action Bar with 1-click mode buttons (`/contacto`, `/interview-prep`, `/cover`, `/deep-research`).
* **Verification**: Pasting any JD URL renders the complete fit evaluation score within 2 seconds.

#### Phase 4: Split-Screen Live Resume Tailor & WASM Preview (UI Checkpoint 4)
* **Goal**: Real-time side-by-side ATS resume tailoring, cover letter generation, and in-browser WASM PDF preview.
* **Deliverables**:
  1. Studio Right Panel: Live editable resume editor with targeted bullet point recommendations honoring `modes/_custom.md` (Google XYZ format, natural tone).
  2. Instant in-browser PDF rendering (using HTML/WASM).
  3. 1-click download of ATS-compliant PDF and pre-filled application answer pack.
* **Verification**: Editing a bullet point in the editor updates the visual PDF preview instantaneously.

#### Phase 5: Tracker Kanban, Form-Filling Assistant & Review Gateway (UI Checkpoint 5)
* **Goal**: Application tracking, form-inspection assistant, and human-in-the-loop review gateway.
* **Deliverables**:
  1. Interactive drag-and-drop Kanban board in `/tracker`.
  2. **Application Assistant Modal / Review Drawer**:
     * Inspects ATS form questions (Greenhouse/Lever/Ashby) and displays them pre-filled alongside custom essay answers.
     * Document attachment preview (tailored CV & Cover Letter).
     * Human-in-the-loop final confirmation gate before submission.
  3. Local-first storage (IndexedDB / SQLite Edge) with 1-click Markdown sync to match `applications.md`.
* **Verification**: Moving an application card to "Applied" updates state and exports clean Markdown.

#### Future Expansion (Post-MVP): Headless Browser Account Creator & Email OTP
* **Scope**: Automated background account registration, password vault, and Gmail/Outlook OAuth OTP retrieval. This will be layered onto the stable Phase 1–5 core foundation.

---

### Portals & Discovery Strategy

* **ATS-First Zero-Token Scrapers**: Focus initially on the top public ATS APIs (**Greenhouse**, **Lever**, **Ashby**, and **Workable**). These provide structured JSON feeds directly with **zero LLM tokens and zero scraping blocks**.
* **Direct Career Page & Manual URL Ingestion**: Allow users to paste any job posting URL or configure company URLs directly from `portals.yml`.

---

### Step-by-Step Prompt to Paste into Codex to Start

```markdown
Hello Codex,

Please read the master specification in `D:\Antigravity\Career-ops-cloud-engine\docs\PROMPT_FOR_CODEX.md`.

You are building the Career-Ops Web App in this workspace.

CRITICAL RULES:
1. All files in `D:\Antigravity\Career Ops` and `D:\Antigravity\Career-ops-cloud-engine` are STRICTLY READ-ONLY references. Do not modify them.
2. Only reference:
   - `D:\Antigravity\Career Ops\config\profile.yml`
   - `D:\Antigravity\Career Ops\modes\_profile.md`
   - `D:\Antigravity\Career Ops\modes\_custom.md`
   - `D:\Antigravity\Career Ops\cv.md`
   - `D:\Antigravity\Career Ops\portals.yml`
   - `D:\Antigravity\Career Ops\templates\states.yml`
3. We will build this iteratively in 5 phases. At the end of every phase, the app must run with `pnpm dev` so I can review the UI in my browser.

GIT & VERSION CONTROL:
- Initialize git (`git init`) and set up a standard Next.js `.gitignore` before writing code.
- Prepare clear commit messages for each completed milestone.

MULTI-TAB APPLICATION LAYOUT:
- This is a clean, multi-tab web application with a modern dark-mode header/sidebar:
  * **Tab 1: Studio (`/`)** — Split-screen command center (JD evaluation scorecard + live ATS PDF preview + 14 Career-Ops modes action bar).
  * **Tab 2: Pipeline (`/pipeline`)** — Discovery inbox with ATS cards, search filters, and 1-click triage.
  * **Tab 3: Tracker (`/tracker`)** — Interactive Kanban board & application table.
  * **Tab 4: Profile & Archetypes (`/profile`)** — Career archetypes, target salary/locations, and master CV viewer.
  * **Tab 5: Onboarding (`/onboarding`)** — Tsenta-style step-by-step CV upload, auto-archetype discovery, and quick pre-populate toggle.

PORTALS STRATEGY:
- ATS-first approach: Leverage structured public API feeds for Greenhouse, Lever, Ashby, and Workable from `portals.yml` alongside manual URL input.

Let's begin with PHASE 1:
- Initialize Git repository and Next.js 15 + TypeScript + Tailwind CSS + Lucide Icons + Shadcn UI workspace.
- Build the multi-tab navigation shell (`Studio`, `Pipeline`, `Tracker`, `Profile`, `Onboarding`).
- Implement the interactive Onboarding Wizard (`/onboarding`) with CV upload parser, auto-archetype detector, and a "Pre-populate from existing profile" toggle.
- Ensure `pnpm dev` runs cleanly on `http://localhost:3000` with zero lint or build errors.

Show me the plan and start implementing Phase 1.
```
