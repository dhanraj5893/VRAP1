import "server-only";
import { db, ensureDb } from "@/db";
import {
  actions,
  answers,
  assessments,
  auditEvents,
  auditReports,
  businessServices,
  evaluationFeedback,
  evaluationTasks,
  evidence,
  exceptions,
  findings,
  incidents,
  questions,
  reassessmentTriggers,
  resilienceRecords,
  scoringConfig,
  standards,
  subProcessors,
  users,
  vendorCompliance,
  vendorServices,
  vendors,
} from "@/db/schema";
import { desc, eq, asc, and } from "drizzle-orm";
import {
  controlEffectiveness,
  confidenceScore,
  dependencyFactor,
  inherentRisk,
  residualRisk,
  resilienceReadiness,
  DEFAULT_SCORING_PARAMS,
  type AnswerLike,
  type ScoringParams,
} from "@/lib/scoring";
import { effectiveEvidenceStatus } from "@/lib/utils";

export type VendorRow = typeof vendors.$inferSelect;
export type AssessmentRow = typeof assessments.$inferSelect;
export type EvidenceRow = typeof evidence.$inferSelect;

/* --------------------------- scoring configuration ------------------------ */

export async function getScoringParams(): Promise<ScoringParams> {
  await ensureDb();
  const rows = await db.select().from(scoringConfig);
  const p: ScoringParams = {
    weights: { ...DEFAULT_SCORING_PARAMS.weights },
    mitigationCap: DEFAULT_SCORING_PARAMS.mitigationCap,
    tierModerate: DEFAULT_SCORING_PARAMS.tierModerate,
    tierHigh: DEFAULT_SCORING_PARAMS.tierHigh,
    tierCritical: DEFAULT_SCORING_PARAMS.tierCritical,
  };
  const find = (k: string) => rows.find((r) => r.key === k)?.value;
  const pct = (k: string) => {
    const v = find(k);
    return v == null ? undefined : v / 1000;
  };
  p.weights.serviceCriticality = pct("w_serviceCriticality") ?? p.weights.serviceCriticality;
  p.weights.dataSensitivity = pct("w_dataSensitivity") ?? p.weights.dataSensitivity;
  p.weights.systemAccess = pct("w_systemAccess") ?? p.weights.systemAccess;
  p.weights.dependency = pct("w_dependency") ?? p.weights.dependency;
  p.weights.geographicExposure = pct("w_geographicExposure") ?? p.weights.geographicExposure;
  const cap = pct("mitigation_cap");
  if (cap != null) p.mitigationCap = cap;
  const tm = find("tier_moderate");
  const th = find("tier_high");
  const tc = find("tier_critical");
  if (tm != null) p.tierModerate = tm;
  if (th != null) p.tierHigh = th;
  if (tc != null) p.tierCritical = tc;
  return p;
}

export async function listScoringConfig() {
  await ensureDb();
  return db.select().from(scoringConfig).orderBy(asc(scoringConfig.id));
}

/* ------------------------------- vendors --------------------------------- */

