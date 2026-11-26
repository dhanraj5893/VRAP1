/* -------------------------------------------------------------------------- */
/*  VRAP explainable scoring engine                                            */
/*  All scores are 0-100. Every number shown in the UI can be traced to the    */
/*  factor inputs and weights below - no black boxes, no automated decisions.  */
/* -------------------------------------------------------------------------- */

export const FACTOR_VALUE: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };

export const FACTOR_LABELS: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very high",
};

export const INHERENT_WEIGHTS = {
  serviceCriticality: 0.3,
  dataSensitivity: 0.25,
  systemAccess: 0.2,
  dependency: 0.15,
  geographicExposure: 0.1,
} as const;

/** Configurable scoring parameters (admin-editable via /settings, stored in scoring_config). */
export interface ScoringParams {
  weights: Record<string, number>;
  mitigationCap: number; // 0..1, default 0.65
  tierModerate: number; // default 40
  tierHigh: number; // default 60
  tierCritical: number; // default 80
}

export const DEFAULT_SCORING_PARAMS: ScoringParams = {
  weights: { ...INHERENT_WEIGHTS },
  mitigationCap: 0.65,
  tierModerate: 40,
  tierHigh: 60,
  tierCritical: 80,
};

export type Tier = "low" | "moderate" | "high" | "critical";

