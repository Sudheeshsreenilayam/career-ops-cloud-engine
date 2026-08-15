#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { GoogleGenerativeAI } from '@google/generative-ai';

try {
  const { config } = await import('dotenv');
  config();
} catch {}

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORTALS_PATH = resolve(ROOT, 'portals.yml');
const TRACKER_PATH = resolve(ROOT, 'data/applications.md');

// 1. Parse unique companies from applications.md
function getTrackerCompanies() {
  if (!existsSync(TRACKER_PATH)) return [];
  const text = readFileSync(TRACKER_PATH, 'utf-8');
  const lines = text.split('\n');
  const companies = new Set();
  
  for (const line of lines) {
    if (line.trim().startsWith('|') && !line.includes('Company') && !line.includes('---|')) {
      const parts = line.split('|');
      if (parts.length > 3) {
        const company = parts[3].trim();
        if (company && company !== '#' && company !== '---') {
          companies.add(company);
        }
      }
    }
  }
  return Array.from(companies);
}

// 2. Parse currently tracked companies from portals.yml
function getTrackedCompanies() {
  if (!existsSync(PORTALS_PATH)) return [];
  const text = readFileSync(PORTALS_PATH, 'utf-8');
  try {
    const parsed = yaml.load(text);
    return parsed.tracked_companies || [];
  } catch (e) {
    console.error('Error parsing portals.yml:', e.message);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');

  const trackerCompanies = getTrackerCompanies();
  const trackedList = getTrackedCompanies();
  const trackedNames = new Set(trackedList.map(c => c.name.toLowerCase()));

  const missing = trackerCompanies.filter(c => !trackedNames.has(c.toLowerCase()));

  if (checkOnly) {
    if (missing.length > 0) {
      console.log(`⚠️  Found ${missing.length} new companies in applications.md not tracked in portals.yml.`);
      console.log(`Run 'node sync-portals.mjs' to resolve their career pages and add them.`);
      process.exit(0);
    } else {
      // Silent exit when fully synchronized
      process.exit(0);
    }
  }

  if (missing.length === 0) {
    console.log('✅ Portals list is fully synchronized with your application history!');
    process.exit(0);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY not found in environment or .env file.');
    process.exit(1);
  }

  console.log(`🔄 Resolving career page URLs for ${missing.length} missing companies via Gemini...`);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a career portal assistant. For the following list of company names, resolve their official Careers Page URL (prioritize their direct Greenhouse/Lever/Ashby board URLs if they use them, otherwise use their branded careers page URL).
Output ONLY a raw JSON array matching this format:
[
  { "name": "Company Name", "careers_url": "https://...", "notes": "Short description of what company does" }
]

Do not wrap it in markdown block quotes. Just output raw JSON.

Companies to resolve:
${JSON.stringify(missing, null, 2)}`;

  try {
    const result = await model.generateContent(prompt);
    let textResult = result.response.text().trim();
    if (textResult.startsWith('```json')) {
      textResult = textResult.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (textResult.startsWith('```')) {
      textResult = textResult.replace(/^```/, '').replace(/```$/, '').trim();
    }
    
    const resolved = JSON.parse(textResult);
    
    // Read portals.yml content again to append safely
    let portalsText = readFileSync(PORTALS_PATH, 'utf-8');
    
    // Parse portals to check where tracked_companies ends or format
    const parsed = yaml.load(portalsText);
    if (!parsed.tracked_companies) {
      parsed.tracked_companies = [];
    }
    
    for (const item of resolved) {
      // Validate schema
      if (!item.name || !item.careers_url) continue;
      const companyEntry = {
        name: item.name,
        careers_url: item.careers_url,
        enabled: true
      };
      if (item.notes) {
        companyEntry.notes = item.notes;
      }
      parsed.tracked_companies.push(companyEntry);
      console.log(`➕ Added ${item.name} -> ${item.careers_url}`);
    }

    writeFileSync(PORTALS_PATH, yaml.dump(parsed, { indent: 2, lineWidth: -1 }), 'utf8');
    console.log(`\n🎉 Successfully synchronized and updated portals.yml!`);
  } catch (err) {
    console.error('Error synchronizing portals:', err);
    process.exit(1);
  }
}

main();
