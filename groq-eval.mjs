#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const ROOT = dirname(fileURLToPath(import.meta.url));

const PATHS = {
  shared:  join(ROOT, 'modes', '_shared.md'),
  oferta:  join(ROOT, 'modes', 'oferta.md'),
  cv:      join(ROOT, 'cv.md'),
  reports: join(ROOT, 'reports'),
};

const args = process.argv.slice(2);
let jdText = '';
let saveReport = true;
let modelName = 'llama-3.1-8b-instant';

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
  } else if (args[i] === '--model' && args[i + 1]) {
    modelName = args[i + 1];
    i++;
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

function readFile(path, label) {
  if (!existsSync(path)) {
    console.warn(`⚠️ ${label} not found at: ${path}`);
    return `[${label} not found — skipping]`;
  }
  return readFileSync(path, 'utf-8').trim();
}

function nextReportNumber() {
  if (!existsSync(PATHS.reports)) return '001';
  const files = readdirSync(PATHS.reports)
    .filter(f => /^\d{3}-/.test(f))
    .map(f => parseInt(f.slice(0, 3)))
    .filter(n => !isNaN(n));
  if (files.length === 0) return '001';
  return String(Math.max(...files) + 1).padStart(3, '0');
}

console.log('📂 Loading context files...');
const sharedContext = readFile(PATHS.shared, 'modes/_shared.md');
const ofertaLogic = readFile(PATHS.oferta, 'modes/oferta.md');
const cvContent = readFile(PATHS.cv, 'cv.md');

const systemPrompt = `You are career-ops, an AI-powered job search assistant.
You evaluate job offers against the user's CV using a structured A-G scoring system.

Your evaluation methodology is defined below. Follow it exactly.

SYSTEM CONTEXT (_shared.md)
${sharedContext}

EVALUATION MODE (oferta.md)
${ofertaLogic}

CANDIDATE RESUME (cv.md)
${cvContent}

IMPORTANT OPERATING RULES FOR THIS CLI SESSION
1. You do NOT have access to WebSearch, Playwright, or file writing tools.
2. Generate Blocks A through G in full, in English.
3. CONCISENESS (MANDATORY): Keep all explanations, findings, bullet points, and descriptions brief (1-2 sentences max per item).
4. BUG AVOIDANCE (INFINITE LOOPS): Do NOT output the pipe character (|) or generate markdown tables anywhere in your response.
5. At the very end, output a machine-readable summary block in this exact format:

---SCORE_SUMMARY---
COMPANY: <company name or "Unknown">
ROLE: <role title>
SCORE: <global score as decimal, e.g. 3.8>
ARCHETYPE: <detected archetype>
LEGITIMACY: <High Confidence | Proceed with Caution | Suspicious>
---END_SUMMARY---
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
    const isRateLimit = err.message.includes('429') || err.message.toLowerCase().includes('rate limit') || err.message.toLowerCase().includes('quota');
    if (isRateLimit && attempts < maxAttempts) {
      // Parse retry-after from error or default to 65 seconds (Groq TPM reset is 60s)
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
  console.error('❌ Groq API error:', err.message);
  process.exit(1);
}
