import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarClock, CircleCheck, Send, ShieldQuestion } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/auth";
import { getAssessmentBundle } from "@/lib/data";
import {
  decideAssessmentAction, sendForDecisionAction, submitAssessmentAction,
} from "@/app/actions";
import { AnswerRow } from "@/components/assessment-forms";
import { AssessmentStatusPill, Card, EmptyState, Pill, ScoreDial, SectionTitle, VendorStatusPill } from "@/components/ui";
import { RESILIENCE_META, TIER_META, tierOf } from "@/lib/scoring";
import { cn, effectiveEvidenceStatus, fmtDate, daysFromNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEPS = ["issued", "in_review", "decision_pending", "approved"] as const;

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const assessmentId = parseInt(id, 10);
  if (!Number.isFinite(assessmentId)) notFound();

  const bundle = await getAssessmentBundle(assessmentId);
  if (!bundle) notFound();
  const { assessment, vendor, domains, evidence, resilienceScore, scores, reviewer, decider, trail, deps } = bundle;

  // Vendor reps only see their own vendor's assessment
  if (user.role === "vendor" && user.vendorId !== vendor.id) redirect("/assessments");

  const decided = ["approved", "conditionally_approved", "on_hold"].includes(assessment.status);
  const stepIdx = assessment.status === "approved" || assessment.status === "conditionally_approved"
    ? 3
    : assessment.status === "on_hold"
      ? 3
      : STEPS.indexOf(assessment.status as (typeof STEPS)[number]);

  const vendorCanAnswer = !decided && ["issued", "draft"].includes(assessment.status) &&
    (user.role === "admin" || (user.role === "vendor" && user.vendorId === vendor.id));
  const canReview = can(user, "review");
  const canDecide = can(user, "decide");

  const evidenceOptions = evidence.map((e) => ({
    id: e.id,
    title: e.title,
    status: effectiveEvidenceStatus(e.status, e.validUntil),
  }));

  const resMeta = RESILIENCE_META[resilienceScore.status];
  const inhTierMeta = TIER_META[scores.inherent.tier];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/assessments" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 no-print">
        <ArrowLeft className="h-3.5 w-3.5" /> All assessments
      </Link>

      {/* Header + stepper */}
      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Link href={`/vendors/${vendor.id}`} className="font-display text-2xl font-bold tracking-tight text-zinc-50 hover:text-teal-300">
                {vendor.name}
              </Link>
              <span className="font-mono text-sm text-zinc-500">v{assessment.version}</span>
              <AssessmentStatusPill status={assessment.status} />
            </div>
            <p className="mt-1 max-w-2xl text-[13px] text-zinc-500">{assessment.triggerReason}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-zinc-400">
              <span>Issued {fmtDate(assessment.issuedAt)}</span>
              <span className={cn(daysFromNow(assessment.dueAt) != null && daysFromNow(assessment.dueAt)! < 0 && !decided ? "text-rose-300" : "")}>
                Due {fmtDate(assessment.dueAt)}
                {!decided && daysFromNow(assessment.dueAt) != null && ` (${daysFromNow(assessment.dueAt)}d)`}
              </span>
              {assessment.submittedAt && <span>Submitted {fmtDate(assessment.submittedAt)}</span>}
              <span>Supports: {deps.map((d) => d.service.name).join(", ") || "not mapped"}</span>
            </div>
          </div>
          {user.role === "vendor" && vendorCanAnswer && (
            <form action={submitAssessmentAction}>
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <button className="btn btn-primary"><Send className="h-3.5 w-3.5" strokeWidth={2} />Submit responses for review</button>
            </form>
          )}
        </div>

        {/* lifecycle stepper */}
        <div className="mt-6 flex items-center gap-0 no-print">
          {["Issued", "Responses & evidence", "In review", "Human decision"].map((label, i) => {
            const state = assessment.status === "on_hold" && i === 3 ? "hold" : i < stepIdx ? "done" : i === stepIdx ? "current" : "todo";
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold",
                    state === "done" && "border-teal-400/50 bg-teal-400/15 text-teal-300",
                    state === "current" && "border-teal-400 bg-teal-400 text-[#062622]",
                    state === "todo" && "border-white/15 text-zinc-500",
                    state === "hold" && "border-orange-400/60 bg-orange-400/15 text-orange-300",
                  )}>
                    {state === "done" ? <CircleCheck className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn("text-[11px] font-medium", state === "current" ? "text-teal-300" : state === "done" ? "text-zinc-300" : "text-zinc-500")}>
                    {state === "hold" ? "On hold" : label}
                  </span>
                </div>
                {i < 3 && <div className={cn("mx-3 h-px flex-1", state === "done" ? "bg-teal-400/50" : "bg-white/10")} />}
              </div>
            );
          })}
        </div>
      </header>

      {/* Decision banner */}
      {decided && (
        <div className={cn("card flex items-start gap-4 border p-5", {
          "border-emerald-400/25": assessment.status === "approved",
          "border-teal-400/25": assessment.status === "conditionally_approved",
          "border-orange-400/25": assessment.status === "on_hold",
        })}>
          <BadgeCheck className={cn("mt-0.5 h-5 w-5 shrink-0", {
            "text-emerald-300": assessment.status === "approved",
            "text-teal-300": assessment.status === "conditionally_approved",
            "text-orange-300": assessment.status === "on_hold",
          })} strokeWidth={1.8} />
          <div className="flex-1 text-[13px]">
            <div className="font-semibold text-zinc-100">
              Decision: {assessment.decision?.replaceAll("_", " ") ?? assessment.status}
              {decider && <span className="font-normal text-zinc-500"> by {decider.name} on {fmtDate(assessment.decidedAt)}</span>}
            </div>
            {assessment.decisionRationale && <p className="mt-1 leading-relaxed text-zinc-400">{assessment.decisionRationale}</p>}
            {assessment.nextReassessmentAt && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-300/90">
                <CalendarClock className="h-3.5 w-3.5" /> Next reassessment scheduled for {fmtDate(assessment.nextReassessmentAt)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scores */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-zinc-100">Explainable scoring</h2>
          <span className="text-[11px] text-zinc-500">Decision aid — no score approves a supplier by itself</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ScoreDial label="Inherent exposure" score={scores.inherent.score} tier={scores.inherent.tier} hint="Weighted triage factors, before controls" />
          <ScoreDial
            label="Control effectiveness"
            score={scores.control.score}
            tier={scores.control.score == null ? undefined : tierOf(100 - scores.control.score)}
            hint={scores.control.answered === scores.control.total ? `${scores.control.answered}/${scores.control.total} questions answered` : `${scores.control.answered}/${scores.control.total} answered — incomplete`}
          />
          <ScoreDial label="Residual risk view" score={scores.residual} tier={scores.residual == null ? undefined : tierOf(scores.residual)} hint="Inherent mitigated by reviewed controls" />
          <ScoreDial
            label="Evidence confidence"
            score={scores.confidence.score}
            tier={tierOf(100 - scores.confidence.score)}
            hint={`${scores.confidence.covered}/${scores.confidence.required} evidence-required answers backed by an item`}
          />
        </div>

        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {/* inherent factors */}
          <Card>
            <SectionTitle title="Inherent factor contributions" hint="Triage inputs × configurable weights" />
            <div className="space-y-2.5">
              {scores.inherent.contributions.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2 text-[12px]">
                  <div>
                    <div className="font-medium text-zinc-300">{c.label}</div>
                    <div className="text-[10.5px] text-zinc-600">{c.inputLabel}</div>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {c.value}×{(c.weight * 100).toFixed(0)}% = <span className="text-zinc-100">{c.points}</span>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-white/8 pt-2 text-[12.5px]">
                <span className="font-medium">Total</span>
                <span className={cn("font-mono font-semibold", inhTierMeta.cls.split(" ")[0])}>{scores.inherent.score}/100 · {inhTierMeta.label}</span>
              </div>
            </div>
          </Card>

          {/* confidence breakdown */}
          <Card>
            <SectionTitle title="Evidence confidence" hint="Freshness & verification of supporting items" />
            {scores.confidence.required === 0 ? (
              <EmptyState title="No evidence-required answers yet" />
            ) : (
              <div className="space-y-2.5 text-[12px]">
                {(
                  [
                    ["verified", "Verified by reviewer", scores.confidence.breakdown.verified, "text-emerald-300"],
                    ["submitted", "Submitted, awaiting review", scores.confidence.breakdown.submitted, "text-sky-300"],
                    ["stale", "Expired / stale", scores.confidence.breakdown.stale, "text-amber-300"],
                    ["missing", "Missing (no item linked)", scores.confidence.breakdown.missing, "text-zinc-400"],
                  ] as const
                ).map(([k, label, n, cls]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-zinc-400">{label}</span>
                    <span className={cn("font-mono", cls)}>{n}</span>
                  </div>
                ))}
                <p className="rounded-lg border border-white/6 bg-white/2 p-2.5 text-[11px] leading-relaxed text-zinc-500">
                  Missing or expired evidence lowers <span className="text-zinc-300">confidence</span> — it is not treated as proof that a control has failed.
                </p>
              </div>
            )}
          </Card>

          {/* resilience - deliberately separate */}
          <Card className="border-teal-400/15">
            <SectionTitle title="Resilience readiness (separate)" hint="Never merged into the cyber risk rating" />
            <div className="flex items-center gap-3">
              <span className="font-mono text-3xl font-semibold text-zinc-100">{resilienceScore.score ?? "—"}</span>
              <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", resMeta.cls)}>{resMeta.label}</span>
            </div>
            <div className="mt-3 space-y-2">
              {resilienceScore.parts.map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="w-36 text-[11.5px] text-zinc-400">{p.label}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-white/5">
                    <div className={cn("h-1.5 rounded-full", p.value >= 80 ? "bg-emerald-400" : p.value >= 50 ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${p.value}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] text-zinc-500">{p.value}</span>
                </div>
              ))}
            </div>
            <Link href={`/vendors/${vendor.id}#resilience`} className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-teal-300 hover:text-teal-200">
              Update continuity record <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>
        </div>
      </section>

      {/* Questionnaire */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-zinc-100">
            Questionnaire responses
          </h2>
          <span className="text-[11px] text-zinc-500">Template v1.2 · answers autosave per question</span>
        </div>
        {[...domains.entries()].map(([domain, rows]) => (
          <Card key={domain}>
            <SectionTitle title={domain} hint={`${rows.filter((r) => r.a?.response).length}/${rows.length} answered`} />
            <div className="divide-y divide-white/5">
              {rows.map(({ q, a }) => {
                const linkedEv = a?.evidenceId ? evidence.find((e) => e.id === a.evidenceId) : null;
                const eff = linkedEv ? effectiveEvidenceStatus(linkedEv.status, linkedEv.validUntil) : null;
                return (
                  <div key={q.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className="max-w-2xl text-[13px] leading-relaxed text-zinc-200">{q.text}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {q.evidenceRequired && (
                          <span className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">
                            <ShieldQuestion className="h-3 w-3" /> evidence expected
                          </span>
                        )}
                        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-500">w{q.weight}</span>
                      </div>
                    </div>
                    <AnswerRow
                      assessmentId={assessment.id}
                      questionId={q.id}
                      response={a?.response ?? null}
                      comment={a?.comment ?? ""}
                      evidenceId={a?.evidenceId ?? null}
                      evidenceOptions={evidenceOptions}
                      editable={vendorCanAnswer}
                      effectiveStatus={eff}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </section>

      {/* Reviewer + approver panels */}
      <div className="grid gap-5 lg:grid-cols-2 no-print">
        <Card>
          <SectionTitle title="Reviewer workspace" hint="Verify evidence on the vendor page, then record your rationale" />
          {assessment.reviewerId && reviewer ? (
            <p className="mb-3 rounded-lg border border-white/6 bg-white/2 px-3 py-2 text-[12px] text-zinc-400">
              Reviewer: <span className="text-zinc-200">{reviewer.name}</span>
            </p>
          ) : null}
          {canReview && assessment.status === "in_review" ? (
            <form action={sendForDecisionAction} className="space-y-3">
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <textarea
                name="rationale"
                rows={4}
                required
                className="textarea"
                placeholder="Summarise what the evidence supports, remaining gaps, and your recommendation to the approver…"
              />
              <button className="btn btn-primary"><Send className="h-3.5 w-3.5" strokeWidth={2} />Send for decision</button>
            </form>
          ) : (
            <p className="text-[12px] leading-relaxed text-zinc-500">
              {assessment.reviewerRationale
                ? <>Rationale on record: <span className="text-zinc-300">“{assessment.reviewerRationale}”</span></>
                : assessment.status === "issued"
                  ? "Awaiting vendor responses before review can begin."
                  : "Review actions are available to reviewers once responses are submitted."}
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle title="Approver decision" hint="Human approval — the score informs, it never decides" />
          {canDecide && assessment.status === "decision_pending" ? (
            <form action={decideAssessmentAction} className="space-y-3">
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "approved", l: "Approve", cls: "peer-checked:border-emerald-400/60 peer-checked:bg-emerald-400/10 peer-checked:text-emerald-200" },
                  { v: "conditionally_approved", l: "Conditional approval", cls: "peer-checked:border-teal-400/60 peer-checked:bg-teal-400/10 peer-checked:text-teal-200" },
                  { v: "on_hold", l: "Hold", cls: "peer-checked:border-orange-400/60 peer-checked:bg-orange-400/10 peer-checked:text-orange-200" },
                  { v: "rejected", l: "Reject", cls: "peer-checked:border-rose-400/60 peer-checked:bg-rose-400/10 peer-checked:text-rose-200" },
                ].map((o) => (
                  <label key={o.v} className="cursor-pointer">
                    <input type="radio" name="decision" value={o.v} className="peer sr-only" required />
                    <span className={cn("block rounded-lg border border-white/10 px-3 py-2 text-center text-[12px] font-medium text-zinc-400 transition-all", o.cls)}>
                      {o.l}
                    </span>
                  </label>
                ))}
              </div>
              <textarea name="rationale" rows={3} className="textarea" placeholder="Decision rationale / conditions (required for conditional approval)…" />
              <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                <span>Reassess in</span>
                <select name="horizonMonths" className="select !w-auto !py-1.5" defaultValue="12">
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                </select>
                <button className="btn btn-primary ml-auto">Record decision</button>
              </div>
            </form>
          ) : decided ? (
            <div className="text-[12px] text-zinc-400">
              Decision recorded{decider ? ` by ${decider.name}` : ""} on {fmtDate(assessment.decidedAt)}.
              {assessment.decisionRationale && <p className="mt-1.5 leading-relaxed text-zinc-500">“{assessment.decisionRationale}”</p>}
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-zinc-500">
              The decision opens for approvers after the reviewer sends the assessment forward.
            </p>
          )}
        </Card>
      </div>

      {/* Trail */}
      {trail.length > 0 && (
        <Card>
          <SectionTitle title="Assessment audit trail" hint="Immutable record of who did what, and why" />
          <ol className="relative space-y-3.5 border-l border-white/8 pl-5">
            {trail.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#10161d] bg-teal-400/70" />
                <div className="text-[12px] font-medium text-zinc-200">{e.action}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">{e.detail}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">{e.actorName} · {fmtDate(e.createdAt)}</div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
