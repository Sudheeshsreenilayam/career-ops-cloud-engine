#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const ROOT = dirname(fileURLToPath(import.meta.url));
const PATHS = {
  reports: join(ROOT, 'reports'),
};

const args = process.argv.slice(2);
let jdText = '';
let saveReport = true;
let modelName = 'llama-3.3-70b-versatile'; // Llama 3.3 has 12k TPM limit, plenty for a 3k compact prompt!

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) {
    const filePath = args[i + 1];
    if (!existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    jdText = readFileSync(filePath, 'utf-8').trim();
    i++;
  } else if (args[i] === '--no-save') {
    saveReport = false;
  } else if (!args[i].startsWith('--')) {
    jdText += (jdText ? '\n' : '') + args[i];
  }
}

if (!jdText) {
  console.error('❌ No Job Description provided.');
  process.exit(1);
}

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error('❌ GROQ_API_KEY not found in .env');
  process.exit(1);
}

const groq = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});

function nextReportNumber() {
  if (!existsSync(PATHS.reports)) return '001';
  const files = readdirSync(PATHS.reports)
    .filter(f => /^\d{3}-/.test(f))
    .map(f => parseInt(f.slice(0, 3)))
    .filter(n => !isNaN(n));
  if (files.length === 0) return '001';
  return String(Math.max(...files) + 1).padStart(3, '0');
}

// ---------------------------------------------------------------------------
// Highly Compressed Context (Fits easily within Groq Free Tier TPM Limits)
// ---------------------------------------------------------------------------
const compactCV = `
CANDIDATE: Sudheesh Sreenilayam
ROLE TARGET: Principal Data Analyst, Operations Analytics Manager
EDUCATION: MS in Business Analytics (Roosevelt University, Chicago - May 2026), B.Tech in ECE (2016)
CERTIFICATIONS: Lean Six Sigma Green Belt (Active)
SUMMARY: 8+ years exp in Operations Analytics (SQL, Power BI, Python, Excel) and Lean Six Sigma. Led 200+ FTE operations.
EXPERIENCE HIGHLIGHTS:
1. Roosevelt University (Graduate Assistant, Oct 2024 - May 2026): relational databases, stats modeling, Solver.
2. Sutherland / Amazon Logistics (Sr. Associate Manager, Sep 2023 - Aug 2024): proposed last-mile local photo cache bypass ($900k projected savings), redesigned agent routing validation rules ($114k savings), managed EBRs/QBRs for 200+ FTEs, automated Power BI dashboards.
3. Sutherland (Associate Manager, Dec 2021 - Aug 2023): DMAIC Green Belt quality optimization, audited Amazon invoice databases ($100k reconciled, predictive model variance to ~0%).
4. Sutherland (Lead, Dec 2019 - Nov 2021): Script A/B testing (16% FCR boost), resolved last-mile delivery success bottlenecks.
5. Sutherland (SME, Jun 2016 - Nov 2019): Excel contact log correlation analysis, 100% SLA compliance.
TECHNICAL SKILLS: SQL (Postgres, BigQuery, Server), Python (Pandas, Scikit-learn), R, Power BI (DAX), Excel (VBA, Power Query), Minitab, Data Validation & Cleansing, RCA, FMEA.
`;

const systemPrompt = `You are career-ops, an AI-powered job search assistant.
Evaluate the Job Description against the Candidate Profile using a structured A-G scoring system. Keep all explanations extremely brief (1-2 sentences per item).

TRAJECTORY AND DOMAIN CHECK (CRITICAL): Check if the role is a pure software engineer/developer, DevOps/reliability engineer, database administrator (DBA), hardware/electrical/mechanical/facilities engineer, QA/tester, IT support technician, recruiter, sales/marketing representative, or generic administrative assistant. If it is ANY of these, you MUST classify the archetype as "Trajectory Mismatch", score the role exactly 1.0/5, and recommend "SKIP" in Block E, noting that the core domain is a mismatch for your career goals, regardless of individual skill keywords (like SQL) mentioned.

SCORING RULES:
Score the role from 0.0 to 5.0 based on:
- Target roles & seniority (Principal Data Analyst, Analytics Manager). Set to 1.0 if Trajectory Mismatch is active.
- Tech stack match (SQL, Power BI, Python, Excel, statistical modeling)
- Core qualifications (Lean Six Sigma, operations analytics, public sector open data is a plus)

Do NOT output any markdown tables or pipe (|) characters.

REQUIRED OUTPUT STRUCTURE:
Block A: Fit & Gap Analysis (Tech stack gaps, seniority gaps, visa/location policy gaps - candidate has F-1 OPT with STEM extension)
Block B: Scoring Breakdown (Score from 0.0 to 5.0 and short rationale)
Block C: Goal Alignment (Is it a stepping stone or target role?)
Block D: Compensation Research (Give realistic local market salary range)
Block E: Recommendation (Apply, Skip, or Hold)
Block F: Tailwind & Interview Prep (List 2 key stories from candidate's experience to use for this role)
Block G: Legitimacy & Urgency (High Confidence, Caution, or Suspicious based on JD signals)

At the very end, output this summary block:
---SCORE_SUMMARY---
COMPANY: <company name>
ROLE: <role title>
SCORE: <global score as decimal, e.g. 4.2>
ARCHETYPE: <detected archetype or "Trajectory Mismatch">
LEGITIMACY: <High Confidence | Proceed with Caution | Suspicious>
---END_SUMMARY---

Candidate Profile:
${compactCV}
`;

