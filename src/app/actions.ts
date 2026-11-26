"use server";

import { db, ensureDb } from "@/db";
import {
  actions,
  answers,
  assessments,
  auditEvents,
  auditReports,
  evaluationFeedback,
  evaluationTasks,
  evidence,
  exceptions,
  findings,
  incidents,
  questionTemplates,
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
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can, clearSession, getSessionUser, setSession } from "@/lib/auth";
import { getPortfolioSnapshot, getScoringParams } from "@/lib/data";
import { isStandardApplicable } from "@/lib/standards";
import { tierOf } from "@/lib/scoring";

/* -------------------------------- helpers --------------------------------- */

async function audit(
  entityType: string,
  entityId: number,
  action: string,
  detail: string,
  actorId?: number | null,
) {
  await ensureDb();
  let actorName = "System";
  if (actorId) {
    const u = await db.query.users.findFirst({ where: eq(users.id, actorId) });
    if (u) actorName = u.name;
  }
  await db.insert(auditEvents).values({ actorId: actorId ?? null, actorName, entityType, entityId, action, detail });
}

async function mustUser() {
  await ensureDb();
  const u = await getSessionUser();
  if (!u) throw new Error("Not signed in");
  return u;
}

/** Keep per-vendor compliance rows in sync with the standards catalog. */
async function syncVendorCompliance(vendorId: number) {
  const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
  if (!vendor) return;
  const stds = await db.select().from(standards).where(eq(standards.active, true));
  const existing = await db.select().from(vendorCompliance).where(eq(vendorCompliance.vendorId, vendorId));
  for (const s of stds) {
    if (existing.some((e) => e.standardId === s.id)) continue;
    const applicable = isStandardApplicable(s.applicability, vendor);
    await db.insert(vendorCompliance).values({
      vendorId,
      standardId: s.id,
      status: applicable ? "not_assessed" : "na",
    }).onConflictDoNothing();
  }
}

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function intOrNull(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function dateOrNull(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/* --------------------------------- auth ----------------------------------- */

export async function loginAction(formData: FormData) {
  await ensureDb();
  const userId = intOrNull(str(formData, "userId"));
  if (!userId) redirect("/login?error=1");
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) redirect("/login?error=1");
  // Access control: deactivated accounts are refused and the attempt is audited.
  if (user.isActive === false) {
    await audit("user", user.id, "Sign-in blocked", `${user.name} attempted sign-in with a deactivated account.`, null);
    redirect("/login?error=disabled");
  }
  await setSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const detail =
    user.role === "vendor" && user.vendorId
      ? `${user.name} signed in (vendor rep, scoped to vendor #${user.vendorId}).`
      : `${user.name} signed in as ${user.role}.`;
  await audit("user", user.id, "Sign in", detail, user.id);
  redirect(user.role === "vendor" && user.vendorId ? `/vendors/${user.vendorId}` : "/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

/* ------------------------------ vendor intake ----------------------------- */

export async function createVendorAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "intake")) throw new Error("Not permitted");

  const name = str(formData, "name");
  if (!name) throw new Error("Vendor name required");

  const [v] = await db
    .insert(vendors)
    .values({
      name,
      category: str(formData, "category") || "General",
      status: "intake",
      country: str(formData, "country"),
      ownerName: str(formData, "ownerName"),
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail"),
      serviceCriticality: intOrNull(str(formData, "serviceCriticality")) ?? 3,
      dataSensitivity: intOrNull(str(formData, "dataSensitivity")) ?? 3,
      systemAccess: intOrNull(str(formData, "systemAccess")) ?? 3,
      geographicExposure: intOrNull(str(formData, "geographicExposure")) ?? 2,
      personalDataFlag: str(formData, "personalDataFlag") === "on",
      aiUseFlag: str(formData, "aiUseFlag") === "on",
      notes: str(formData, "notes"),
      contractStart: dateOrNull(str(formData, "contractStart")),
      contractEnd: dateOrNull(str(formData, "contractEnd")),
      dpaStatus: str(formData, "dpaStatus") || "not_signed",
      dataCategories: str(formData, "dataCategories"),
      crossBorder: str(formData, "crossBorder"),
      exitPlanStatus: str(formData, "exitPlanStatus") || "none",
      insuranceExpiry: dateOrNull(str(formData, "insuranceExpiry")),
    })
    .returning();

  // service mappings: serviceIds (multi) + dependency level per service
  const serviceIds = formData.getAll("serviceIds").map((s) => intOrNull(String(s))).filter(Boolean) as number[];
  for (const sid of serviceIds) {
    await db.insert(vendorServices).values({
      vendorId: v.id,
      serviceId: sid,
      dependencyLevel: str(formData, `depLevel_${sid}`) || "partial",
      concentration: intOrNull(str(formData, `conc_${sid}`)),
    });
  }

  await db.insert(resilienceRecords).values({ vendorId: v.id }).onConflictDoNothing();
  await syncVendorCompliance(v.id);
  await audit("vendor", v.id, "Vendor intake", `${v.name} registered in the vendor inventory.`, user.id);

  if (str(formData, "startAssessment") === "on") {
    await createAssessmentInternal(v.id, "Initial onboarding assessment", user.id);
  }

  revalidatePath("/vendors");
  redirect(`/vendors/${v.id}`);
}

