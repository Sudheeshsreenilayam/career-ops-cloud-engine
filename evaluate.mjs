import fs from "fs";
import path from "path";
import { Mistral } from "@mistralai/mistralai";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { chromium } from "playwright";

dotenv.config();

const mistralClient = process.env.MISTRAL_API_KEY ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY }) : null;
const groqClient = process.env.GROQ_API_KEY ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }) : null;
const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const anonProfile = process.env.ANONYMIZED_PROFILE || "CANDIDATE TARGET: Operations Analytics Manager, Senior Data Analyst, Operations Program Manager\nCORE SKILLS: SQL, Python, Power BI, Advanced Excel, Lean Six Sigma Green Belt, ETL data modeling\nEXPERIENCE: 8+ years leading operations and analytics teams (200+ FTEs).\nEDUCATION: MS in Business Analytics, BS in Engineering.";

const systemPrompt = "You are career-ops cloud engine, an AI-powered job search evaluator.\n\nTRAJECTORY AND DOMAIN CHECK (CRITICAL):\nCheck if the role is a pure software engineer/developer, DevOps/reliability engineer, database administrator (DBA), hardware/electrical/mechanical/facilities engineer, QA/tester, IT support technician, recruiter, sales/marketing representative, or generic administrative assistant.\nIf it is ANY of these, you MUST classify the archetype as Trajectory Mismatch, score the role exactly 1.0/5, and recommend SKIP in Block E.\n\nSCORING RULES:\nScore the role from 0.0 to 5.0 based on fit for Operations Analytics Manager / Senior Data Analyst / Operations PM.\n\nREQUIRED OUTPUT STRUCTURE:\nBlock A: Fit & Gap Analysis\nBlock B: Scoring Breakdown (Score from 0.0 to 5.0)\nBlock C: Goal Alignment\nBlock D: Compensation Research\nBlock E: Recommendation (Apply/Hold/Skip)\nBlock F: Tailwind & Interview Prep\nBlock G: Legitimacy (High Confidence / Proceed with Caution / Suspicious)\n\nAt the very end, output this summary block:\n---SCORE_SUMMARY---\nCOMPANY: <company name>\nROLE: <role title>\nSCORE: <global score as decimal, e.g. 4.2>\nARCHETYPE: <detected archetype or Trajectory Mismatch>\nLEGITIMACY: <High Confidence | Proceed with Caution | Suspicious>\n---END_SUMMARY---";

async function callAI(jdText) {
  if (mistralClient) {
    try {
      const res = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt + "\n\nCandidate Profile:\n" + anonProfile },
          { role: "user", content: "JOB DESCRIPTION:\n\n" + jdText }
        ],
        temperature: 0.2
      });
      return { text: res.choices[0].message.content, provider: "Mistral" };
    } catch (err) {
      console.warn("Mistral failed, falling back to Groq: " + err.message);
    }
  }
  if (groqClient) {
    try {
      const res = await groqClient.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt + "\n\nCandidate Profile:\n" + anonProfile },
          { role: "user", content: "JOB DESCRIPTION:\n\n" + jdText }
        ],
        temperature: 0.2
      });
      return { text: res.choices[0].message.content, provider: "Groq" };
    } catch (err) {
      console.warn("Groq failed, falling back to Gemini: " + err.message);
    }
  }
  if (geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = systemPrompt + "\n\nCandidate Profile:\n" + anonProfile + "\n\nJOB DESCRIPTION:\n\n" + jdText;
      const res = await model.generateContent(prompt);
      return { text: res.response.text(), provider: "Gemini" };
    } catch (err) {
      console.error("All AI providers failed: " + err.message);
      throw err;
    }
  }
  throw new Error("No AI provider keys configured.");
}

async function scrapeJob(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => {
      const root = document.querySelector("main, article") || document.body;
      const clone = root.cloneNode(true);
      clone.querySelectorAll("script, style, nav, header, footer, noscript").forEach(el => el.remove());
      return clone.innerText || "";
    });
    return bodyText.trim();
  } catch (err) {
    console.error("Scraping failed for " + url + ": " + err.message);
    return null;
  } finally {
    await browser.close();
  }
}

async function main() {
  const pipelinePath = "data/pipeline.md";
  if (!fs.existsSync(pipelinePath)) {
    console.log("No data/pipeline.md found. Nothing to evaluate.");
    return;
  }
  const content = fs.readFileSync(pipelinePath, "utf8");
  const pendingSection = content.split("## Procesadas")[0];
  const urls = [...pendingSection.matchAll(/-\s*(https?:\/\/[^\s\)]+)/g)].map(m => m[1]);
  console.log("Found " + urls.length + " pending jobs to evaluate.");
  const stagedDir = "reports/staged";
  const additionsDir = "batch/tracker-additions";
  if (!fs.existsSync(stagedDir)) fs.mkdirSync(stagedDir, { recursive: true });
  if (!fs.existsSync(additionsDir)) fs.mkdirSync(additionsDir, { recursive: true });
  const today = new Date().toISOString().split("T")[0];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log("\n[" + (i + 1) + "/" + urls.length + "] Evaluating: " + url);
    const jdText = await scrapeJob(url);
    if (!jdText || jdText.length < 100) {
      console.warn("Skipping due to empty/blocked scraping.");
      continue;
    }
    try {
      const { text, provider } = await callAI(jdText);
      const summaryMatch = text.match(/---SCORE_SUMMARY---\s*([\s\S]*?)---END_SUMMARY---/);
      let company = "company";
      let role = "role";
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
      console.error("Evaluation error: " + e.message);
    }
  }
}

main().catch(console.error);