export const TIER_META: Record<Tier, { label: string; cls: string; bar: string; hex: string }> = {
  low: { label: "Low", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10", bar: "bg-emerald-400", hex: "#34d399" },
  moderate: { label: "Moderate", cls: "text-sky-300 border-sky-400/30 bg-sky-400/10", bar: "bg-sky-400", hex: "#38bdf8" },
  high: { label: "High", cls: "text-amber-300 border-amber-400/30 bg-amber-400/10", bar: "bg-amber-400", hex: "#fbbf24" },
  critical: { label: "Critical", cls: "text-rose-300 border-rose-400/30 bg-rose-400/10", bar: "bg-rose-400", hex: "#fb7185" },
};

export function tierOf(score: number, params?: ScoringParams): Tier {
  const p = params ?? DEFAULT_SCORING_PARAMS;
  if (score >= p.tierCritical) return "critical";
  if (score >= p.tierHigh) return "high";
  if (score >= p.tierModerate) return "moderate";
  return "low";
}

/** Map a service dependency level (+ optional concentration %) to a 0-100 factor value. */
export function dependencyFactor(
  deps: { dependencyLevel: string; concentration: number | null }[],
): { value: number; label: string } {
  if (deps.length === 0) return { value: 20, label: "No mapped business services" };
  let best = 40;
  let bestLabel = "Backup provider for mapped services";
  for (const d of deps) {
    const conc = d.concentration ?? null;
    let v: number;
    let l: string;
    if (d.dependencyLevel === "primary") {
      v = conc != null && conc >= 75 ? 100 : 85;
      l = `Primary provider${conc != null ? ` (${conc}% concentration)` : ""}`;
    } else if (d.dependencyLevel === "partial") {
      v = 60;
      l = "Partial dependency on mapped services";
    } else {
      v = 40;
      l = "Backup provider for mapped services";
    }
    if (v > best) {
      best = v;
      bestLabel = l;
    }
  }
  return { value: best, label: bestLabel };
}

export interface InherentInput {
  serviceCriticality: number;
  dataSensitivity: number;
  systemAccess: number;
  geographicExposure: number;
  dependencyValue: number;
  dependencyLabel: string;
}

export interface InherentResult {
  score: number;
  tier: Tier;
  contributions: {
    key: string;
    label: string;
    inputLabel: string;
    value: number;
    weight: number;
    points: number;
  }[];
}

/** Inherent exposure = weighted sum of the five intake factors. */
export function inherentRisk(input: InherentInput, params?: ScoringParams): InherentResult {
  const p = params ?? DEFAULT_SCORING_PARAMS;
  const w = (k: string) => p.weights[k] ?? INHERENT_WEIGHTS[k as keyof typeof INHERENT_WEIGHTS] ?? 0;
  const rows: [string, string, number, number, string][] = [
    ["serviceCriticality", "Service criticality", input.serviceCriticality, w("serviceCriticality"), FACTOR_LABELS[input.serviceCriticality] ?? "Moderate"],
    ["dataSensitivity", "Data sensitivity", input.dataSensitivity, w("dataSensitivity"), FACTOR_LABELS[input.dataSensitivity] ?? "Moderate"],
    ["systemAccess", "System access / integration", input.systemAccess, w("systemAccess"), FACTOR_LABELS[input.systemAccess] ?? "Moderate"],
    ["dependency", "Dependency / concentration", 0, w("dependency"), input.dependencyLabel],
    ["geographicExposure", "Geographic exposure", input.geographicExposure, w("geographicExposure"), FACTOR_LABELS[input.geographicExposure] ?? "Low"],
  ];
  const contributions = rows.map(([key, label, lvl, weight, inputLabel]) => {
    const value = key === "dependency" ? input.dependencyValue : FACTOR_VALUE[lvl as number] ?? 60;
    return { key, label, inputLabel, value, weight, points: Math.round(value * weight * 10) / 10 };
  });
  const score = Math.round(contributions.reduce((s, c) => s + c.points, 0));
  return { score, tier: tierOf(score, p), contributions };
}

export const RESPONSE_VALUE: Record<string, number> = { yes: 100, partial: 50, no: 0 };

export interface AnswerLike {
  response: string | null;
  questionWeight: number;
  evidenceRequired: boolean;
  evidenceStatus: string | null; // effective status
}

/** Control effectiveness = weighted average of questionnaire responses (N/A excluded). */
export function controlEffectiveness(rows: AnswerLike[]): {
  score: number | null;
  answered: number;
  total: number;
} {
  let wsum = 0;
  let w = 0;
  let answered = 0;
  for (const r of rows) {
    if (!r.response || r.response === "na") continue;
    answered += 1;
    wsum += (RESPONSE_VALUE[r.response] ?? 0) * r.questionWeight;
    w += r.questionWeight;
  }
  const total = rows.length;
  if (w === 0) return { score: null, answered, total };
  return { score: Math.round(wsum / w), answered, total };
}

/**
 * Residual risk: control effectiveness mitigates inherent exposure by up to
 * mitigationCap (default 65%). residual = inherent * (1 - cap * CE/100).
 * Shown as a decision aid only.
 */
export function residualRisk(inherent: number, ce: number | null, params?: ScoringParams): number | null {
  if (ce == null) return null;
  const cap = params?.mitigationCap ?? DEFAULT_SCORING_PARAMS.mitigationCap;
  return Math.max(0, Math.round(inherent * (1 - cap * (ce / 100))));
}

export const EVIDENCE_CONFIDENCE: Record<string, number> = {
  verified: 100,
  submitted: 70,
  clarification_requested: 50,
  stale: 40,
  rejected: 25,
  missing: 0,
};

/**
 * Assessment confidence = how much of the claimed control posture is backed by
 * current, verified evidence. Missing/expired evidence lowers confidence; it is
 * NOT treated as proof a control has failed.
 */
export function confidenceScore(rows: AnswerLike[]): {
  score: number;
  covered: number;
  required: number;
  breakdown: { verified: number; submitted: number; stale: number; missing: number; other: number };
} {
  let w = 0;
  let sum = 0;
  let required = 0;
  let covered = 0;
  const breakdown = { verified: 0, submitted: 0, stale: 0, missing: 0, other: 0 };
  for (const r of rows) {
    if (!r.evidenceRequired || !r.response || r.response === "na") continue;
    required += 1;
    w += r.questionWeight;
    const st = r.evidenceStatus ?? "missing";
    if (st !== "missing") covered += 1;
    sum += (EVIDENCE_CONFIDENCE[st] ?? 0) * r.questionWeight;
    if (st === "verified") breakdown.verified += 1;
    else if (st === "submitted") breakdown.submitted += 1;
    else if (st === "stale") breakdown.stale += 1;
    else if (st === "missing") breakdown.missing += 1;
    else breakdown.other += 1;
  }
  if (w === 0) return { score: 0, covered, required, breakdown };
  return { score: Math.round(sum / w), covered, required, breakdown };
}

export const RESILIENCE_PLAN_VALUE: Record<string, number> = {
  none: 0,
  draft: 40,
  approved: 70,
  tested: 100,
};

export const RESILIENCE_EXERCISE_VALUE: Record<string, number> = {
  not_run: 0,
  failed: 20,
  partial: 60,
  passed: 100,
};

export type ResilienceStatus = "unknown" | "at_risk" | "partial" | "ready";

export const RESILIENCE_META: Record<ResilienceStatus, { label: string; cls: string; hex: string }> = {
  unknown: { label: "Unknown", cls: "text-zinc-300 border-zinc-500/40 bg-zinc-500/10", hex: "#a1a1aa" },
  at_risk: { label: "At risk", cls: "text-rose-300 border-rose-400/30 bg-rose-400/10", hex: "#fb7185" },
  partial: { label: "Partial", cls: "text-amber-300 border-amber-400/30 bg-amber-400/10", hex: "#fbbf24" },
  ready: { label: "Ready", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10", hex: "#34d399" },
};

/** Resilience readiness is a SEPARATE dimension from cyber risk. Weights: plan 50%, exercise 40%, exercise recency 10%. */
export function resilienceReadiness(rec: {
  continuityPlanStatus: string;
  exerciseOutcome: string;
  lastExerciseAt: Date | string | null;
} | null): { score: number | null; status: ResilienceStatus; parts: { label: string; value: number; weight: number }[] } {
  if (!rec) return { score: null, status: "unknown", parts: [] };
  const plan = RESILIENCE_PLAN_VALUE[rec.continuityPlanStatus] ?? 0;
  const exercise = RESILIENCE_EXERCISE_VALUE[rec.exerciseOutcome] ?? 0;
  let recency = 20;
  if (rec.lastExerciseAt) {
    const d = typeof rec.lastExerciseAt === "string" ? new Date(rec.lastExerciseAt) : rec.lastExerciseAt;
    const months = (Date.now() - d.getTime()) / (30.4 * 86400000);
    recency = months <= 12 ? 100 : months <= 24 ? 60 : 20;
  } else {
    recency = 0;
  }
  const score = Math.round(plan * 0.5 + exercise * 0.4 + recency * 0.1);
  const status: ResilienceStatus = score >= 80 ? "ready" : score >= 50 ? "partial" : "at_risk";
  return {
    score,
    status,
    parts: [
      { label: "Continuity plan", value: plan, weight: 0.5 },
      { label: "Last exercise outcome", value: exercise, weight: 0.4 },
      { label: "Exercise recency", value: recency, weight: 0.1 },
    ],
  };
}

export function scoreColor(score: number | null): string {
  if (score == null) return "text-zinc-400";
  const t = tierOf(score);
  return TIER_META[t].cls.split(" ")[0];
}