async function createAssessmentInternal(vendorId: number, reason: string, actorId: number) {
  // Tailored questionnaire: pick the template matching the vendor's risk tier,
  // falling back to the generic template. Tier is derived from inherent factors.
  const params = await getScoringParams();
  const vendorRow = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
  if (!vendorRow) throw new Error("Vendor not found");
  const deps = await db.select().from(vendorServices).where(eq(vendorServices.vendorId, vendorId));
  const criticalityValue = (vendorRow.serviceCriticality / 5) * 100;
  const depValue = deps.some((d) => d.dependencyLevel === "primary") ? 85 : deps.length ? 60 : 20;
  const roughScore = Math.round(
    criticalityValue * 0.3 +
      ((vendorRow.dataSensitivity / 5) * 100) * 0.25 +
      ((vendorRow.systemAccess / 5) * 100) * 0.2 +
      depValue * 0.15 +
      ((vendorRow.geographicExposure / 5) * 100) * 0.1,
  );
  const tier = tierOf(roughScore, params);
  const templates = await db.select().from(questionTemplates).where(eq(questionTemplates.active, true));
  const template =
    templates.find((t) => t.applicableTier === tier) ??
    templates.find((t) => t.applicableTier === "all") ??
    templates[0];
  if (!template) throw new Error("No active questionnaire template");

  const prev = await db
    .select()
    .from(assessments)
    .where(eq(assessments.vendorId, vendorId))
    .orderBy(desc(assessments.version))
    .limit(1);

  const [a] = await db
    .insert(assessments)
    .values({
      vendorId,
      templateId: template.id,
      version: (prev[0]?.version ?? 0) + 1,
      status: "issued",
      triggerReason: reason,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 14 * 86400000),
    })
    .returning();

  await db
    .update(vendors)
    .set({ status: "assessment" })
    .where(eq(vendors.id, vendorId));

  await audit(
    "assessment",
    a.id,
    "Assessment issued",
    `Assessment v${a.version} issued to vendor #${vendorId}. Trigger: ${reason}. Template: ${template.name} v${template.version}.`,
    actorId,
  );
  return a;
}

export async function startAssessmentAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "intake")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  const reason = str(formData, "reason") || "Scheduled reassessment";
  await createAssessmentInternal(vendorId, reason, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/assessments");
}

export async function addVendorServiceAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "intake")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  const serviceId = intOrNull(str(formData, "serviceId"));
  if (!vendorId || !serviceId) throw new Error("Missing ids");
  await db
    .insert(vendorServices)
    .values({
      vendorId,
      serviceId,
      dependencyLevel: str(formData, "dependencyLevel") || "partial",
      concentration: intOrNull(str(formData, "concentration")),
      notes: str(formData, "notes"),
    })
    .onConflictDoNothing();
  await audit("vendor", vendorId, "Service mapped", `Business service ${serviceId} linked.`, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/services");
}

export async function removeVendorServiceAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "intake")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!id || !vendorId) throw new Error("Missing ids");
  await db.delete(vendorServices).where(eq(vendorServices.id, id));
  await audit("vendor", vendorId, "Service unmapped", `Mapping ${id} removed.`, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/services");
}

/* ------------------------- questionnaire & evidence ------------------------ */

