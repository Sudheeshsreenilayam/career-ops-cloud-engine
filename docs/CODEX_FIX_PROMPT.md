# Codex Fix Prompt: Transform Placeholder Pages into Real Career-Ops Workspaces

---

### What to Paste into Codex

```markdown
Hello Codex,

I tested the app at http://localhost:3000/ and verified Phase 1 setup.
The visual design and the Onboarding Wizard work well, but the core workspaces currently only have static informational text/placeholders instead of real, interactive Career-Ops tools.

Please implement the real functional components for Studio, Pipeline, and Tracker as outlined below:

---

### 1. Studio Workspace (`/` or `/studio`) -> Turn into Split-Screen Command Center
Currently: It just displays informational boxes about "User Layer" and "System Layer".
Needs to be:
- **Left Pane (Interactive Fit & Scorecard Engine)**:
  1. Input bar to paste a Job Description URL or raw JD text with an "Evaluate Fit" button.
  2. Multi-dimensional Fit Scorecard (A–F score, 1.0–5.0 score, Radar breakdown, Missing Keywords, Red Flags).
  3. Action Bar with quick triggers for Career-Ops modes (`/contacto` outreach generator, `/interview-prep` STAR stories, `/deep-research`).
- **Right Pane (Live ATS Resume Studio)**:
  1. Live ATS resume preview generated from the candidate's canonical `cv.md` facts.
  2. Real-time tailored bullet point suggestions matching the evaluated JD.
  3. 1-click "Download PDF" / "Copy Markdown" button.

---

### 2. Pipeline Discovery Inbox (`/pipeline`) -> Turn into Interactive Job Feed
Currently: It only shows a "Three-stage flow coming online" placeholder card.
Needs to be:
1. **Interactive Job Ingestion & Discovery Feed**:
   - Table / Card feed displaying job postings with columns/badges: Company, Role, Location, Salary, ATS (Greenhouse/Lever/Ashby), and Discovered Date.
   - Seeded with sample active listings from `portals.yml` (e.g. OpenAI, Anthropic, Retell AI, Microsoft).
2. **1-Click Triage Actions**:
   - "Evaluate" button on each card -> loads the job directly into the Studio for live scoring.
   - "Shortlist" and "Archive / Discard" buttons to triage jobs instantly.
3. **Filter & Search Bar**: Quick search by role title, remote type, or ATS provider.

---

### 3. Application Tracker (`/tracker`) -> Turn into Real Kanban Board & State Ledger
Currently: It only displays 3 static cards ("Applied", "Interview", "Offer").
Needs to be:
1. **Interactive Kanban Board**:
   - Columns representing canonical states: `Discovered`, `Evaluated`, `Applied`, `Interview`, `Offer`, `Rejected`, `Hired`.
   - Application cards with Company, Role, Match Score (e.g., `4.8/5`), Date, and Notes.
   - Drag-and-drop or 1-click status mover to advance applications between columns.
2. **Switchable Table View**:
   - Toggle between Kanban Board and Table View (mimicking `data/applications.md`).
   - "Export to Markdown" button that generates the exact format of `applications.md`.

---

### 4. Direct Navigation Update
- Ensure the header navigation cleanly routes between:
  * **Studio** (`/`)
  * **Pipeline** (`/pipeline`)
  * **Tracker** (`/tracker`)
  * **Onboarding / Profile** (`/onboarding`)

Please implement these functional UI components using Tailwind CSS, Shadcn UI, and Lucide icons, ensuring `pnpm dev` runs with zero build or lint errors. Show me your plan and implement it!
```