console.log(`🤖 Calling Groq (${modelName})...`);

let chatCompletion = null;
let attempts = 0;
const maxAttempts = 5;

while (attempts < maxAttempts) {
  try {
    chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `JOB DESCRIPTION TO EVALUATE:\n\n${jdText}` }
      ],
      model: modelName,
      temperature: 0.3,
    });
    break; // success
  } catch (err) {
    attempts++;
    const isRateLimit = err.message.includes('429') || err.message.toLowerCase().includes('rate limit') || err.message.toLowerCase().includes('quota') || err.message.includes('413');
    
    if (isRateLimit && attempts < maxAttempts) {
      let waitSeconds = 65;
      const match = err.message.match(/try again in ([\d\.]+)s/);
      if (match) {
        waitSeconds = Math.ceil(parseFloat(match[1])) + 2;
      } else {
        const minMatch = err.message.match(/try again in (\d+)m([\d\.]+)s/);
        if (minMatch) {
          waitSeconds = parseInt(minMatch[1]) * 60 + Math.ceil(parseFloat(minMatch[2])) + 2;
        }
      }
      console.warn(`⚠️ Rate limit hit (attempt ${attempts}/${maxAttempts}). Waiting ${waitSeconds} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
    } else {
      console.error('❌ Groq API error:', err.message);
      process.exit(1);
    }
  }
}

try {
  const evaluationText = chatCompletion.choices[0].message.content;
  console.log('\n' + '═'.repeat(66));
  console.log('  CAREER-OPS EVALUATION — powered by Groq');
  console.log('═'.repeat(66) + '\n');
  console.log(evaluationText);

  const summaryMatch = evaluationText.match(/---SCORE_SUMMARY---\s*([\s\S]*?)---END_SUMMARY---/);
  let company = 'unknown';
  let role = 'unknown';
  let score = '?';
  let archetype = 'unknown';
  let legitimacy = 'unknown';

  if (summaryMatch) {
    const block = summaryMatch[1];
    const extract = (key) => {
      const m = block.match(new RegExp(`${key}:\\s*(.+)`));
      return m ? m[1].trim() : 'unknown';
    };
    company = extract('COMPANY');
    role = extract('ROLE');
    score = extract('SCORE');
    archetype = extract('ARCHETYPE');
    legitimacy = extract('LEGITIMACY');
  }

  if (saveReport) {
    if (!existsSync(PATHS.reports)) {
      mkdirSync(PATHS.reports, { recursive: true });
    }
    const num = nextReportNumber();
    const today = new Date().toISOString().split('T')[0];
    const companySlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = `${num}-${companySlug}-${today}.md`;
    const reportPath = join(PATHS.reports, filename);

    const reportContent = `# Evaluation: ${company} — ${role}

**Date:** ${today}
**Archetype:** ${archetype}
**Score:** ${score}/5
**Legitimacy:** ${legitimacy}
**PDF:** pending
**Tool:** Groq (${modelName})

---

${evaluationText.replace(/---SCORE_SUMMARY---[\s\S]*?---END_SUMMARY---/, '').trim()}
`;

    writeFileSync(reportPath, reportContent, 'utf-8');
    console.log(`\n✅ Report saved: reports/${filename}`);
    console.log(`\n📊 Tracker entry (add to data/applications.md):`);
    console.log(`    | ${num} | ${today} | ${company} | ${role} | ${score}/5 | Evaluated | ❌ | [${num}](reports/${filename}) |`);
  }
} catch (err) {
  console.error('❌ Parsing/Saving failed:', err.message);
  process.exit(1);
}
