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

const systemPrompt = `You are career-ops cloud engine, an AI-powered job search evaluator.

TRAJECTORY AND DOMAIN CHECK (CRITICAL):
Check if the role is a pure software engineer/developer, DevOps/reliability engineer, database administrator (DBA), hardware/electrical/mechanical/facilities engineer, QA/tester, IT support technician, recruiter, sales/marketing representative, or generic administrative assistant.
If it is ANY of these, you MUST classify the archetype as Trajectory Mismatch, score the role exactly 1.0/5, and recommend SKIP in Block E.

SCORING RULES:
Score the role from 0.0 to 5.0 based on fit for Operations Analytics Manager / Senior Data Analyst / Operations PM.

REQUIRED OUTPUT STRUCTURE:
Block A: Fit & Gap Analysis
Block B: Scoring Breakdown (Score from 0.0 to 5.0)
Block C: Goal Alignment
Block D: Compensation Research
Block E: Recommendation (Apply/Hold/Skip)
Block F: Tailwind & Interview Prep
Block G: Legitimacy (High Confidence / Proceed with Caution / Suspicious)

At the very end, output this summary block:
---SCORE_SUMMARY---
COMPANY: <company name>
ROLE: <role title>
SCORE: <global score as decimal, e.g. 4.2>
ARCHETYPE: <detected archetype or Trajectory Mismatch>
LEGITIMACY: <High Confidence | Proceed with Caution | Suspicious>
---END_SUMMARY---`;

async function callAI(jdText) {
  const providers = [
    { name: "Mistral", fn: callMistral },
    { name: "Groq", fn: callGroq },
    { name: "Gemini", fn: callGemini }
  ];

  for (const p of providers) {
    try {
      const res = await p.fn(jdText);
      if (res) return { text: res, provider: p.name };
    } catch (err) {
      console.warn(`Provider ${p.name} failed: ${err.message}`);
    }
  }
  throw new Error("All AI providers failed.");
}

async function callMistral(jdText) {
  if (!mistralClient) return null;
  const res = await mistralClient.chat.complete({
    model: "mistral-large-latest",
    messages: [
      { role: "system", content: `${systemPrompt}\n\nCandidate Profile:\n${anonProfile}` },
      { role: "user", content: `JOB DESCRIPTION:\n\n${jdText}` }
    ],
    temperature: 0.2
  });
  return res.choices[0].message.content;
}

async function callGroq(jdText) {
  if (!groqClient) return null;
  const res = await groqClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: `${systemPrompt}\n\nCandidate Profile:\n${anonProfile}` },
      { role: "user", content: `JOB DESCRIPTION:\n\n${jdText}` }
    ],
    temperature: 0.2
  });
  return res.choices[0].message.content;
}

async function callGemini(jdText) {
  if (!geminiClient) return null;
  const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `${systemPrompt}\n\nCandidate Profile:\n${anonProfile}\n\nJOB DESCRIPTION:\n\n${jdText}`;
  const res = await model.generateContent(prompt);
  return res.response.text();
}

async function fetchJobFast(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, "")
               .replace(/<style[\s\S]*?<\/style>/gi, "")
               .replace(/<[^>]+>/g, " ")
               .replace(/\s+/g, " ").trim();
  } catch (err) {
    return null;
  }
}

async function sendTelegramNotification(token, chatId, company, role, score, archetype, url, reportUrl) {
  if (!token || !chatId) return;

  const cleanScore = (score || "").toString().replace(/[^0-9.]/g, "");
  const numScore = parseFloat(cleanScore) || 1.0;

  const emoji = numScore >= 4.5 ? "🔥" : numScore >= 4.0 ? "🎯" : "⚠️";
  let text = `${emoji} *Mobile Job Evaluated!*\n\n`;
  text += `🏢 *Company:* ${company}\n`;
  text += `💼 *Role:* ${role}\n`;
  text += `⭐ *Score:* *${cleanScore}/5* (${archetype})\n\n`;
  text += `🔗 [Direct Job Posting](${url})\n`;
  if (numScore >= 4.0) {
    text += `\n✅ *Action:* Added to top-fit application queue in private repo!`;
  } else {
    text += `\n🚫 *Recommendation:* Below 4.0 threshold (Skipped).`;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        disable_web_page_preview: false
      })
    });
    console.log("✅ Sent instant Telegram notification.");
  } catch (e) {
    console.warn("⚠️ Telegram notify failed:", e.message);
  }
}

