#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { resolve } from 'path';

// Helper to parse dates from string like "Sep 2023 - Aug 2024" or "Oct 2024 - May 9, 2026"
function parseDateString(dateStr) {
  if (!dateStr) return new Date(0);
  
  // Extract the end date (second part of range)
  const parts = dateStr.split('-');
  const endPart = (parts[1] || parts[0]).trim();

  if (endPart.toLowerCase() === 'present') {
    return new Date(); // Current date for Present
  }

  // Matches Month Year or Month Day, Year
  // Examples: "Aug 2024", "May 9, 2026", "Nov 2019"
  const cleanEnd = endPart.replace(/,/g, '');
  const tokens = cleanEnd.split(/\s+/);
  
  let month = tokens[0];
  let year = tokens[tokens.length - 1];

  const monthsMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const monthIdx = monthsMap[month.toLowerCase().substring(0, 3)] || 0;
  const parsedYear = parseInt(year, 10) || 1970;

  return new Date(parsedYear, monthIdx, 1);
}

async function verifyCompliance(filePath) {
  const absPath = resolve(filePath);
  const raw = await readFile(absPath, 'utf-8');
  const payload = JSON.parse(raw);

  const errors = [];

  // 1. Work Experience Chronological Order Check
  if (Array.isArray(payload.experience)) {
    let lastDate = new Date(8640000000000000); // Max Date
    for (let i = 0; i < payload.experience.length; i++) {
      const exp = payload.experience[i];
      const endDate = parseDateString(exp.dates);
      
      if (endDate > lastDate) {
        errors.push(`[CHRONOLOGY ERROR] Experience is not in reverse chronological order: "${exp.role}" (${exp.dates}) is newer than the preceding entry.`);
      }
      lastDate = endDate;
    }
  }

  // 2. Banned Contact Auditing Terms Check
  const bannedAuditRegex = /\b(audit|audited)\s+\d+[\s,]*\d*\s+(contact|shipment|log|record)/i;
  if (Array.isArray(payload.experience)) {
    for (const exp of payload.experience) {
      if (Array.isArray(exp.bullets)) {
        for (const bullet of exp.bullets) {
          if (bannedAuditRegex.test(bullet)) {
            errors.push(`[BANNED CONTENT ERROR] Bullet in "${exp.role}" violates the "No Contact Audits" rule: "${bullet}"`);
          }
        }
      }
    }
  }

  // 3. Certifications Check
  if (!Array.isArray(payload.certifications) || payload.certifications.length === 0) {
    errors.push(`[CERTIFICATIONS ERROR] "certifications" list must exist and not be empty to prevent LaTeX template compilation failures.`);
  }

  // 4. Metric Bolding Highlighting Check
  // Finds numbers (with optional $, K, M, %, FTE, LOB, weeks, months, years) that are NOT wrapped in <strong> tags
  const metricRegex = /\b(?<!<strong>)(?:\$\d+(?:\.\d+)?(?:K|M)?|\d+(?:\.\d+)?%|\d+\+?\s+(?:FTE|LOB|weeks|months|years|consecutive|vendor|citations))(?!<\/strong>)\b/g;
  if (Array.isArray(payload.experience)) {
    for (const exp of payload.experience) {
      if (Array.isArray(exp.bullets)) {
        for (const bullet of exp.bullets) {
          const matches = bullet.match(metricRegex);
          if (matches) {
            errors.push(`[HIGHLIGHTING WARNING] Unbolded metrics found in "${exp.role}": ${matches.join(', ')} (Wrap in <strong> tags).`);
          }
        }
      }
    }
  }

  // 5. Summary Custom Rules Check
  if (!payload.summary_text) {
    errors.push(`[SUMMARY ERROR] "summary_text" is missing.`);
  } else {
    // Check for bold highlights in the summary
    const summaryBolds = payload.summary_text.match(/<strong>.*?<\/strong>/g);
    if (!summaryBolds || summaryBolds.length < 3) {
      errors.push(`[SUMMARY WARNING] Summary text does not have enough bold highlights (found ${summaryBolds ? summaryBolds.length : 0}, target >= 3).`);
    }
    // Check for banned corporate-speak or AI slop
    const bannedAIWords = ['delve', 'tapestry', 'realm', 'testament', 'pivotal', 'passionate about', 'results-oriented'];
    for (const word of bannedAIWords) {
      if (payload.summary_text.toLowerCase().includes(word)) {
        errors.push(`[AI SLOP ERROR] Summary text contains banned AI vocabulary: "${word}"`);
      }
    }
  }

  // 6. Project Selection Rules Check
  if (Array.isArray(payload.projects)) {
    if (payload.projects.length !== 3) {
      errors.push(`[PROJECT ERROR] Exactly 3 projects must be selected (found ${payload.projects.length}).`);
    }

    const academicTitles = [
      "Superstore Profitability & Strategic Recovery (Capstone)",
      "SocialSphere Strategic Turnaround (Cyber Ethics & Law)",
      "Fake Job Posting Detection (Machine Learning)",
      "Distributed Systems & MapReduce Implementation"
    ];

    const nonAcademicTitles = [
      "LCA Mission Control / Agentic Intelligence Engine",
      "Chicago 311 Accountability Dashboard"
    ];

    let academicEnded = false;
    let nonAcademicCount = 0;

    for (let i = 0; i < payload.projects.length; i++) {
      const proj = payload.projects[i];
      
      // Project URL existence check
      if (!proj.url || proj.url.trim() === '') {
        errors.push(`[PROJECT URL ERROR] Project "${proj.name}" is missing a valid URL property.`);
      }

      const isAcademic = academicTitles.some(t => proj.name.includes(t) || t.includes(proj.name));
      const isNonAcademic = nonAcademicTitles.some(t => proj.name.includes(t) || t.includes(proj.name));

      if (isAcademic) {
        if (academicEnded) {
          errors.push(`[PROJECT STRUCTURAL ERROR] Academic project "${proj.name}" is placed after a non-academic project. Academic projects must be placed first.`);
        }
      } else if (isNonAcademic) {
        academicEnded = true;
        nonAcademicCount++;
      }
    }

    if (nonAcademicCount > 1) {
      errors.push(`[PROJECT COMPLIANCE ERROR] Found ${nonAcademicCount} non-academic projects. You can only place the single strongest non-academic project at the end.`);
    }
  }

  // 8. Strict Work Experience Bullet Budgets Check
  if (Array.isArray(payload.experience)) {
    for (const exp of payload.experience) {
      const roleLower = exp.role.toLowerCase();
      const bulletsCount = Array.isArray(exp.bullets) ? exp.bullets.length : 0;

      if (roleLower.includes('graduate assistant') && bulletsCount !== 2) {
        errors.push(`[BUDGET ERROR] "Graduate Assistant" role must have exactly 2 bullets (found ${bulletsCount}).`);
      } else if (roleLower.includes('senior associate manager') && bulletsCount !== 4) {
        errors.push(`[BUDGET ERROR] "Senior Associate Manager" role must have exactly 4 bullets (found ${bulletsCount}).`);
      } else if (roleLower.includes('associate manager') && !roleLower.includes('senior') && bulletsCount !== 3) {
        errors.push(`[BUDGET ERROR] "Associate Manager" role must have exactly 3 bullets (found ${bulletsCount}).`);
      } else if (roleLower.includes('early career') && bulletsCount !== 2) {
        errors.push(`[BUDGET ERROR] "Early Career" role must have exactly 2 bullets (found ${bulletsCount}).`);
      }
    }
  }

  // 9. Banned Words & Slop Checker in Bullets
  const bannedVerbs = ['accomplished', 'spearheaded', 'facilitated', 'leveraged', 'synergies', 'robust', 'seamless', 'cutting-edge', 'innovative'];
  if (Array.isArray(payload.experience)) {
    for (const exp of payload.experience) {
      if (Array.isArray(exp.bullets)) {
        for (const bullet of exp.bullets) {
          if (bullet.toLowerCase().includes('as measured by')) {
            errors.push(`[SLOP ERROR] Bullet in "${exp.role}" contains banned verbatim phrase "as measured by".`);
          }
          const cleanText = bullet.replace(/<[^>]*>/g, '').trim();
          const firstWord = cleanText.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
          if (firstWord === 'accomplished') {
            errors.push(`[SLOP ERROR] Bullet in "${exp.role}" starts with banned verb "Accomplished".`);
          }
          for (const verb of bannedVerbs) {
            if (cleanText.toLowerCase().includes(verb) && verb !== 'accomplished') {
              errors.push(`[SLOP ERROR] Bullet in "${exp.role}" contains banned word/cliché "${verb}".`);
            }
          }
        }
      }
    }
  }

  return errors;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node verify-resume-compliance.mjs <cv-payload.json>");
  process.exit(1);
}

verifyCompliance(args[0])
  .then(errors => {
    if (errors.length > 0) {
      console.error("\n❌ Compliance check failed! The following rule violations were detected:");
      errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    } else {
      console.log("\n✅ Compliance check passed! All structural, chronological, and formatting rules satisfied.");
      process.exit(0);
    }
  })
  .catch(err => {
    console.error(`Verification error: ${err.message}`);
    process.exit(1);
  });
