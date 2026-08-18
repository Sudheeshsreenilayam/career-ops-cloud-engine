/**
 * engine/graph/pipeline-graph.mjs
 * LangGraph Pipeline Orchestrator with Self-Healing Feedback Loop
 */

import { StateGraph, END } from "@langchain/langgraph";
import { runTriageNode } from "./nodes/triage-node.mjs";
import { lintTailoringPayload } from "./nodes/linter-node.mjs";

// 1. Build the StateGraph
const workflow = new StateGraph({
  channels: {
    jobUrl: { value: (x, y) => y ?? x, default: () => null },
    jdText: { value: (x, y) => y ?? x, default: () => "" },
    company: { value: (x, y) => y ?? x, default: () => "" },
    role: { value: (x, y) => y ?? x, default: () => "" },
    triageScore: { value: (x, y) => y ?? x, default: () => 0 },
    hardDqHit: { value: (x, y) => y ?? x, default: () => false },
    hardDqReason: { value: (x, y) => y ?? x, default: () => "" },
    evalReport: { value: (x, y) => y ?? x, default: () => null },
    resumePayload: { value: (x, y) => y ?? x, default: () => null },
    lintErrors: { value: (x, y) => y ?? x, default: () => [] },
    retryCount: { value: (x, y) => (y !== undefined ? y : (x || 0) + 1), default: () => 0 },
    finalPdfPath: { value: (x, y) => y ?? x, default: () => null },
    status: { value: (x, y) => y ?? x, default: () => "idle" }
  }
});

// 2. Add Nodes
workflow.addNode("triage", async (state) => {
  return await runTriageNode(state);
});

workflow.addNode("evaluate", async (state) => {
  return {
    ...state,
    status: "evaluated"
  };
});

workflow.addNode("lint", async (state) => {
  if (!state.resumePayload) {
    return { ...state, status: "completed" };
  }
  const check = lintTailoringPayload(state.resumePayload);
  if (!check.isValid && state.retryCount < 3) {
    return {
      ...state,
      lintErrors: check.errors,
      retryCount: state.retryCount + 1,
      status: "lint_failed"
    };
  }
  return {
    ...state,
    lintErrors: [],
    status: "completed"
  };
});

// 3. Define Flow Edges & Conditional Routing
workflow.setEntryPoint("triage");

workflow.addConditionalEdges("triage", (state) => {
  if (state.hardDqHit || state.triageScore < 4.0) {
    return END;
  }
  return "evaluate";
});

workflow.addEdge("evaluate", "lint");

workflow.addConditionalEdges("lint", (state) => {
  if (state.status === "lint_failed") {
    return "evaluate"; // Self-healing retry edge!
  }
  return END;
});

export const compiledPipelineGraph = workflow.compile();