export async function listVendorSummaries() {
  await ensureDb();
  const params = await getScoringParams();
  const allVendors = await db.select().from(vendors).orderBy(asc(vendors.name));
  const allAssessments = await db.select().from(assessments);
  const allVs = await db.select().from(vendorServices);
  const allRes = await db.select().from(resilienceRecords);
  const allEvidence = await db.select().from(evidence);
  const allActions = await db.select().from(actions);
  const allTriggers = await db.select().from(reassessmentTriggers);
  const allIncidents = await db.select().from(incidents);
  const allCompliance = await db.select().from(vendorCompliance);
  const allEx = await db.select().from(exceptions);

  return allVendors.map((v) => {
    const deps = allVs.filter((x) => x.vendorId === v.id);
    const vAssess = allAssessments
      .filter((a) => a.vendorId === v.id)
      .sort((a, b) => b.version - a.version);
    const latest = vAssess[0] ?? null;
    const vEvidence = allEvidence.filter((e) => e.vendorId === v.id);
    const rec = allRes.find((r) => r.vendorId === v.id) ?? null;
    const openActions = allActions.filter(
      (a) => a.vendorId === v.id && a.status !== "done",
    );
    const depFactor = dependencyFactor(deps);
    const inh = inherentRisk({
      serviceCriticality: v.serviceCriticality,
      dataSensitivity: v.dataSensitivity,
      systemAccess: v.systemAccess,
      geographicExposure: v.geographicExposure,
      dependencyValue: depFactor.value,
      dependencyLabel: depFactor.label,
    }, params);
    const res = resilienceReadiness(rec);
    const attentionEvidence = vEvidence.filter((e) => {
      const st = effectiveEvidenceStatus(e.status, e.validUntil);
      return st === "stale" || st === "missing" || st === "rejected" || st === "clarification_requested";
    }).length;
    const compliance = allCompliance.filter((c) => c.vendorId === v.id);
    const applicable = compliance.filter((c) => c.status !== "na");
    const gaps = applicable.filter((c) => c.status === "non_compliant" || c.status === "partial" || c.status === "not_assessed");
    const openTriggers = allTriggers.filter((t) => t.vendorId === v.id && t.status === "open");
    const openIncidents = allIncidents.filter((i) => i.vendorId === v.id && i.status !== "closed");
    const activeExceptions = allEx.filter((x) => x.vendorId === v.id && x.status === "active");
    const contractDays = v.contractEnd
      ? Math.round((new Date(v.contractEnd).getTime() - Date.now()) / 86400000)
      : null;
    return {
      vendor: v,
      deps,
      latestAssessment: latest,
      inherent: inh,
      resilience: res,
      evidenceAttention: attentionEvidence,
      openActions: openActions.length,
      complianceCoverage:
        applicable.length === 0
          ? null
          : Math.round(((applicable.length - gaps.length) / applicable.length) * 100),
      complianceGaps: gaps.length,
      applicableStandards: applicable.length,
      openTriggers: openTriggers.length,
      openIncidents: openIncidents.length,
      activeExceptions: activeExceptions.length,
      contractDays,
    };
  });
}

/** Vendor-scoped data bundle. Vendor representatives only ever see their own row. */
export async function getVendorBundle(vendorId: number) {
  await ensureDb();
  const params = await getScoringParams();
  const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
  if (!vendor) return null;

  const deps = await db
    .select({ vs: vendorServices, service: businessServices })
    .from(vendorServices)
    .innerJoin(businessServices, eq(vendorServices.serviceId, businessServices.id))
    .where(eq(vendorServices.vendorId, vendorId));

  const vendorAssessments = await db
    .select()
    .from(assessments)
    .where(eq(assessments.vendorId, vendorId))
    .orderBy(desc(assessments.version));

  const vendorEvidence = await db
    .select()
    .from(evidence)
    .where(eq(evidence.vendorId, vendorId))
    .orderBy(desc(evidence.uploadedAt));

  const rec = await db.query.resilienceRecords.findFirst({
    where: eq(resilienceRecords.vendorId, vendorId),
  });

  const vendorFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.vendorId, vendorId))
    .orderBy(desc(findings.createdAt));

  const vendorActions = await db
    .select()
    .from(actions)
    .where(eq(actions.vendorId, vendorId))
    .orderBy(asc(actions.dueAt));

  const vendorExceptions = await db
    .select()
    .from(exceptions)
    .where(eq(exceptions.vendorId, vendorId))
    .orderBy(desc(exceptions.createdAt));

  const compliance = await db
    .select({ vc: vendorCompliance, standard: standards })
    .from(vendorCompliance)
    .innerJoin(standards, eq(vendorCompliance.standardId, standards.id))
    .where(eq(vendorCompliance.vendorId, vendorId))
    .orderBy(asc(standards.name));

  const subs = await db
    .select()
    .from(subProcessors)
    .where(eq(subProcessors.vendorId, vendorId))
    .orderBy(asc(subProcessors.name));

  const vendorIncidents = await db
    .select()
    .from(incidents)
    .where(eq(incidents.vendorId, vendorId))
    .orderBy(desc(incidents.occurredAt));

  const triggers = await db
    .select()
    .from(reassessmentTriggers)
    .where(eq(reassessmentTriggers.vendorId, vendorId))
    .orderBy(desc(reassessmentTriggers.createdAt));

  const trail = await db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(400);

  const vendorTrail = trail
    .filter(
      (t) =>
        (t.entityType === "vendor" && t.entityId === vendorId) ||
        (t.entityType === "assessment" && vendorAssessments.some((a) => a.id === t.entityId)),
    )
    .slice(0, 40);

  const depFactor = dependencyFactor(deps.map((d) => d.vs));
  const inh = inherentRisk({
    serviceCriticality: vendor.serviceCriticality,
    dataSensitivity: vendor.dataSensitivity,
    systemAccess: vendor.systemAccess,
    geographicExposure: vendor.geographicExposure,
    dependencyValue: depFactor.value,
    dependencyLabel: depFactor.label,
  }, params);
  const resScore = resilienceReadiness(rec ?? null);

  return {
    vendor,
    deps,
    assessments: vendorAssessments,
    evidence: vendorEvidence,
    resilience: rec ?? null,
    resilienceScore: resScore,
    findings: vendorFindings,
    actions: vendorActions,
    exceptions: vendorExceptions,
    compliance,
    subProcessors: subs,
    incidents: vendorIncidents,
    triggers,
    trail: vendorTrail,
    inherent: inh,
  };
}