export async function saveAnswerAction(formData: FormData) {
  const user = await mustUser();
  const assessmentId = intOrNull(str(formData, "assessmentId"));
  const questionId = intOrNull(str(formData, "questionId"));
  if (!assessmentId || !questionId) throw new Error("Missing ids");

  const a = await db.query.assessments.findFirst({ where: eq(assessments.id, assessmentId) });
  if (!a) throw new Error("Assessment not found");
  // vendor reps may only answer their own, open assessments
  if (user.role === "vendor") {
    if (user.vendorId !== a.vendorId) throw new Error("Not your assessment");
    if (!["issued", "draft"].includes(a.status)) throw new Error("Assessment is locked");
  } else if (!can(user, "review")) {
    throw new Error("Not permitted");
  }

  const response = str(formData, "response") || null;
  const evidenceId = intOrNull(str(formData, "evidenceId"));
  const existing = await db
    .select()
    .from(answers)
    .where(and(eq(answers.assessmentId, assessmentId), eq(answers.questionId, questionId)))
    .limit(1);

  const values = {
    response,
    comment: str(formData, "comment"),
    evidenceId,
    updatedAt: new Date(),
  };
  if (existing[0]) {
    await db.update(answers).set(values).where(eq(answers.id, existing[0].id));
  } else {
    await db.insert(answers).values({ assessmentId, questionId, ...values });
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function registerEvidenceAction(formData: FormData) {
  const user = await mustUser();
  const vendorId = intOrNull(str(formData, "vendorId"));
  const assessmentId = intOrNull(str(formData, "assessmentId"));
  const questionId = intOrNull(str(formData, "questionId"));
  if (!vendorId) throw new Error("vendorId required");
  if (user.role === "vendor" && user.vendorId !== vendorId) throw new Error("Not your vendor record");

  const [ev] = await db
    .insert(evidence)
    .values({
      vendorId,
      title: str(formData, "title") || "Untitled evidence",
      type: str(formData, "type") || "other",
      fileName: str(formData, "fileName"),
      owner: str(formData, "owner") || user.name,
      validUntil: dateOrNull(str(formData, "validUntil")),
      status: "submitted",
      uploadedById: user.id,
    })
    .returning();

  // optional: link directly to an answer
  if (assessmentId && questionId) {
    const existing = await db
      .select()
      .from(answers)
      .where(and(eq(answers.assessmentId, assessmentId), eq(answers.questionId, questionId)))
      .limit(1);
    if (existing[0]) {
      await db.update(answers).set({ evidenceId: ev.id, updatedAt: new Date() }).where(eq(answers.id, existing[0].id));
    } else {
      await db.insert(answers).values({ assessmentId, questionId, evidenceId: ev.id, updatedAt: new Date() });
    }
  }

  await audit("evidence", ev.id, "Evidence registered", `"${ev.title}" registered for vendor #${vendorId}.`, user.id);
  await audit("vendor", vendorId, "Evidence registered", `"${ev.title}" added to the evidence register.`, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  if (assessmentId) revalidatePath(`/assessments/${assessmentId}`);
}

export async function reviewEvidenceAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "review")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  if (!id) throw new Error("id required");
  const status = str(formData, "status");
  if (!["verified", "rejected", "clarification_requested", "submitted"].includes(status)) throw new Error("Bad status");
  const ev = await db.query.evidence.findFirst({ where: eq(evidence.id, id) });
  if (!ev) throw new Error("Evidence not found");
  await db
    .update(evidence)
    .set({ status, reviewerNote: str(formData, "reviewerNote") || ev.reviewerNote })
    .where(eq(evidence.id, id));
  await audit("evidence", id, "Evidence reviewed", `"${ev.title}" marked ${status.replaceAll("_", " ")}.`, user.id);
  await audit("vendor", ev.vendorId, "Evidence reviewed", `"${ev.title}" marked ${status.replaceAll("_", " ")}.`, user.id);
  revalidatePath(`/vendors/${ev.vendorId}`);
  revalidatePath("/assessments");
}

/* ------------------------------ review flow ------------------------------- */

export async function submitAssessmentAction(formData: FormData) {
  const user = await mustUser();
  const id = intOrNull(str(formData, "assessmentId"));
  if (!id) throw new Error("id required");
  const a = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
  if (!a) throw new Error("Assessment not found");
  if (user.role === "vendor" && user.vendorId !== a.vendorId) throw new Error("Not yours");

  await db.update(assessments).set({ status: "in_review", submittedAt: new Date() }).where(eq(assessments.id, id));
  await db.update(vendors).set({ status: "review" }).where(eq(vendors.id, a.vendorId));
  await audit("assessment", id, "Responses submitted", `Vendor submitted questionnaire responses for review.`, user.id);
  await audit("vendor", a.vendorId, "Responses submitted", `Assessment v${a.version} submitted for review.`, user.id);
  revalidatePath(`/assessments/${id}`);
  revalidatePath(`/vendors/${a.vendorId}`);
}

export async function sendForDecisionAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "review")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "assessmentId"));
  if (!id) throw new Error("id required");
  const a = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
  if (!a) throw new Error("Assessment not found");
  const rationale = str(formData, "rationale");
  await db
    .update(assessments)
    .set({ status: "decision_pending", reviewerId: user.id, reviewerRationale: rationale })
    .where(eq(assessments.id, id));
  await audit("assessment", id, "Sent for decision", `Reviewer sent the assessment for approval. Rationale recorded.`, user.id);
  await audit("vendor", a.vendorId, "Reviewer completed", `Assessment v${a.version} moved to decision pending.`, user.id);
  revalidatePath(`/assessments/${id}`);
  revalidatePath(`/vendors/${a.vendorId}`);
}

