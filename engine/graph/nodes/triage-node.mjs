/**
 * engine/graph/nodes/triage-node.mjs
 * Fast Triage Node for LangGraph
 */

import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config();

const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const mistralClient = process.env.MISTRAL_API_KEY ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY }) : null;

export async function runTriageNode(state) {
  const briefText = fs.existsSync("modes/_brief.md") ? fs.readFileSync("modes/_brief.md", "utf8") : "";

  // 1. Check Hard DQs
  const textLower = state.jdText.toLowerCase();
  if (textLower.includes("active top secret") || textLower.includes("us citizenship required")) {
    return {
      ...state,
      hardDqHit: true,
      hardDqReason: "Security clearance / citizenship restriction",
      triageScore: 1.0,
      status: "triaged_skip"
    };
  }

  // 2. Fast score call
  const prompt = `You are a fast job triage evaluator.
Read this candidate brief:
${briefText}

JOB DESCRIPTION:
${state.jdText.slice(0, 3000)}

Return JSON only:
{
  "company": "<company>",
  "role": "<role>",
  "score": <0.0 to 5.0>,
  "reason": "<one sentence>",
  "verdict": "<GO | SKIP>"
}`;

  try {
    if (geminiClient) {
      const model = geminiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          ...state,
          company: parsed.company || state.company,
          role: parsed.role || state.role,
          triageScore: parsed.score || 3.0,
          status: parsed.score >= 4.0 ? "triaged_go" : "triaged_skip"
        };
      }
    }
  } catch (err) {
    console.warn("Triage node fallback:", err.message);
  }

  return {
    ...state,
    triageScore: 4.0,
    status: "triaged_go"
  };
}
