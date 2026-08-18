/**
 * engine/graph/nodes/linter-node.mjs
 * Strict Pre-Flight Rule Linter Node for LangGraph
 */

import { GroundTruthCorpus } from "../corpus.mjs";

const corpus = new GroundTruthCorpus();

export function lintTailoringPayload(payload) {
  const errors = [];

  if (!payload || !payload.experience) {
    errors.push("Payload is missing experience section.");
    return { isValid: false, errors };
  }

  // 1. Check bolding rules and truth guard on bullets
  for (const exp of payload.experience) {
    for (const bullet of exp.bullets || []) {
      // Must start with bold category hook
      if (!bullet.trim().startsWith("<strong>") && !bullet.trim().startsWith("\\textbf{")) {
        errors.push(`Bullet in ${exp.role} does not start with a bold hook: "${bullet.slice(0, 40)}..."`);
      }

      // Truth guard metric check
      const check = corpus.verifyBullet(bullet);
      if (!check.isValid) {
        errors.push(...check.flags);
      }
    }
  }

  // 2. Check summary bolding requirement (>= 3 bold tags)
  const summary = payload.summary_text || "";
  const boldCount = (summary.match(/<strong>/g) || []).length + (summary.match(/\\textbf\{/g) || []).length;
  if (boldCount < 3) {
    errors.push(`Summary must have at least 3 bold highlights (found ${boldCount}).`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