async function main() {
  const targetUrl = process.argv[2] || process.env.JOB_URL;
  if (!targetUrl) {
    console.error("❌ Usage: node eval-single-url.mjs <JOB_URL>");
    process.exit(1);
  }

  console.log(`🌐 Fetching & evaluating single URL: ${targetUrl}`);
  let jdText = await fetchJobFast(targetUrl);
  if (!jdText) {
    jdText = `Target URL: ${targetUrl}\nNote: Direct HTML scrape was protected, evaluating from URL metadata.`;
  }

  const { text, provider } = await callAI(jdText);
  const summaryMatch = text.match(/---SCORE_SUMMARY---\s*([\s\S]*?)---END_SUMMARY---/);

  let company = "Company";
  let role = "Role";
  let score = "1.0";
  let archetype = "General";
  let legitimacy = "High Confidence";

  if (summaryMatch) {
    const block = summaryMatch[1];
    const extract = (k) => {
      const m = block.match(new RegExp(`${k}:\\s*([^\n\r]+)`, "i"));
      return m ? m[1].replace(/[*_~`]/g, "").trim() : "";
    };
    company = extract("COMPANY") || company;
    role = extract("ROLE") || role;
    const rawScore = extract("SCORE");
    if (rawScore) {
      const scoreNumMatch = rawScore.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (scoreNumMatch) score = scoreNumMatch[1];
    }
    archetype = extract("ARCHETYPE") || archetype;
    legitimacy = extract("LEGITIMACY") || legitimacy;
  } else {
    // Fallback search in report body if summary block was missed
    const scoreBodyMatch = text.match(/\*\*Score:\*\*\s*([0-9]+(?:\.[0-9]+)?)/i) || text.match(/Score:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (scoreBodyMatch) score = scoreBodyMatch[1];
  }

  // Clean company & role of formatting
  company = company.replace(/[*_~`]/g, "").trim();
  role = role.replace(/[*_~`]/g, "").trim();
  archetype = archetype.replace(/[*_~`]/g, "").trim();
  legitimacy = legitimacy.replace(/[*_~`]/g, "").trim();
  const numScore = parseFloat(score) || 1.0;

  const today = new Date().toISOString().split("T")[0];
  const stagedDir = path.join(process.cwd(), "reports", "staged");
  const additionsDir = path.join(process.cwd(), "batch", "tracker-additions");
  fs.mkdirSync(stagedDir, { recursive: true });
  fs.mkdirSync(additionsDir, { recursive: true });

  const slug = `${company}-${role}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const reportFilename = `staged-${slug}-${Date.now()}.md`;
  const reportFile = path.join(stagedDir, reportFilename);

  const reportContent = `# Evaluation: ${company} — ${role}\n\n**Date:** ${today}\n**Archetype:** ${archetype}\n**Score:** ${score}/5\n**URL:** ${targetUrl}\n**Legitimacy:** ${legitimacy}\n**PDF:** pending\n**Tool:** ${provider}\n\n---\n\n${text.replace(/---SCORE_SUMMARY---[\s\S]*?---END_SUMMARY---/, "").trim()}\n`;
  fs.writeFileSync(reportFile, reportContent, "utf8");

  const status = numScore >= 4.0 ? "Evaluated" : "SKIP";
  let nextAppNum = 1;
  const appFile = path.join(process.cwd(), "data", "applications.md");
  if (fs.existsSync(appFile)) {
    const nums = (fs.readFileSync(appFile, "utf8").match(/\|\s*(\d+)\s*\|/g) || [])
      .map(m => parseInt(m.replace(/[^0-9]/g, ""), 10))
      .filter(n => !isNaN(n));
    if (nums.length > 0) nextAppNum = Math.max(...nums) + 1;
  }
  const tsvLine = `${nextAppNum}\t${today}\t${company}\t${role}\t${status}\t${score}/5\t❌\t[${nextAppNum}](reports/${reportFilename})\tMobile cloud evaluation (${provider}) — ${targetUrl}\n`;
  fs.writeFileSync(path.join(additionsDir, `${nextAppNum}-${slug}.tsv`), tsvLine, "utf8");

  console.log(`\n🎉 Completed Evaluation: ${company} — ${role} (${score}/5 via ${provider})`);

  // Send Telegram Instant Alert
  await sendTelegramNotification(
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.TELEGRAM_CHAT_ID,
    company,
    role,
    score,
    archetype,
    targetUrl,
    reportFilename
  );
}

main();