export async function decideAssessmentAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "decide")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "assessmentId"));
  if (!id) throw new Error("id required");
  const decision = str(formData, "decision");
  if (!["approved", "conditionally_approved", "on_hold", "rejected"].includes(decision))
    throw new Error("Bad decision");
  const a = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
  if (!a) throw new Error("Assessment not found");
  const rationale = str(formData, "rationale");
  if (decision === "conditionally_approved" && !rationale) throw new Error("Conditions required for conditional approval");

  // reassessment horizon: 6 months for high inherent risk, else 12 - decision aid, editable later
  const months = intOrNull(str(formData, "horizonMonths")) ?? 12;
  const next = new Date(Date.now() + months * 30.4 * 86400000);

  await db
    .update(assessments)
    .set({
      status: decision === "rejected" ? "on_hold" : decision,
      decision,
      decidedById: user.id,
      decidedAt: new Date(),
      decisionRationale: rationale,
      nextReassessmentAt: next,
    })
    .where(eq(assessments.id, id));
  await db
    .update(vendors)
    .set({ status: "monitoring", nextReassessmentAt: next })
    .where(eq(vendors.id, a.vendorId));

  // conditional approval → auto-open a tracking action
  if (decision === "conditionally_approved") {
    await db.insert(actions).values({
      vendorId: a.vendorId,
      title: `Conditional approval conditions: ${rationale.slice(0, 120)}`,
      ownerName: "Vendor manager",
      dueAt: new Date(Date.now() + 60 * 86400000),
      status: "open",
    });
  }

  await audit(
    "assessment",
    id,
    "Decision recorded",
    `Decision: ${decision.replaceAll("_", " ")}. Next reassessment: ${next.toISOString().slice(0, 10)}.${rationale ? " Rationale: " + rationale : ""}`,
    user.id,
  );
  await audit("vendor", a.vendorId, "Decision recorded", `Assessment v${a.version} ${decision.replaceAll("_", " ")} by ${user.name}.`, user.id);
  revalidatePath(`/assessments/${id}`);
  revalidatePath(`/vendors/${a.vendorId}`);
}

export async function triggerReassessmentAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "intake")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  const reason = str(formData, "reason") || "Event-triggered reassessment";
  const a = await createAssessmentInternal(vendorId, reason, user.id);
  await audit("vendor", vendorId, "Reassessment triggered", reason, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  redirect(`/assessments/${a.id}`);
}

/* ------------------------------- resilience ------------------------------- */

export async function updateResilienceAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "review")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  const values = {
    continuityPlanStatus: str(formData, "continuityPlanStatus") || "none",
    exerciseOutcome: str(formData, "exerciseOutcome") || "not_run",
    lastExerciseAt: dateOrNull(str(formData, "lastExerciseAt")),
    rtoHours: intOrNull(str(formData, "rtoHours")),
    notes: str(formData, "notes"),
    updatedAt: new Date(),
  };
  await db.insert(resilienceRecords).values({ vendorId, ...values }).onConflictDoUpdate({
    target: resilienceRecords.vendorId,
    set: values,
  });
  await audit("vendor", vendorId, "Resilience updated", `Continuity plan: ${values.continuityPlanStatus}; exercise: ${values.exerciseOutcome}.`, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/services");
}

/* ------------------------ findings, actions, exceptions -------------------- */

export async function addFindingAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "review")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  const title = str(formData, "title");
  if (!title) throw new Error("Title required");
  await db.insert(findings).values({
    vendorId,
    assessmentId: intOrNull(str(formData, "assessmentId")),
    title,
    description: str(formData, "description"),
    severity: str(formData, "severity") || "medium",
    createdById: user.id,
  });
  await audit("vendor", vendorId, "Finding raised", title, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/actions");
}

export async function updateFindingStatusAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "review")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  if (!id) throw new Error("id required");
  const status = str(formData, "status");
  await db.update(findings).set({ status }).where(eq(findings.id, id));
  const f = await db.query.findings.findFirst({ where: eq(findings.id, id) });
  if (f) await audit("vendor", f.vendorId, "Finding updated", `"${f.title}" → ${status}.`, user.id);
  revalidatePath("/actions");
  if (f) revalidatePath(`/vendors/${f.vendorId}`);
}

export async function addActionItemAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "review")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  const title = str(formData, "title");
  if (!title) throw new Error("Title required");
  await db.insert(actions).values({
    vendorId,
    findingId: intOrNull(str(formData, "findingId")),
    title,
    ownerName: str(formData, "ownerName") || user.name,
    dueAt: dateOrNull(str(formData, "dueAt")),
  });
  await audit("vendor", vendorId, "Action created", title, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/actions");
}

