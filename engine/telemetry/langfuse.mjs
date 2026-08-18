/**
 * engine/telemetry/langfuse.mjs
 * Langfuse Client wrapper for local & cloud observability
 */

import { Langfuse } from "langfuse";
import dotenv from "dotenv";

dotenv.config();

let client = null;

export function getLangfuseClient() {
  if (!client) {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

    if (publicKey && secretKey) {
      client = new Langfuse({
        publicKey,
        secretKey,
        baseUrl
      });
    }
  }
  return client;
}

export async function createEvaluationTrace(jobTitle, company, tags = []) {
  const langfuse = getLangfuseClient();
  if (!langfuse) return null;

  return langfuse.trace({
    name: `eval:${company}-${jobTitle}`.toLowerCase().replace(/\s+/g, "-"),
    tags: ["career-ops", ...tags],
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
}
