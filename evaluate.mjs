import fs from "fs";
import path from "path";
import { Mistral } from "@mistralai/mistralai";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const mistralClient = process.env.MISTRAL_API_KEY ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY }) : null;
const groqClient = process.env.GROQ_API_KEY ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }) : null;
const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const anonProfile = process.env.ANONYMIZED_PROFILE || "CANDIDATE TARGET: Operations Analytics Manager, Senior Data Analyst, Operations Program Manager\nCORE SKILLS: SQL, Python, Power BI, Advanced Excel, Lean Six Sigma Green Belt, ETL data modeling\nEXPERIENCE: 8+ years leading operations and analytics teams (200+ FTEs).\nEDUCATION: MS in Business Analytics, BS in Engineering.";

const systemPrompt = "You are career-ops cloud engine, an AI-powered job search evaluator.\n\nTRAJECTORY AND DOMAIN CHECK (CRITICAL):\nCheck if the role is a pure software engineer/developer, DevOps/reliability engineer, database administrator (DBA), hardware/electrical/mechanical/facilities engineer, QA/tester, IT support technician, recruiter, sales/marketing representative, or generic administrative assistant.\nIf it is ANY of these, you MUST classify the archetype as Trajectory Mismatch, score the role exactly 1.0/5, and recommend SKIP in Block E.\n\nSCORING RULES:\nScore the role from 0.0 to 5.0 based on fit for Operations Analytics Manager / Senior Data Analyst / Operations PM.\n\nREQUIRED OUTPUT STRUCTURE:\nBlock A: Fit & Gap Analysis\nBlock B: Scoring Breakdown (Score from 0.0 to 5.0)\nBlock C: Goal Alignment\nBlock D: Compensation Research\nBlock E: Recommendation (Apply/Hold/Skip)\nBlock F: Tailwind & Interview Prep\nBlock G: Legitimacy (High Confidence / Proceed with Caution / Suspicious)\n\nAt the very end, output this summary block:\n---SCORE_SUMMARY---\nCOMPANY: <company name>\nROLE: <role title>\nSCORE: <global score as decimal, e.g. 4.2>\nARCHETYPE: <detected archetype or Trajectory Mismatch>\nLEGITIMACY: <High Confidence | Proceed with Caution | Suspicious>\n---END_SUMMARY---";

async function callAI(jdText, preferredProvider = "Mistral") {
  const providers = preferredProvider === "Groq" ? [callGroq, callMistral, callGemini]
                  : preferredProvider === "Gemini" ? [callGemini, callMistral, callGroq]
                  : [callMistral, callGroq, callGemini];

  for (const fn of providers) {
    try {
      const res = await fn(jdText);
      if (res) return res;
    } catch (err) {
      console.warn("Provider failed, trying next: " + err.message);
    }
  }
  throw new Error("All AI providers failed.");
}

async function callMistral(jdText) {
  if (!mistralClient) return null;
  const res = await mistralClient.chat.complete({
    model: "mistral-large-latest",
    messages: [
      { role: "system", content: systemPrompt + "\n\nCandidate Profile:\n" + anonProfile },
      { role: "user", content: "JOB DESCRIPTION:\n\n" + jdText }
    ],
    temperature: 0.2
  });
  return { text: res.choices[0].message.content, provider: "Mistral" };
}

async function callGroq(jdText) {
  if (!groqClient) return null;
  const res = await groqClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: systemPrompt + "\n\nCandidate Profile:\n" + anonProfile },
      { role: "user", content: "JOB DESCRIPTION:\n\n" + jdText }
    ],
    temperature: 0.2
  });
  return { text: res.choices[0].message.content, provider: "Groq" };
}

async function callGemini(jdText) {
  if (!geminiClient) return null;
  const model = geminiClient.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = systemPrompt + "\n\nCandidate Profile:\n" + anonProfile + "\n\nJOB DESCRIPTION:\n\n" + jdText;
  const res = await model.generateContent(prompt);
  return { text: res.response.text(), provider: "Gemini" };
}

async function fetchJobFast(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const clean = html.replace(/<script[\s\S]*?<\/script>/gi, "")
                      .replace(/<style[\s\S]*?<\/style>/gi, "")
                      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
                      .replace(/<header[\s\S]*?<\/header>/gi, "")
                      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
                      .replace(/<[^>]+>/g, " ")
                      .replace(/\s+/g, " ").trim();
    return clean.length > 100 ? clean : null;
  } catch (err) {
    return null;
  }
}