export async function updateActionStatusAction(formData: FormData) {
  const user = await mustUser();
  const id = intOrNull(str(formData, "id"));
  if (!id) throw new Error("id required");
  const status = str(formData, "status");
  if (!["open", "in_progress", "done"].includes(status)) throw new Error("Bad status");
  const existing = await db.query.actions.findFirst({ where: eq(actions.id, id) });
  if (!existing) throw new Error("Action not found");
  if (user.role === "vendor" && user.vendorId !== existing.vendorId) throw new Error("Not permitted");
  await db
    .update(actions)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(eq(actions.id, id));
  await audit("vendor", existing.vendorId, "Action updated", `"${existing.title}" → ${status}.`, user.id);
  revalidatePath("/actions");
  revalidatePath(`/vendors/${existing.vendorId}`);
}

export async function addExceptionAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "review")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  await db.insert(exceptions).values({
    vendorId,
    title: str(formData, "title") || "Risk exception",
    rationale: str(formData, "rationale"),
    compensatingControls: str(formData, "compensatingControls"),
    expiresAt: dateOrNull(str(formData, "expiresAt")),
  });
  await audit("vendor", vendorId, "Exception proposed", str(formData, "title"), user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/exceptions");
}

export async function decideExceptionAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "exceptionApprove")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  if (!id) throw new Error("id required");
  const status = str(formData, "status");
  if (!["active", "retired"].includes(status)) throw new Error("Bad status");
  const ex = await db.query.exceptions.findFirst({ where: eq(exceptions.id, id) });
  if (!ex) throw new Error("Exception not found");
  await db.update(exceptions).set({ status, approvedById: user.id }).where(eq(exceptions.id, id));
  await audit("vendor", ex.vendorId, "Exception decision", `"${ex.title}" → ${status}.`, user.id);
  revalidatePath("/exceptions");
  revalidatePath(`/vendors/${ex.vendorId}`);
}

/* ========================================================================== */
/*  TPRM EXTENSIONS: profile, regulatory compliance, monitoring, scoring,     */
/*  access control, audit reports and prototype evaluation.                   */
/* ========================================================================== */

/* ------------------------- extended vendor profile ------------------------ */

export async function updateVendorProfileAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "intake")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  await db
    .update(vendors)
    .set({
      ownerName: str(formData, "ownerName"),
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail"),
      contractStart: dateOrNull(str(formData, "contractStart")),
      contractEnd: dateOrNull(str(formData, "contractEnd")),
      dpaStatus: str(formData, "dpaStatus") || "not_signed",
      dataCategories: str(formData, "dataCategories"),
      crossBorder: str(formData, "crossBorder"),
      exitPlanStatus: str(formData, "exitPlanStatus") || "none",
      insuranceExpiry: dateOrNull(str(formData, "insuranceExpiry")),
      notes: str(formData, "notes"),
    })
    .where(eq(vendors.id, vendorId));
  await syncVendorCompliance(vendorId);
  await audit("vendor", vendorId, "Contract & privacy record updated", `DPA: ${str(formData, "dpaStatus")}; exit plan: ${str(formData, "exitPlanStatus")}.`, user.id);
  revalidatePath(`/vendors/${vendorId}`);
}

export async function offboardVendorAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "intake")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  const v = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
  if (!v) throw new Error("Vendor not found");
  const next = v.status === "offboarded" ? "monitoring" : "offboarded";
  await db.update(vendors).set({ status: next }).where(eq(vendors.id, vendorId));
  await audit("vendor", vendorId, "Lifecycle status changed", `${v.name} → ${next}.`, user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/vendors");
}

/* --------------------- regulatory / standards compliance ------------------ */

export async function syncComplianceAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageCompliance")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!vendorId) throw new Error("vendorId required");
  await syncVendorCompliance(vendorId);
  await audit("vendor", vendorId, "Compliance register synced", "Standard applicability re-evaluated against the catalog.", user.id);
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/compliance");
}

export async function setComplianceAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageCompliance")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  const vendorId = intOrNull(str(formData, "vendorId"));
  const status = str(formData, "status");
  if (!id || !vendorId) throw new Error("Missing ids");
  if (!["not_assessed", "compliant", "partial", "non_compliant", "na"].includes(status))
    throw new Error("Bad status");
  const row = await db.query.vendorCompliance.findFirst({ where: eq(vendorCompliance.id, id) });
  if (!row) throw new Error("Compliance row not found");
  const std = await db.query.standards.findFirst({ where: eq(standards.id, row.standardId) });
  await db
    .update(vendorCompliance)
    .set({
      status,
      notes: str(formData, "notes") || row.notes,
      assessedById: user.id,
      assessedAt: new Date(),
      nextReviewAt: dateOrNull(str(formData, "nextReviewAt")) ?? row.nextReviewAt,
    })
    .where(eq(vendorCompliance.id, id));
  await audit(
    "vendor",
    vendorId,
    "Compliance assessed",
    `${std?.code ?? "standard"} → ${status.replaceAll("_", " ")}.`,
    user.id,
  );
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/compliance");
}

