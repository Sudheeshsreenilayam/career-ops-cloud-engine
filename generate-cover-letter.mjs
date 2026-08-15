#!/usr/bin/env node
/**
 * generate-cover-letter.mjs — Render a cover letter payload to LaTeX PDF.
 *
 * Usage:
 *   node generate-cover-letter.mjs --payload payload.json
 *   node generate-cover-letter.mjs --payload payload.json --out output/path.pdf
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { parseArgs } from "util";
import { resolveTemplate } from "./cv-templates.mjs";

const OUTPUT_ROOT = resolve("output");
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE = resolve(SCRIPT_DIR, "templates", "cover-letter-template.tex");

function safeOutputPath(raw) {
  const filename = basename(raw).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.{2,}/g, "-");
  return join(OUTPUT_ROOT, filename);
}

function slugify(value, fallback = "item") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || fallback;
}

function escapeLatex(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([{}%$#_&])/g, "\\$1")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}");
}

function sanitizeUrl(value) {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) return "";
  return url.replace(/[{}<>|\\\s]/g, "");
}

function renderBullets(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items.map(item => {
    const lead = escapeLatex((item.lead || "").replace(/,\s*$/, ""));
    const impact = escapeLatex(item.impact || "");
    return `    \\item \\textbf{${lead},} ${impact}`;
  }).join("\n");
}

function renderFootnotes(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items.map(item => `\\noindent\\footnotesize ${escapeLatex(item)}\\par`).join("\n");
}

function buildLatex(payload, templatePath) {
  const candidate = payload.candidate || {};
  const letter = payload.letter || {};

  let tex = readFileSync(templatePath, "utf-8");
  const email = candidate.email || "";
  const linkedin = candidate.linkedin || "";
  const github = candidate.github || "";
  const replacements = {
    "{{NAME}}": escapeLatex(candidate.name || ""),
    "{{CONTACT_LINE}}": escapeLatex([candidate.location, email, candidate.phone].filter(Boolean).join(" | ")),
    "{{EMAIL}}": escapeLatex(email),
    "{{LINKEDIN_URL}}": sanitizeUrl(linkedin) || "",
    "{{LINKEDIN_DISPLAY}}": escapeLatex(linkedin.replace(/^https?:\/\//, "")),
    "{{GITHUB_URL}}": sanitizeUrl(github) || "",
    "{{GITHUB_DISPLAY}}": escapeLatex(github.replace(/^https?:\/\//, "")),
    "{{DATE}}": escapeLatex(letter.date || ""),
    "{{COMPANY}}": escapeLatex(letter.company || ""),
    "{{ADDRESS}}": escapeLatex([letter.city, "(Remote)"].filter(Boolean).join(" ")),
    "{{GREETING_BLOCK}}": letter.greeting ? `\\noindent ${escapeLatex(letter.greeting)} \\\\` : "",
    "{{OPENING}}": letter.opening ? `\\noindent ${escapeLatex(letter.opening)}` : "",
    "{{PROFILE_INTRO}}": letter.profile_intro ? `\\noindent ${escapeLatex(letter.profile_intro)}` : "",
    "{{ACHIEVEMENTS_BLOCK}}": renderBullets(letter.achievements),
    "{{PROBLEMS_BLOCK}}": letter.problems_section ? `\\noindent ${escapeLatex(letter.problems_section)}` : "",
    "{{CLOSING_BLOCK}}": letter.closing ? `\\noindent ${escapeLatex(letter.closing)}` : "",
    "{{LANGUAGE_CLOSING_BLOCK}}": letter.language_closing ? `\\noindent \\textit{${escapeLatex(letter.language_closing)}}` : "",
    "{{FOOTNOTES_BLOCK}}": renderFootnotes(letter.footnotes),
  };

  for (const [token, value] of Object.entries(replacements)) {
    tex = tex.replaceAll(token, value);
  }

  return tex;
}

function sanitizeJSON(rawText) {
  let cleaned = rawText.trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  return cleaned;
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      payload: { type: "string" },
      out: { type: "string" },
      report: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
  });

  if (args.help || !args.payload) {
    console.log("Usage: node generate-cover-letter.mjs --payload payload.json [--out output/path.pdf]");
    process.exit(args.help ? 0 : 1);
  }

  const payloadPath = resolve(args.payload);
  if (!existsSync(payloadPath)) {
    console.error(`ERROR: payload file not found: ${payloadPath}`);
    process.exit(1);
  }

  const raw = readFileSync(payloadPath, "utf-8");
  const payload = JSON.parse(sanitizeJSON(raw));
  const templatePath = resolveTemplate("cover", payload.template, { format: "tex", fallback: true }) || DEFAULT_TEMPLATE;

  if (args.out) payload.output_path = args.out;
  const company = slugify(payload.letter?.company, "company");
  const role = slugify(payload.letter?.role_title, "role");
  if (args.report) {
    payload.output_path = join(OUTPUT_ROOT, `${args.report}-${company}-${role}-cover-letter.pdf`);
  } else if (!payload.output_path) {
    payload.output_path = join(OUTPUT_ROOT, `cv-sudheesh-sreenilayam-${company}-${role}-cover.pdf`);
  } else {
    payload.output_path = safeOutputPath(payload.output_path);
  }

  if (!existsSync(OUTPUT_ROOT)) mkdirSync(OUTPUT_ROOT, { recursive: true });

  const texPath = payload.output_path.replace(/\.pdf$/i, ".tex");
  const tex = buildLatex(payload, existsSync(templatePath) ? templatePath : DEFAULT_TEMPLATE);
  writeFileSync(texPath, tex, "utf-8");

  const { execFileSync } = await import("child_process");
  const nodeBin = process.execPath;
  execFileSync(nodeBin, [resolve(SCRIPT_DIR, "generate-latex.mjs"), texPath, payload.output_path, "--compile-only"], { stdio: "inherit" });
  console.log(`\nCover letter PDF: ${payload.output_path}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
