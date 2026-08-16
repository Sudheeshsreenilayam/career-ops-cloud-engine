#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

dotenv.config();

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORTALS_PATH = resolve(ROOT, 'portals.yml');
const TRACKER_PATH = resolve(ROOT, 'data/applications.md');

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

function getTrackedCompanies() {
  if (!existsSync(PORTALS_PATH)) return [];
  const text = readFileSync(PORTALS_PATH, 'utf-8');
  try {
    const parsed = yaml.load(text);
    return parsed.tracked_companies || [];
  } catch (e) {
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
    } else {
      console.log('✅ portals.yml is 100% synchronized with applications.md!');
    }
    process.exit(0);
  }

  if (missing.length === 0) {
    console.log('✅ Portals list is fully synchronized with your application history!');
    process.exit(0);
  }

  const apiKey = process.env.MISTRAL_API_KEY || 'wm3TMobvoT28XrcrYk1yxnPsxrWMldXz';
  console.log(`🔄 Resolving career page URLs for ${missing.length} missing companies via AI...`);
  const client = new Mistral({ apiKey });

  const prompt = `For the following list of company names, resolve their official Careers Page URL (prioritize direct Greenhouse, Lever, Ashby, or Workday endpoints if applicable).
Output format must be a JSON object with a "companies" array:
{
  "companies": [
    { "name": "Company Name", "careers_url": "https://...", "notes": "Short business description" }
  ]
}

Companies to resolve:
${JSON.stringify(missing, null, 2)}`;

  try {
    const result = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' }
    });

    const parsedData = JSON.parse(result.choices[0].message.content.trim().replace(/^```json|```$/gi, '').trim());
    const resolved = parsedData.companies || [];

    const portalsText = readFileSync(PORTALS_PATH, 'utf-8');
    const parsed = yaml.load(portalsText);
    if (!parsed.tracked_companies) {
      parsed.tracked_companies = [];
    }

    for (const item of resolved) {
      if (!item.name || !item.careers_url) continue;
      const companyEntry = {
        name: item.name,
        careers_url: item.careers_url,
        enabled: true,
        notes: item.notes || 'Automated sync'
      };
      parsed.tracked_companies.push(companyEntry);
      console.log(`➕ Added ${item.name} -> ${item.careers_url}`);
    }

    writeFileSync(PORTALS_PATH, yaml.dump(parsed, { indent: 2, lineWidth: -1 }), 'utf8');
    console.log(`\n🎉 Successfully synchronized and updated portals.yml!`);
  } catch (err) {
    console.error('Error synchronizing portals:', err.message);
    process.exit(1);
  }
}

main();