/* ----------------------------- assessments ------------------------------- */

export async function getAssessmentBundle(assessmentId: number) {
  await ensureDb();
  const params = await getScoringParams();
  const assessment = await db.query.assessments.findFirst({
    where: eq(assessments.id, assessmentId),
  });
  if (!assessment) return null;
  const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, assessment.vendorId) });
  if (!vendor) return null;

  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.templateId, assessment.templateId))
    .orderBy(asc(questions.position));

  const ans = await db
    .select()
    .from(answers)
    .where(eq(answers.assessmentId, assessmentId));

  const vendorEvidence = await db
    .select()
    .from(evidence)
    .where(eq(evidence.vendorId, vendor.id))
    .orderBy(desc(evidence.uploadedAt));

  const deps = await db
    .select({ vs: vendorServices, service: businessServices })
    .from(vendorServices)
    .innerJoin(businessServices, eq(vendorServices.serviceId, businessServices.id))
    .where(eq(vendorServices.vendorId, vendor.id));

  const rec = await db.query.resilienceRecords.findFirst({
    where: eq(resilienceRecords.vendorId, vendor.id),
  });

  const reviewer = assessment.reviewerId
    ? await db.query.users.findFirst({ where: eq(users.id, assessment.reviewerId) })
    : null;
  const decider = assessment.decidedById
    ? await db.query.users.findFirst({ where: eq(users.id, assessment.decidedById) })
    : null;

  const rows: AnswerLike[] = qs.map((q) => {
    const a = ans.find((x) => x.questionId === q.id);
    const ev = a?.evidenceId ? vendorEvidence.find((e) => e.id === a.evidenceId) : null;
    return {
      response: a?.response ?? null,
      questionWeight: q.weight,
      evidenceRequired: q.evidenceRequired,
      evidenceStatus: ev ? effectiveEvidenceStatus(ev.status, ev.validUntil) : "missing",
    };
  });

  const ce = controlEffectiveness(rows);
  const conf = confidenceScore(rows);
  const depFactor = dependencyFactor(deps.map((d) => d.vs));
  const inh = inherentRisk({
    serviceCriticality: vendor.serviceCriticality,
    dataSensitivity: vendor.dataSensitivity,
    systemAccess: vendor.systemAccess,
    geographicExposure: vendor.geographicExposure,
    dependencyValue: depFactor.value,
    dependencyLabel: depFactor.label,
  }, params);
  const residual = residualRisk(inh.score, ce.score, params);
  const resScore = resilienceReadiness(rec ?? null);

  const domains = new Map<string, { q: typeof questions.$inferSelect; a: (typeof ans)[number] | undefined }[]>();
  for (const q of qs) {
    const list = domains.get(q.domain) ?? [];
    list.push({ q, a: ans.find((x) => x.questionId === q.id) });
    domains.set(q.domain, list);
  }

  const trail = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.entityId, assessmentId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(20);

  const stdRefs = Array.from(new Set(qs.map((q) => q.standardRef).filter(Boolean)));

  return {
    assessment,
    vendor,
    deps,
    domains,
    evidence: vendorEvidence,
    resilience: rec ?? null,
    resilienceScore: resScore,
    reviewer,
    decider,
    standardRefs: stdRefs,
    params,
    scores: { inherent: inh, control: ce, confidence: conf, residual },
    trail: trail.filter((t) => t.entityType === "assessment"),
  };
}