/* --------------------------- scoring configuration ------------------------ */

export async function saveScoringConfigAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "configureScoring")) throw new Error("Not permitted");
  const weightKeys = [
    ["w_serviceCriticality", "Service criticality weight"],
    ["w_dataSensitivity", "Data sensitivity weight"],
    ["w_systemAccess", "System access weight"],
    ["w_dependency", "Dependency / concentration weight"],
    ["w_geographicExposure", "Geographic exposure weight"],
  ] as const;
  let total = 0;
  const weightValues: { key: string; label: string; value: number }[] = [];
  for (const [key, label] of weightKeys) {
    const pct = Number(str(formData, key));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error(`Invalid weight: ${label}`);
    total += pct;
    weightValues.push({ key, label, value: Math.round(pct * 1000) });
  }
  if (Math.abs(total - 100) > 0.5) throw new Error(`Weights must sum to 100% (currently ${total.toFixed(1)}%)`);
  const cap = Number(str(formData, "mitigation_cap"));
  if (!Number.isFinite(cap) || cap < 0 || cap > 100) throw new Error("Mitigation cap must be 0-100");
  const tm = int(Number(str(formData, "tier_moderate")), 40);
  const th = int(Number(str(formData, "tier_high")), 60);
  const tc = int(Number(str(formData, "tier_critical")), 80);
  if (!(tm < th && th < tc)) throw new Error("Tier thresholds must be ascending");

  const rows = [
    ...weightValues,
    { key: "mitigation_cap", label: "Maximum mitigation from controls", value: Math.round(cap * 1000) },
    { key: "tier_moderate", label: "Moderate tier threshold", value: tm },
    { key: "tier_high", label: "High tier threshold", value: th },
    { key: "tier_critical", label: "Critical tier threshold", value: tc },
  ];
  for (const r of rows) {
    await db
      .insert(scoringConfig)
      .values({ ...r, updatedById: user.id, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: scoringConfig.key,
        set: { value: r.value, label: r.label, updatedById: user.id, updatedAt: new Date() },
      });
  }
  await audit(
    "config",
    0,
    "Scoring model updated",
    `Weights: ${weightValues.map((w) => `${w.key.replace("w_", "")} ${(w.value / 1000) * 100}%`).join(", ")}; mitigation cap ${cap}%; tiers ${tm}/${th}/${tc}.`,
    user.id,
  );
  revalidatePath("/settings");
  revalidatePath("/vendors");
  revalidatePath("/");
}

function int(v: number, fallback: number) {
  return Number.isFinite(v) ? Math.round(v) : fallback;
}

/* ---------------------- continuous monitoring & triggers ------------------ */

export async function addIncidentAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageMonitoring")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  const title = str(formData, "title");
  if (!vendorId || !title) throw new Error("Vendor and title required");
  const severity = str(formData, "severity") || "medium";
  const [inc] = await db
    .insert(incidents)
    .values({
      vendorId,
      title,
      severity,
      occurredAt: dateOrNull(str(formData, "occurredAt")) ?? new Date(),
      notifiedAt: dateOrNull(str(formData, "notifiedAt")),
      description: str(formData, "description"),
      createdById: user.id,
    })
    .returning();
  await audit("vendor", vendorId, "Incident recorded", `${severity.toUpperCase()}: ${title}`, user.id);
  // High/critical incidents automatically raise a reassessment trigger.
  if (severity === "high" || severity === "critical") {
    await db.insert(reassessmentTriggers).values({
      vendorId,
      triggerType: "incident",
      reason: `${severity.toUpperCase()} severity incident: ${title}`,
      createdById: user.id,
    });
    await audit("vendor", vendorId, "Reassessment trigger raised", `Auto-triggered by ${severity} incident #${inc.id}.`, user.id);
  }
  revalidatePath("/monitoring");
  revalidatePath(`/vendors/${vendorId}`);
}

export async function updateIncidentStatusAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageMonitoring")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  const status = str(formData, "status");
  if (!id || !["open", "investigating", "contained", "closed"].includes(status)) throw new Error("Bad input");
  const inc = await db.query.incidents.findFirst({ where: eq(incidents.id, id) });
  if (!inc) throw new Error("Incident not found");
  await db.update(incidents).set({ status }).where(eq(incidents.id, id));
  await audit("vendor", inc.vendorId, "Incident updated", `"${inc.title}" → ${status}.`, user.id);
  revalidatePath("/monitoring");
  revalidatePath(`/vendors/${inc.vendorId}`);
}

