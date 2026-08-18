/**
 * engine/graph/state.mjs
 * Defines the LangGraph Pipeline State schema for Career Ops
 */

export const InitialState = {
  jobUrl: null,
  jdText: "",
  company: "",
  role: "",
  triageScore: 0,
  hardDqHit: false,
  hardDqReason: "",
  evalReport: null,
  resumePayload: null,
  lintErrors: [],
  retryCount: 0,
  finalPdfPath: null,
  traceId: null,
  status: "idle"
};