/* --------------------------- standards & privacy -------------------------- */

export async function listStandards() {
  await ensureDb();
  return db.select().from(standards).orderBy(asc(standards.region), asc(standards.name));
}

export async function getComplianceMatrix() {
  await ensureDb();
  const [stds, rows, allVendors] = await Promise.all([
    db.select().from(standards).orderBy(asc(standards.name)),
    db.select().from(vendorCompliance),
    db.select().from(vendors).orderBy(asc(vendors.name)),
  ]);
  return {
    standards: stds,
    vendors: allVendors,
    rows,
  };
}

/* -------------------------- monitoring & triggers ------------------------- */

export async function listMonitoring() {
  await ensureDb();
  const [subs, incs, trigs, allVendors] = await Promise.all([
    db.select({ sp: subProcessors, vendorName: vendors.name }).from(subProcessors).innerJoin(vendors, eq(subProcessors.vendorId, vendors.id)).orderBy(asc(subProcessors.name)),
    db.select({ inc: incidents, vendorName: vendors.name }).from(incidents).innerJoin(vendors, eq(incidents.vendorId, vendors.id)).orderBy(desc(incidents.occurredAt)),
    db.select({ trg: reassessmentTriggers, vendorName: vendors.name }).from(reassessmentTriggers).innerJoin(vendors, eq(reassessmentTriggers.vendorId, vendors.id)).orderBy(desc(reassessmentTriggers.createdAt)),
    db.select().from(vendors).orderBy(asc(vendors.name)),
  ]);
  return { subProcessors: subs, incidents: incs, triggers: trigs, vendors: allVendors };
}

/* ------------------------------ dashboards -------------------------------- */

export async function listEvidenceWithVendors() {
  await ensureDb();
  const rows = await db
    .select({ ev: evidence, vendorName: vendors.name })
    .from(evidence)
    .innerJoin(vendors, eq(evidence.vendorId, vendors.id))
    .orderBy(desc(evidence.uploadedAt));
  return rows;
}

export async function listActionsWithVendors() {
  await ensureDb();
  return db
    .select({ action: actions, vendorName: vendors.name })
    .from(actions)
    .innerJoin(vendors, eq(actions.vendorId, vendors.id))
    .orderBy(asc(actions.dueAt));
}

export async function listExceptionsWithVendors() {
  await ensureDb();
  return db
    .select({ exception: exceptions, vendorName: vendors.name })
    .from(exceptions)
    .innerJoin(vendors, eq(exceptions.vendorId, vendors.id))
    .orderBy(desc(exceptions.createdAt));
}

export async function listFindingsWithVendors() {
  await ensureDb();
  return db
    .select({ finding: findings, vendorName: vendors.name })
    .from(findings)
    .innerJoin(vendors, eq(findings.vendorId, vendors.id))
    .orderBy(desc(findings.createdAt));
}

export async function listServicesWithDeps() {
  await ensureDb();
  const services = await db.select().from(businessServices).orderBy(asc(businessServices.name));
  const deps = await db
    .select({ vs: vendorServices, vendorName: vendors.name, vendorStatus: vendors.status })
    .from(vendorServices)
    .innerJoin(vendors, eq(vendorServices.vendorId, vendors.id));
  return services.map((s) => ({ service: s, deps: deps.filter((d) => d.vs.serviceId === s.id) }));
}

/* --------------------------- audit trail & reports ------------------------ */

export async function listAuditEvents(limit = 300, filters?: { entityType?: string; actor?: string; q?: string }) {
  await ensureDb();
  let rows = await db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  if (filters?.entityType) rows = rows.filter((r) => r.entityType === filters.entityType);
  if (filters?.actor) rows = rows.filter((r) => r.actorName === filters.actor);
  if (filters?.q) {
    const needle = filters.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.action.toLowerCase().includes(needle) ||
        r.detail.toLowerCase().includes(needle) ||
        r.actorName.toLowerCase().includes(needle),
    );
  }
  return rows;
}