export async function addSubProcessorAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageMonitoring")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  const name = str(formData, "name");
  if (!vendorId || !name) throw new Error("Vendor and name required");
  await db.insert(subProcessors).values({
    vendorId,
    name,
    country: str(formData, "country"),
    purpose: str(formData, "purpose"),
    dataCategories: str(formData, "dataCategories"),
    dpaStatus: str(formData, "dpaStatus") || "not_signed",
    notifiedAt: dateOrNull(str(formData, "notifiedAt")) ?? new Date(),
  });
  await audit("vendor", vendorId, "Fourth party registered", `${name} recorded as a sub-processor.`, user.id);
  revalidatePath("/monitoring");
  revalidatePath(`/vendors/${vendorId}`);
}

export async function removeSubProcessorAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageMonitoring")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  const vendorId = intOrNull(str(formData, "vendorId"));
  if (!id || !vendorId) throw new Error("Missing ids");
  await db.delete(subProcessors).where(eq(subProcessors.id, id));
  await audit("vendor", vendorId, "Fourth party removed", `Sub-processor #${id} removed.`, user.id);
  revalidatePath("/monitoring");
  revalidatePath(`/vendors/${vendorId}`);
}

export async function raiseTriggerAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageMonitoring")) throw new Error("Not permitted");
  const vendorId = intOrNull(str(formData, "vendorId"));
  const reason = str(formData, "reason");
  if (!vendorId || !reason) throw new Error("Vendor and reason required");
  const type = str(formData, "triggerType") || "manual";
  await db.insert(reassessmentTriggers).values({ vendorId, triggerType: type, reason, createdById: user.id });
  await audit("vendor", vendorId, "Reassessment trigger raised", `${type}: ${reason}`, user.id);
  revalidatePath("/monitoring");
  revalidatePath(`/vendors/${vendorId}`);
}

export async function resolveTriggerAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageMonitoring")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  const decision = str(formData, "decision"); // converted | dismissed
  if (!id || !["converted", "dismissed"].includes(decision)) throw new Error("Bad input");
  const trg = await db.query.reassessmentTriggers.findFirst({ where: eq(reassessmentTriggers.id, id) });
  if (!trg) throw new Error("Trigger not found");
  await db.update(reassessmentTriggers).set({ status: decision }).where(eq(reassessmentTriggers.id, id));
  let assessmentId: number | null = null;
  if (decision === "converted") {
    const a = await createAssessmentInternal(trg.vendorId, `Trigger: ${trg.reason}`, user.id);
    assessmentId = a.id;
  }
  await audit("vendor", trg.vendorId, "Trigger resolved", `Trigger #${id} ${decision}.`, user.id);
  revalidatePath("/monitoring");
  revalidatePath(`/vendors/${trg.vendorId}`);
  if (assessmentId) redirect(`/assessments/${assessmentId}`);
}

/* --------------------------- access control (RBAC) ------------------------ */

export async function createUserAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageUsers")) throw new Error("Not permitted");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const role = str(formData, "role") || "reviewer";
  if (!name || !email) throw new Error("Name and email required");
  if (!["admin", "reviewer", "approver", "vendor", "auditor"].includes(role)) throw new Error("Bad role");
  const vendorId = role === "vendor" ? intOrNull(str(formData, "vendorId")) : null;
  if (role === "vendor" && !vendorId) throw new Error("Vendor representatives must be linked to a vendor");
  const exists = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (exists) throw new Error("A user with that email already exists");
  const [created] = await db.insert(users).values({ name, email, role, vendorId }).returning();
  await audit("user", created.id, "User created", `${name} (${role}${vendorId ? `, vendor #${vendorId}` : ""}) provisioned.`, user.id);
  revalidatePath("/access");
}

export async function updateUserAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageUsers")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  if (!id) throw new Error("id required");
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) throw new Error("User not found");
  const role = str(formData, "role") || target.role;
  const vendorId = role === "vendor" ? intOrNull(str(formData, "vendorId")) : null;
  if (target.id === user.id && role !== "admin")
    throw new Error("You cannot remove your own administrator role");
  await db.update(users).set({ role, vendorId }).where(eq(users.id, id));
  await audit("user", id, "Access updated", `${target.name} → ${role}${vendorId ? ` (vendor #${vendorId})` : ""}.`, user.id);
  revalidatePath("/access");
}

export async function toggleUserActiveAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageUsers")) throw new Error("Not permitted");
  const id = intOrNull(str(formData, "id"));
  if (!id) throw new Error("id required");
  if (id === user.id) throw new Error("You cannot deactivate your own account");
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) throw new Error("User not found");
  const next = !(target.isActive ?? true);
  await db.update(users).set({ isActive: next }).where(eq(users.id, id));
  await audit("user", id, next ? "Account reactivated" : "Account deactivated", `${target.name} ${next ? "re-enabled" : "disabled"}.`, user.id);
  revalidatePath("/access");
}

