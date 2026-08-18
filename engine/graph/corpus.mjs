/**
 * engine/graph/corpus.mjs
 * Deterministic Ground-Truth Corpus Indexer (ported from observable-job-agent concepts)
 * Zero-LLM token verification of claims against canonical cv.md
 */

import fs from "fs";
import path from "path";

export class GroundTruthCorpus {
  constructor(cvPath = "cv.md", articleDigestPath = "article-digest.md") {
    this.rawText = "";
    if (fs.existsSync(cvPath)) {
      this.rawText += fs.readFileSync(cvPath, "utf8") + "\n";
    }
    if (fs.existsSync(articleDigestPath)) {
      this.rawText += fs.readFileSync(articleDigestPath, "utf8") + "\n";
    }
    this.tokens = this.tokenize(this.rawText);
    this.metrics = this.extractMetrics(this.rawText);
  }

  tokenize(text) {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );
  }

  extractMetrics(text) {
    // Matches dollar amounts, percentages, headcount, years
    const regex = /(\$\d+[\d,]*[kKmMbB]?|\d+%\s*|\b\d+\+\s*FTEs?|\b\d+\s*years?\b)/g;
    const matches = text.match(regex) || [];
    return new Set(matches.map((m) => m.trim().toLowerCase()));
  }

  verifyBullet(bulletText) {
    const flags = [];
    const bulletMetrics = this.extractMetrics(bulletText);
    for (const metric of bulletMetrics) {
      if (!this.metrics.has(metric)) {
        flags.push(`Unverified metric: "${metric}" not found in canonical CV corpus.`);
      }
    }
    return {
      isValid: flags.length === 0,
      flags
    };
  }
}