export async function listDistinctActors() {
  await ensureDb();
  const rows = await db.select().from(auditEvents);
  return Array.from(new Set(rows.map((r) => r.actorName))).sort();
}

export async function listAuditReports() {
  await ensureDb();
  return db.select().from(auditReports).orderBy(desc(auditReports.createdAt));
}

export async function getAuditReport(id: number) {
  await ensureDb();
  return db.query.auditReports.findFirst({ where: eq(auditReports.id, id) });
}

/* ------------------------------- access control --------------------------- */

export async function listUsers() {
  await ensureDb();
  const rows = await db.select().from(users).orderBy(asc(users.name));
  const allVendors = await db.select().from(vendors).orderBy(asc(vendors.name));
  return rows.map((u) => ({
    user: u,
    vendorName: u.vendorId ? allVendors.find((v) => v.id === u.vendorId)?.name ?? null : null,
  }));
}

export async function listVendorNames() {
  await ensureDb();
  return db.select().from(vendors).orderBy(asc(vendors.name));
}

/* ------------------------------- evaluation ------------------------------- */

export async function listEvaluation() {
  await ensureDb();
  const [tasks, feedback] = await Promise.all([
    db.select().from(evaluationTasks).orderBy(asc(evaluationTasks.position)),
    db.select().from(evaluationFeedback).orderBy(desc(evaluationFeedback.createdAt)),
  ]);
  return { tasks, feedback };
}

/* ---------------------- portfolio analytics for reports ------------------- */

export async function getPortfolioSnapshot() {
  await ensureDb();
  const summaries = await listVendorSummaries();
  const [allEvidence, allActions, allExceptions, allFindings, allAssessments, allCompliance, allStandards] =
    await Promise.all([
      db.select().from(evidence),
      db.select().from(actions),
      db.select().from(exceptions),
      db.select().from(findings),
      db.select().from(assessments),
      db.select().from(vendorCompliance),
      db.select().from(standards),
    ]);
  const tiers = { low: 0, moderate: 0, high: 0, critical: 0 };
  for (const s of summaries) tiers[s.inherent.tier] += 1;
  const resilienceAtRisk = summaries.filter((s) => s.resilience.status === "at_risk" || s.resilience.status === "unknown").length;
  const evidenceTotal = allEvidence.length;
  const evidenceVerified = allEvidence.filter((e) => e.status === "verified").length;
  const overdueActions = allActions.filter((a) => a.status !== "done" && a.dueAt && new Date(a.dueAt) < new Date()).length;
  const expiringExceptions = allExceptions.filter(
    (x) => x.status === "active" && x.expiresAt && new Date(x.expiresAt).getTime() - Date.now() < 60 * 86400000,
  ).length;
  const criticalFindings = allFindings.filter((f) => f.severity === "critical" && f.status !== "closed").length;
  const complianceAssessed = allCompliance.filter((c) => c.status !== "not_assessed" && c.status !== "na").length;
  const complianceCompliant = allCompliance.filter((c) => c.status === "compliant").length;
  return {
    summaries,
    tiers,
    resilienceAtRisk,
    evidenceTotal,
    evidenceVerified,
    overdueActions,
    expiringExceptions,
    criticalFindings,
    openFindings: allFindings.filter((f) => f.status !== "closed").length,
    openActions: allActions.filter((a) => a.status !== "done").length,
    activeExceptions: allExceptions.filter((x) => x.status === "active").length,
    assessmentsInFlight: allAssessments.filter((a) => ["issued", "in_review", "decision_pending"].includes(a.status)).length,
    approvalsRecorded: allAssessments.filter((a) => a.decision).length,
    complianceAssessed,
    complianceCompliant,
    standardsTracked: allStandards.length,
    vendorCount: summaries.length,
  };
}

export async function getComplianceHeatmap() {
  const { standards: stds, vendors: vends, rows } = await getComplianceMatrix();
  return { standards: stds, vendors: vends, rows };
}

export { and };
