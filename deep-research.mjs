#!/usr/bin/env node
/**
 * deep-research.mjs — Gemini Search-Grounded Deep Research Agent
 *
 * Implements Karpathy-style automated research using Gemini's native
 * Google Search Grounding. Recursively searches, compiles, and writes
 * a high-fidelity company dossier to interview-prep/.
 *
 * Usage:
 *   node deep-research.mjs "Walgreens"
 *   node deep-research.mjs "Walmart, Senior Data Analyst"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Bootstrap: load .env before anything else
// ---------------------------------------------------------------------------
try {
  const { config } = await import('dotenv');
  config();
} catch {
  // dotenv is optional
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import jsYaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT = dirname(fileURLToPath(import.meta.url));
const PATHS = {
  profile: join(ROOT, 'config', 'profile.yml'),
  intelDir: join(ROOT, 'interview-prep'),
};

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║        career-ops — Gemini Auto Deep Research Agent             ║
╚══════════════════════════════════════════════════════════════════╝

  Recursively research a company and role using Google Search grounding.

  USAGE
    node deep-research.mjs "<Company Name>"
    node deep-research.mjs "<Company>, <Role/Team>"

  EXAMPLES
    node deep-research.mjs "Walgreens"
    node deep-research.mjs "Walgreens, Patient Engagement BA"
`);
  process.exit(0);
}

const target = args.join(' ').trim();
const companyName = target.split(',')[0].trim();

// ---------------------------------------------------------------------------
// Validate environment
// ---------------------------------------------------------------------------
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌  GEMINI_API_KEY not found in .env or environment variables.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load User Profile Context (for personalization)
// ---------------------------------------------------------------------------
let candidateContext = '';
if (existsSync(PATHS.profile)) {
  try {
    const profileText = readFileSync(PATHS.profile, 'utf-8');
    const profile = jsYaml.load(profileText);
    if (profile && profile.candidate) {
      candidateContext = `
CANDIDATE PROFILE CONTEXT:
- Name: ${profile.candidate.full_name}
- Target Roles: ${profile.targets?.roles?.join(', ') || 'Business Analyst'}
- Relocation: ${profile.work_preferences?.relocation ? 'Yes' : 'No'}
- Superpower: ${profile.narrative?.superpower || ''}
- Core Achievements:
${profile.narrative?.proof_points?.map(p => `  * ${p}`).join('\n') || ''}
`;
    }
  } catch (err) {
    console.warn('⚠️  Could not load profile.yml context, proceeding with default parameters.');
  }
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------
const systemPrompt = `You are the career-ops Auto Research Agent.
Your task is to perform exhaustive, multi-pass search-grounded deep research on the target company and role.

You have access to Google Search grounding. Use it to find up-to-date, cited, and verified facts.

RESEARCH TARGET: ${target}
${candidateContext}

Verify and document findings across these four required areas:
1. Financial Health & PMF: Crunchbase status, funding rounds, strategic expansions, revenue patterns, and overall stability.
2. Technical Stack & MFC Operations: Specific databases (PostgreSQL, Snowflake, SQL Server), project management suites (ADO, Jira), languages, and workflows. Decode any proprietary software dependencies.
3. H-1B & Visa Salary Benchmarks: Search public LCA disclosure records (e.g. h1bdata.info or myvisajobs) to find actual approved base salaries for this company, role, and location (primarily Deerfield, IL or Frisco, TX).
4. Culture & Layoffs: Glassdoor sentiment, Blind discussions, Reddit threads, and recent reorganization or layoff news.

Output a highly detailed Markdown dossier matching this exact template:

# Deep Intel Dossier: ${companyName}

**Date Compiled:** ${new Date().toISOString().split('T')[0]}
**Target Research:** ${target}
**Source:** Gemini Search Grounding

---

## 1. Financial Health & Strategic Focus
*Deep analysis of the business model, strategic initiatives, expansion plans, and overall organizational stability.*

## 2. Technical Stack & Operations Architecture
*Detailed audit of their systems, database configurations, project management platforms, and operational workflows.*

## 3. Compensation & H-1B Visa Salary Benchmarks
*Actual base salary ranges for this company and role, citing real LCA filings and levels platforms.*

## 4. Organizational Culture & Layoff Signals
*Summarize employee work-life balance, cultural indicators, recent layoff actions, or departmental restructuring.*

## 5. Strategic Interview Leverage Hooks
*3-4 highly specific technical or operational issues currently facing this team, mapped to how the candidate can position their background as the exact solution (highlighting their specific achievements in the candidate context above).*
`;

// ---------------------------------------------------------------------------
// Execute Research Call
// ---------------------------------------------------------------------------
console.log(`\n🔍  Initializing Deep Research Loop for: "${target}"`);
console.log('🤖  Activating Gemini 2.0 Google Search Grounding...');

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  // Enable Google Search grounding tool natively
  tools: [{ googleSearch: {} }],
});

try {
  const result = await model.generateContent(systemPrompt);
  const responseText = result.response.text();

  // Ensure output directory exists
  if (!existsSync(PATHS.intelDir)) {
    mkdirSync(PATHS.intelDir, { recursive: true });
  }

  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `${companySlug}-deep-intel.md`;
  const outputPath = join(PATHS.intelDir, filename);

  // Write dossier
  writeFileSync(outputPath, responseText, 'utf-8');
  console.log(`\n✅  Deep Research Completed!`);
  console.log(`📂  Dossier written to: interview-prep/${filename}\n`);

  // Display summary block
  console.log('═'.repeat(66));
  console.log('  STRATEGIC INTERVIEW HOOKS PREVIEW');
  console.log('═'.repeat(66));
  const hooksMatch = responseText.match(/## 5\. Strategic Interview Leverage Hooks([\s\S]*)/);
  if (hooksMatch) {
    console.log(hooksMatch[1].trim());
  } else {
    console.log('Research complete. View the full file to see your tailored strategy.');
  }
  console.log('─'.repeat(66) + '\n');

} catch (err) {
  console.error('\n❌  Deep Research execution failed:', err.message);
  process.exit(1);
}