async function processJob(item, index, total, stagedDir, additionsDir, today) {
  const providers = ["Mistral", "Groq", "Gemini"];
  const preferred = providers[index % providers.length];
  console.log("[" + (index + 1) + "/" + total + "] Evaluating: " + item.company + " — " + item.role + " via " + preferred);
  let jdText = await fetchJobFast(item.url);
  if (!jdText) {
    jdText = "Company: " + item.company + "\nRole: " + item.role + "\nURL: " + item.url + "\nNote: Fast fetch was blocked or truncated, evaluating role title against target archetypes.";
  }
  try {
    const { text, provider } = await callAI(jdText, preferred);
    const summaryMatch = text.match(/---SCORE_SUMMARY---\s*([\s\S]*?)---END_SUMMARY---/);
    let company = item.company;
    let role = item.role;
    let score = "1.0";
    let archetype = "General";
    let legitimacy = "High Confidence";
    if (summaryMatch) {
      const block = summaryMatch[1];
      const extract = (k) => {
        const m = block.match(new RegExp(k + ":\\s*(.+)"));
        return m ? m[1].trim() : "";
      };
      company = extract("COMPANY") || company;
      role = extract("ROLE") || role;
      score = extract("SCORE") || score;
      archetype = extract("ARCHETYPE") || archetype;
      legitimacy = extract("LEGITIMACY") || legitimacy;
    }
    const slug = (company + "-" + role).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const reportFilename = "staged-" + slug + "-" + Date.now() + ".md";
    const reportFile = stagedDir + "/" + reportFilename;
    const reportContent = "# Evaluation: " + company + " — " + role + "\n\n**Date:** " + today + "\n**Archetype:** " + archetype + "\n**Score:** " + score + "/5\n**Legitimacy:** " + legitimacy + "\n**PDF:** pending\n**Tool:** " + provider + "\n\n---\n\n" + text.replace(/---SCORE_SUMMARY---[\s\S]*?---END_SUMMARY---/, "").trim() + "\n";
    fs.writeFileSync(reportFile, reportContent, "utf8");
    const status = parseFloat(score) >= 4.0 ? "Evaluated" : "SKIP";
    const tsvLine = "AUTO_NUM\t" + today + "\t" + company + "\t" + role + "\t" + status + "\t" + score + "/5\t❌\t[AUTO_NUM](reports/" + reportFilename + ")\tAutomated cloud evaluation (" + provider + ")\n";
    fs.writeFileSync(additionsDir + "/" + slug + "-" + Date.now() + ".tsv", tsvLine, "utf8");
    console.log("✅ Evaluated (" + score + "/5 via " + provider + ") -> " + reportFile);
  } catch (e) {
    console.error("Evaluation error on " + item.role + ": " + e.message);
  }
}

async function main() {
  const pipelinePath = "data/pipeline.md";
  if (!fs.existsSync(pipelinePath)) {
    console.log("No data/pipeline.md found. Nothing to evaluate.");
    return;
  }
  const content = fs.readFileSync(pipelinePath, "utf8");
  const lines = content.split("\n");
  const items = [];
  let inPending = false;
  for (const line of lines) {
    if (line.includes("## Pendientes") || line.includes("## Pending")) { inPending = true; continue; }
    if (line.startsWith("## ") && !line.includes("## Pendientes") && !line.includes("## Pending")) { inPending = false; }
    if (!inPending) continue;
    const urlMatch = line.match(/(https?:\/\/[^\s\|\)]+)/);
    if (urlMatch) {
      const parts = line.split("|").map(p => p.trim());
      items.push({
        url: urlMatch[1],
        company: parts[1] || "Company",
        role: parts[2] || "Role"
      });
    }
  }
  console.log("Found " + items.length + " pending jobs in pipeline.");
  const maxToProcess = items.length;
  console.log("Starting parallel multi-worker pool (concurrency: 5) for " + maxToProcess + " jobs...");
  const stagedDir = "reports/staged";
  const additionsDir = "batch/tracker-additions";
  if (!fs.existsSync(stagedDir)) fs.mkdirSync(stagedDir, { recursive: true });
  if (!fs.existsSync(additionsDir)) fs.mkdirSync(additionsDir, { recursive: true });
  const today = new Date().toISOString().split("T")[0];

  const concurrency = 8;
  let activeIndex = 0;
  async function worker() {
    while (activeIndex < maxToProcess) {
      const idx = activeIndex++;
      await processJob(items[idx], idx, maxToProcess, stagedDir, additionsDir, today);
    }
  }
  const pool = Array.from({ length: concurrency }, () => worker());
  await Promise.all(pool);
  console.log("Parallel evaluation batch complete!");
}

main().catch(console.error);