/* ------------------------- audit report generation ------------------------ */

export async function generateReportAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "generateReports")) throw new Error("Not permitted");
  const reportType = str(formData, "reportType") || "portfolio";
  const vendorId = intOrNull(str(formData, "vendorId"));
  const title = str(formData, "title");
  const snap = await getPortfolioSnapshot();
  const vendor = vendorId ? snap.summaries.find((s) => s.vendor.id === vendorId) : null;
  if ((reportType === "vendor" || reportType === "evidence") && !vendorId)
    throw new Error("Select a vendor for this report type");
  const defaultTitles: Record<string, string> = {
    portfolio: "TPRM portfolio risk report",
    vendor: vendor ? `Vendor due-diligence report — ${vendor.vendor.name}` : "Vendor due-diligence report",
    compliance: "Regulatory compliance coverage report",
    audit_trail: "Audit trail extract",
    evidence: vendor ? `Evidence confidence report — ${vendor.vendor.name}` : "Evidence confidence report",
    findings: "Findings, actions & exceptions report",
    access: "Access control & RBAC report",
    evaluation: "Prototype evaluation report",
  };
  const snapshot = {
    generatedAt: new Date().toISOString(),
    generatedBy: user.name,
    reportType,
    vendorId,
    summary: {
      vendorCount: snap.vendorCount,
      tiers: snap.tiers,
      openFindings: snap.openFindings,
      openActions: snap.openActions,
      overdueActions: snap.overdueActions,
      activeExceptions: snap.activeExceptions,
      evidenceVerified: snap.evidenceVerified,
      evidenceTotal: snap.evidenceTotal,
      resilienceAtRisk: snap.resilienceAtRisk,
      standardsTracked: snap.standardsTracked,
      complianceAssessed: snap.complianceAssessed,
      complianceCompliant: snap.complianceCompliant,
      assessmentsInFlight: snap.assessmentsInFlight,
    },
    vendors: snap.summaries.map((s) => ({
      id: s.vendor.id,
      name: s.vendor.name,
      tier: s.inherent.tier,
      inherent: s.inherent.score,
      resilience: s.resilience.score,
      complianceCoverage: s.complianceCoverage,
      complianceGaps: s.complianceGaps,
      evidenceAttention: s.evidenceAttention,
      openActions: s.openActions,
      openIncidents: s.openIncidents,
      status: s.vendor.status,
    })),
  };
  const [report] = await db
    .insert(auditReports)
    .values({
      title: title || defaultTitles[reportType] || "TPRM report",
      reportType,
      vendorId: vendorId ?? null,
      generatedById: user.id,
      generatedByName: user.name,
      snapshot: JSON.stringify(snapshot),
    })
    .returning();
  await audit("report", report.id, "Report generated", `${report.title} (${reportType}) produced by ${user.name}.`, user.id);
  revalidatePath("/reports/generated");
  redirect(`/reports/generated/${report.id}`);
}

/* --------------------------- prototype evaluation ------------------------- */

export async function addEvaluationTaskAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "manageQuestionnaires")) throw new Error("Not permitted");
  const title = str(formData, "title");
  if (!title) throw new Error("Title required");
  const [t] = await db
    .insert(evaluationTasks)
    .values({
      title,
      scenario: str(formData, "scenario"),
      instructions: str(formData, "instructions"),
      expectedOutcome: str(formData, "expectedOutcome"),
      position: int(Number(str(formData, "position")), 0),
    })
    .returning();
  await audit("evaluation", t.id, "Evaluation task added", title, user.id);
  revalidatePath("/evaluation");
}

export async function submitEvaluationAction(formData: FormData) {
  const user = await mustUser();
  if (!can(user, "submitEvaluation")) throw new Error("Not permitted");
  const taskId = intOrNull(str(formData, "taskId"));
  const scoreOf = (k: string) => {
    const n = intOrNull(str(formData, k));
    return n && n >= 1 && n <= 5 ? n : null;
  };
  await db.insert(evaluationFeedback).values({
    taskId: taskId ?? null,
    respondentName: str(formData, "respondentName") || user.name,
    respondentRole: str(formData, "respondentRole") || user.role,
    taskCompletion: scoreOf("taskCompletion"),
    ease: scoreOf("ease"),
    clarity: scoreOf("clarity"),
    traceability: scoreOf("traceability"),
    usefulness: scoreOf("usefulness"),
    comments: str(formData, "comments"),
  });
  const task = taskId ? await db.query.evaluationTasks.findFirst({ where: eq(evaluationTasks.id, taskId) }) : null;
  await audit(
    "evaluation",
    taskId ?? 0,
    "Evaluation feedback recorded",
    `${user.name} rated${task ? ` "${task.title}"` : " the prototype"}.`,
    user.id,
  );
  revalidatePath("/evaluation");
}
