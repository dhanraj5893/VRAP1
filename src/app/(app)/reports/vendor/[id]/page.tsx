import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Shield, FileText, AlertTriangle, CheckCircle2, XCircle, Clock, Building2, Calendar, User, Mail, Globe, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getVendorBundle, getAssessmentBundle } from "@/lib/data";
import { PrintButton } from "@/components/client-bits";
import { RESILIENCE_META, TIER_META, tierOf } from "@/lib/scoring";
import { effectiveEvidenceStatus, fmtDate, EVIDENCE_META, ASSESSMENT_STATUS_META, SEVERITY_META } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// ─── Tiny helpers ────────────────────────────────────────────────────────────

function ScoreRing({ score, tier }: { score: number | null; tier?: string }) {
  const t = tier ?? (score != null ? (score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "moderate" : "low") : "low");
  const meta = TIER_META[t as keyof typeof TIER_META];
  const pct = score ?? 0;
  const circ = 2 * Math.PI * 30;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex h-20 w-20 items-center justify-center print:h-16 print:w-16">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="34" cy="34" r="30" fill="none"
          stroke={meta?.hex ?? "#71717a"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset="0"
        />
      </svg>
      <div className="text-center">
        <div className="font-mono text-lg font-bold leading-none" style={{ color: meta?.hex ?? "#71717a" }}>
          {score ?? "—"}
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-wider opacity-60">{meta?.label ?? "—"}</div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="report-stat-box">
      <div className="text-[10px] font-medium uppercase tracking-widest opacity-60">{label}</div>
      <div className={cn("mt-1.5 text-2xl font-bold font-mono leading-none", color ?? "text-zinc-100")}>{value}</div>
      {sub && <div className="mt-1 text-[10.5px] capitalize opacity-50">{sub}</div>}
    </div>
  );
}

function RiskBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? "#fb7185" : pct >= 60 ? "#fbbf24" : pct >= 40 ? "#38bdf8" : "#34d399";
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: "bg-emerald-400", submitted: "bg-sky-400", stale: "bg-amber-400",
    missing: "bg-zinc-500", rejected: "bg-rose-400", clarification_requested: "bg-violet-400",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", map[status] ?? "bg-zinc-500")} />;
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical" || severity === "high") return <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />;
  if (severity === "medium") return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  return <AlertTriangle className="h-3.5 w-3.5 text-sky-400" />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default async function VendorSummaryReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role === "vendor") redirect("/");

  const { id } = await params;
  const vendorId = parseInt(id, 10);
  const bundle = await getVendorBundle(vendorId);
  if (!bundle) notFound();

  const {
    vendor, deps, assessments: vAssessments, evidence: vEvidence,
    resilience, resilienceScore, findings: vFindings, actions: vActions,
    exceptions: vExceptions, inherent,
  } = bundle;

  const latest = vAssessments[0] ?? null;
  const latestBundle = latest ? await getAssessmentBundle(latest.id) : null;

  const openFindings = vFindings.filter((f) => !["closed", "mitigated"].includes(f.status));
  const openActions = vActions.filter((a) => a.status !== "done");
  const activeExceptions = vExceptions.filter((e) => e.status !== "retired");

  const evByStatus = {
    verified: vEvidence.filter((e) => effectiveEvidenceStatus(e.status, e.validUntil) === "verified"),
    submitted: vEvidence.filter((e) => effectiveEvidenceStatus(e.status, e.validUntil) === "submitted"),
    stale: vEvidence.filter((e) => effectiveEvidenceStatus(e.status, e.validUntil) === "stale"),
    missing: vEvidence.filter((e) => effectiveEvidenceStatus(e.status, e.validUntil) === "missing"),
    clarification: vEvidence.filter((e) => effectiveEvidenceStatus(e.status, e.validUntil) === "clarification_requested"),
    rejected: vEvidence.filter((e) => effectiveEvidenceStatus(e.status, e.validUntil) === "rejected"),
  };

  const criticalDeps = deps.filter((d) => d.service.criticality === "critical");
  const residual = latestBundle?.scores?.residual ?? null;
  const confidence = latestBundle?.scores?.confidence?.score ?? null;

  const overallRisk = residual ?? inherent.score;
  const overallTier = residual != null ? tierOf(residual) : inherent.tier;
  const overallMeta = TIER_META[overallTier];

  // Determine overall recommendation
  const recommendation =
    latest?.decision === "approved" ? { label: "Approved", color: "text-emerald-400", icon: "✓" }
    : latest?.decision === "conditionally_approved" ? { label: "Conditionally Approved", color: "text-teal-400", icon: "✓" }
    : latest?.decision === "on_hold" ? { label: "On Hold", color: "text-orange-400", icon: "⏸" }
    : latest?.decision === "rejected" ? { label: "Rejected", color: "text-rose-400", icon: "✕" }
    : { label: "Pending Review", color: "text-zinc-400", icon: "?" };

  const now = new Date();

  return (
    <>
      {/* Screen toolbar */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to reports
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-600">Generated {now.toLocaleString("en-GB")}</span>
          <PrintButton />
        </div>
      </div>

      {/* ── REPORT CONTAINER ── */}
      <div className="report-page mx-auto max-w-5xl space-y-0 print:max-w-none">

        {/* ══ COVER / HEADER ══ */}
        <div className="report-cover mb-6 overflow-hidden rounded-2xl border border-white/10 print:rounded-none print:border-0">

          {/* Top accent bar */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${overallMeta.hex}, #2dd4bf, #38bdf8)` }} />

          <div className="bg-gradient-to-br from-[#0f1923] to-[#0a1018] p-8 print:bg-white print:from-white print:to-white print:text-black">
            <div className="flex flex-wrap items-start justify-between gap-6">
              {/* Left: vendor identity */}
              <div className="flex-1 min-w-0">
                {/* Document label */}
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-teal-400 print:text-teal-600" strokeWidth={2} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-400 print:text-teal-700">
                    Vendor Risk Assessment Report
                  </span>
                </div>

                <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 print:text-zinc-900">
                  {vendor.name}
                </h1>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-zinc-400 print:text-zinc-600">
                  <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{vendor.category}</span>
                  <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{vendor.country}</span>
                  <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{vendor.ownerName}</span>
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{vendor.contactEmail}</span>
                </div>

                {/* Flags */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {vendor.personalDataFlag && (
                    <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-0.5 text-[10px] font-medium text-violet-300 print:border-violet-600 print:text-violet-700">
                      Processes Personal Data (PII)
                    </span>
                  )}
                  {vendor.aiUseFlag && (
                    <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-medium text-sky-300 print:border-sky-600 print:text-sky-700">
                      AI in Scope
                    </span>
                  )}
                  {criticalDeps.length > 0 && (
                    <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 text-[10px] font-medium text-rose-300 print:border-rose-600 print:text-rose-700">
                      Critical Business Service Dependency
                    </span>
                  )}
                </div>
              </div>

              {/* Right: summary score widget */}
              <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/3 p-5 print:border-zinc-200 print:bg-zinc-50">
                <ScoreRing score={overallRisk} tier={overallTier} />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 print:text-zinc-500">Risk exposure</div>
                  <div className={cn("text-sm font-semibold", overallMeta.cls.split(" ")[0])}>{overallMeta.label}</div>
                  <div className="mt-1 text-[10px] text-zinc-600">{residual != null ? "Residual (post-controls)" : "Inherent (pre-controls)"}</div>
                </div>
              </div>
            </div>

            {/* Metadata strip */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/8 pt-4 text-[11px] text-zinc-500 print:border-zinc-200 print:text-zinc-500">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Report generated: {fmtDate(now)}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Onboarded: {fmtDate(vendor.onboardedAt)}</span>
              {vendor.nextReassessmentAt && (
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" />Next reassessment: {fmtDate(vendor.nextReassessmentAt)}</span>
              )}
              {latest && (
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Assessment v{latest.version} · <span className={cn("font-medium", recommendation.color)}>{recommendation.icon} {recommendation.label}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══ EXECUTIVE SUMMARY SCORES ══ */}
        <ReportSection title="Executive Summary" subtitle="Key risk indicators at a glance">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox
              label="Inherent Exposure"
              value={String(inherent.score)}
              sub={inherent.tier + " tier"}
              color={TIER_META[inherent.tier].cls.split(" ")[0]}
            />
            <StatBox
              label="Residual Risk"
              value={residual != null ? String(residual) : "—"}
              sub={residual != null ? tierOf(residual) + " tier" : "no review yet"}
              color={residual != null ? TIER_META[tierOf(residual)].cls.split(" ")[0] : "text-zinc-500"}
            />
            <StatBox
              label="Evidence Confidence"
              value={confidence != null ? `${confidence}%` : "—"}
              sub="evidence-backed"
              color={confidence != null ? (confidence >= 70 ? "text-emerald-300" : confidence >= 40 ? "text-amber-300" : "text-rose-300") : "text-zinc-500"}
            />
            <StatBox
              label="Resilience Readiness"
              value={resilienceScore.score != null ? String(resilienceScore.score) : "—"}
              sub={RESILIENCE_META[resilienceScore.status].label}
              color={resilienceScore.status === "ready" ? "text-emerald-300" : resilienceScore.status === "partial" ? "text-amber-300" : "text-rose-300"}
            />
          </div>

          {vendor.notes && (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/2 p-4 print:border-zinc-200 print:bg-zinc-50">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 print:text-zinc-500">Relationship Notes</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-300 print:text-zinc-700">{vendor.notes}</p>
            </div>
          )}
        </ReportSection>

        {/* ══ INHERENT RISK FACTORS ══ */}
        <ReportSection title="Inherent Risk Analysis" subtitle="Weighted triage factors — scored before control effectiveness is applied">
          <div className="space-y-3">
            {inherent.contributions.map((c) => (
              <div key={c.key} className="flex items-center gap-4 text-[12.5px]">
                <div className="w-44 shrink-0">
                  <div className="font-medium text-zinc-200 print:text-zinc-800">{c.label}</div>
                  <div className="text-[10.5px] text-zinc-500 print:text-zinc-500">{c.inputLabel}</div>
                </div>
                <div className="flex-1">
                  <RiskBar value={c.value} />
                </div>
                <div className="w-32 text-right">
                  <span className="font-mono text-[11px] text-zinc-400">
                    {c.value} × {(c.weight * 100).toFixed(0)}% = <span className="font-semibold text-zinc-100 print:text-zinc-800">{c.points}</span>
                  </span>
                </div>
              </div>
            ))}
            {/* Total */}
            <div className="flex items-center gap-4 border-t border-white/10 pt-3 print:border-zinc-200">
              <div className="w-44 shrink-0 font-semibold text-zinc-100 print:text-zinc-900">Inherent Total</div>
              <div className="flex-1">
                <RiskBar value={inherent.score} />
              </div>
              <div className="w-32 text-right">
                <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", TIER_META[inherent.tier].cls)}>
                  {inherent.score}/100 · {TIER_META[inherent.tier].label}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-zinc-600">
            Weights: Service criticality 30% · Data sensitivity 25% · System access 20% · Dependency/concentration 15% · Geographic exposure 10%.
            Configurable; provisional and subject to faculty review. Score is a decision aid — no score alone approves or rejects a supplier.
          </p>
        </ReportSection>

        {/* ══ BUSINESS SERVICE DEPENDENCIES ══ */}
        <ReportSection title="Business Service Dependencies" subtitle="Services this vendor supports and the associated dependency levels">
          {deps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-[12px] text-zinc-500 print:border-zinc-300">
              No business services mapped to this vendor.
            </div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500 print:border-zinc-200">
                  <th className="py-2.5 pr-3 text-left font-medium">Service</th>
                  <th className="px-3 py-2.5 text-left font-medium">Criticality</th>
                  <th className="px-3 py-2.5 text-left font-medium">Dependency Level</th>
                  <th className="px-3 py-2.5 text-left font-medium">Concentration</th>
                  <th className="px-3 py-2.5 text-left font-medium">Service RTO</th>
                  <th className="py-2.5 pl-3 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {deps.map(({ vs, service }) => (
                  <tr key={vs.id} className="border-b border-white/5 last:border-0 print:border-zinc-100">
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-zinc-100 print:text-zinc-900">{service.name}</div>
                      <div className="text-[10.5px] text-zinc-500">{service.description}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                        service.criticality === "critical" ? "border-rose-400/30 bg-rose-400/10 text-rose-300 print:text-rose-700"
                        : service.criticality === "high" ? "border-orange-400/30 bg-orange-400/10 text-orange-300 print:text-orange-700"
                        : service.criticality === "medium" ? "border-amber-400/30 bg-amber-400/10 text-amber-300 print:text-amber-700"
                        : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 print:text-emerald-700"
                      )}>
                        {service.criticality}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-zinc-300 print:text-zinc-700">{vs.dependencyLevel}</td>
                    <td className="px-3 py-2.5 font-mono text-zinc-300 print:text-zinc-700">
                      {vs.concentration != null ? (
                        <span className={vs.concentration >= 75 ? "text-rose-300 print:text-rose-700" : vs.concentration >= 50 ? "text-amber-300 print:text-amber-700" : ""}>
                          {vs.concentration}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400 print:text-zinc-600">
                      {service.rtoHours != null ? `${service.rtoHours}h` : "—"}
                    </td>
                    <td className="py-2.5 pl-3 text-[11px] text-zinc-500 print:text-zinc-500">{vs.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        {/* ══ CURRENT ASSESSMENT ══ */}
        {latest && (
          <ReportSection title="Current Assessment" subtitle={`Assessment v${latest.version} — ${latest.triggerReason ?? "Scheduled"}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Assessment metadata */}
              <div className="space-y-2.5 text-[12.5px]">
                <InfoRow label="Status">
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-medium", (ASSESSMENT_STATUS_META[latest.status] ?? { cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300" }).cls)}>
                    {(ASSESSMENT_STATUS_META[latest.status] ?? { label: latest.status }).label}
                  </span>
                </InfoRow>
                <InfoRow label="Issued">{fmtDate(latest.issuedAt)}</InfoRow>
                <InfoRow label="Due">{fmtDate(latest.dueAt)}</InfoRow>
                {latest.submittedAt && <InfoRow label="Submitted">{fmtDate(latest.submittedAt)}</InfoRow>}
                {latest.decidedAt && <InfoRow label="Decided">{fmtDate(latest.decidedAt)}</InfoRow>}
                {latest.nextReassessmentAt && <InfoRow label="Next reassessment">{fmtDate(latest.nextReassessmentAt)}</InfoRow>}
              </div>

              {/* Scores summary */}
              {latestBundle && (
                <div className="space-y-2.5 text-[12.5px]">
                  <InfoRow label="Control effectiveness">
                    <span className="font-mono">{latestBundle.scores.control.score ?? "—"}</span>
                    <span className="ml-1 text-[10px] text-zinc-500">({latestBundle.scores.control.answered}/{latestBundle.scores.control.total} answered)</span>
                  </InfoRow>
                  <InfoRow label="Residual risk">
                    <span className="font-mono">{latestBundle.scores.residual ?? "—"}</span>
                    {latestBundle.scores.residual != null && (
                      <span className={cn("ml-1.5 rounded-full border px-1.5 py-px text-[9px] font-semibold", TIER_META[tierOf(latestBundle.scores.residual)].cls)}>
                        {TIER_META[tierOf(latestBundle.scores.residual)].label}
                      </span>
                    )}
                  </InfoRow>
                  <InfoRow label="Evidence confidence">
                    <span className="font-mono">{latestBundle.scores.confidence.score}%</span>
                    <span className="ml-1 text-[10px] text-zinc-500">
                      ({latestBundle.scores.confidence.covered}/{latestBundle.scores.confidence.required} evidence-backed)
                    </span>
                  </InfoRow>
                </div>
              )}
            </div>

            {/* Reviewer rationale */}
            {latest.reviewerRationale && (
              <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 print:border-violet-200 print:bg-violet-50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400 print:text-violet-700">Reviewer Rationale</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-300 print:text-zinc-700">{latest.reviewerRationale}</p>
              </div>
            )}

            {/* Decision */}
            {latest.decisionRationale && (
              <div className={cn(
                "mt-3 rounded-xl border p-4",
                latest.decision === "approved" ? "border-emerald-400/20 bg-emerald-400/5 print:border-emerald-200 print:bg-emerald-50"
                : latest.decision === "conditionally_approved" ? "border-teal-400/20 bg-teal-400/5 print:border-teal-200 print:bg-teal-50"
                : "border-orange-400/20 bg-orange-400/5 print:border-orange-200 print:bg-orange-50"
              )}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 print:text-zinc-500">Decision</p>
                <p className={cn(
                  "mt-0.5 text-[12px] font-semibold capitalize",
                  latest.decision === "approved" ? "text-emerald-300 print:text-emerald-700"
                  : latest.decision === "conditionally_approved" ? "text-teal-300 print:text-teal-700"
                  : "text-orange-300 print:text-orange-700"
                )}>
                  {latest.decision?.replaceAll("_", " ")}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-300 print:text-zinc-700">{latest.decisionRationale}</p>
              </div>
            )}
          </ReportSection>
        )}

        {/* ══ EVIDENCE REGISTER ══ */}
        <ReportSection title="Evidence Register" subtitle="Evidence freshness and verification status — missing/expired lowers confidence, does not auto-fail a control">
          {/* Summary tiles */}
          <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              { key: "verified", items: evByStatus.verified, label: "Verified", color: "text-emerald-300 print:text-emerald-700" },
              { key: "submitted", items: evByStatus.submitted, label: "Submitted", color: "text-sky-300 print:text-sky-700" },
              { key: "stale", items: evByStatus.stale, label: "Expired", color: "text-amber-300 print:text-amber-700" },
              { key: "clarification", items: evByStatus.clarification, label: "Clarification", color: "text-violet-300 print:text-violet-700" },
              { key: "rejected", items: evByStatus.rejected, label: "Rejected", color: "text-rose-300 print:text-rose-700" },
              { key: "missing", items: evByStatus.missing, label: "Missing", color: "text-zinc-400 print:text-zinc-500" },
            ].map(({ key, items, label, color }) => (
              <div key={key} className="rounded-lg border border-white/8 bg-white/2 p-2.5 text-center print:border-zinc-200">
                <div className={cn("font-mono text-xl font-bold", color)}>{items.length}</div>
                <div className="mt-0.5 text-[10px] text-zinc-500">{label}</div>
              </div>
            ))}
          </div>

          {vEvidence.length === 0 ? (
            <p className="text-center text-[12px] text-zinc-500">No evidence items registered.</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500 print:border-zinc-200">
                  <th className="py-2.5 pr-3 text-left font-medium">Evidence Item</th>
                  <th className="px-3 py-2.5 text-left font-medium">Type</th>
                  <th className="px-3 py-2.5 text-left font-medium">Owner</th>
                  <th className="px-3 py-2.5 text-left font-medium">Valid Until</th>
                  <th className="px-3 py-2.5 text-left font-medium">Status</th>
                  <th className="py-2.5 pl-3 text-left font-medium">Reviewer Note</th>
                </tr>
              </thead>
              <tbody>
                {vEvidence.map((ev) => {
                  const eff = effectiveEvidenceStatus(ev.status, ev.validUntil);
                  const meta = EVIDENCE_META[eff] ?? EVIDENCE_META.missing;
                  return (
                    <tr key={ev.id} className="border-b border-white/5 last:border-0 print:border-zinc-100">
                      <td className="py-2.5 pr-3 font-medium text-zinc-100 print:text-zinc-900">{ev.title}</td>
                      <td className="px-3 py-2.5 capitalize text-zinc-400 print:text-zinc-600">{ev.type}</td>
                      <td className="px-3 py-2.5 text-zinc-400 print:text-zinc-600">{ev.owner || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-400 print:text-zinc-600">
                        {ev.validUntil ? (
                          <span className={eff === "stale" ? "text-amber-300 print:text-amber-700" : ""}>{fmtDate(ev.validUntil)}</span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium", meta.cls)}>
                          <StatusDot status={eff} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-[11px] text-zinc-500 print:text-zinc-500">
                        {ev.reviewerNote || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </ReportSection>

        {/* ══ RESILIENCE READINESS ══ */}
        <ReportSection
          title="Resilience Readiness"
          subtitle="A separate dimension from the cybersecurity risk rating — reported independently"
          badge={<span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", RESILIENCE_META[resilienceScore.status].cls)}>{RESILIENCE_META[resilienceScore.status].label}</span>}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3 text-[12.5px]">
              {resilience ? (
                <>
                  <InfoRow label="Continuity plan">
                    <span className="capitalize font-medium text-zinc-200 print:text-zinc-800">{resilience.continuityPlanStatus}</span>
                  </InfoRow>
                  <InfoRow label="Last exercise">
                    {resilience.lastExerciseAt ? fmtDate(resilience.lastExerciseAt) : "Not run"}
                  </InfoRow>
                  <InfoRow label="Exercise outcome">
                    <span className={cn(
                      "capitalize font-medium",
                      resilience.exerciseOutcome === "passed" ? "text-emerald-300 print:text-emerald-700"
                      : resilience.exerciseOutcome === "partial" ? "text-amber-300 print:text-amber-700"
                      : resilience.exerciseOutcome === "failed" ? "text-rose-300 print:text-rose-700"
                      : "text-zinc-400"
                    )}>
                      {resilience.exerciseOutcome.replaceAll("_", " ")}
                    </span>
                  </InfoRow>
                  <InfoRow label="Stated RTO">
                    {resilience.rtoHours != null ? `${resilience.rtoHours} hours` : "—"}
                  </InfoRow>
                  {resilience.notes && (
                    <div className="rounded-lg border border-white/8 bg-white/2 p-3 print:border-zinc-200 print:bg-zinc-50">
                      <p className="text-[11px] leading-relaxed text-zinc-400 print:text-zinc-600">{resilience.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-zinc-500">No resilience record on file.</p>
              )}
            </div>

            {/* Readiness score breakdown */}
            <div className="space-y-3">
              {resilienceScore.parts.map((p) => (
                <div key={p.label}>
                  <div className="mb-1 flex items-center justify-between text-[11.5px]">
                    <span className="text-zinc-400 print:text-zinc-600">{p.label}</span>
                    <span className="font-mono text-[11px] text-zinc-300 print:text-zinc-700">{p.value}/100 × {(p.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/8 print:bg-zinc-200">
                    <div
                      className={cn("h-2 rounded-full", p.value >= 70 ? "bg-emerald-400" : p.value >= 40 ? "bg-amber-400" : "bg-rose-400")}
                      style={{ width: `${p.value}%` }}
                    />
                  </div>
                </div>
              ))}
              {resilienceScore.score != null && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-white/8 bg-white/2 px-3 py-2 print:border-zinc-200">
                  <span className="text-[12px] font-semibold text-zinc-200 print:text-zinc-800">Composite Readiness Score</span>
                  <span className="font-mono text-lg font-bold" style={{ color: RESILIENCE_META[resilienceScore.status].hex }}>
                    {resilienceScore.score}/100
                  </span>
                </div>
              )}
            </div>
          </div>
        </ReportSection>

        {/* ══ FINDINGS, ACTIONS, EXCEPTIONS ══ */}
        <div className="report-section grid gap-4 sm:grid-cols-3">
          {/* Findings */}
          <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/2 to-transparent p-5 print:border-zinc-200">
            <SectionLabel
              title="Open Findings"
              count={openFindings.length}
              countColor={openFindings.some(f => f.severity === "critical" || f.severity === "high") ? "text-rose-300" : "text-zinc-300"}
            />
            <div className="mt-3 space-y-2.5">
              {openFindings.length === 0 ? (
                <p className="text-[11px] text-zinc-600">No open findings.</p>
              ) : openFindings.map((f) => (
                <div key={f.id} className="rounded-lg border border-white/6 bg-white/2 p-2.5 print:border-zinc-200">
                  <div className="flex items-start gap-2">
                    <SeverityIcon severity={f.severity} />
                    <div>
                      <p className="text-[12px] font-medium text-zinc-100 print:text-zinc-900">{f.title}</p>
                      <p className="mt-0.5 text-[10.5px] text-zinc-500">{f.status.replaceAll("_", " ")} · {f.severity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/2 to-transparent p-5 print:border-zinc-200">
            <SectionLabel
              title="Open Actions"
              count={openActions.length}
              countColor={openActions.some(a => a.dueAt && a.dueAt < new Date()) ? "text-rose-300" : "text-zinc-300"}
            />
            <div className="mt-3 space-y-2.5">
              {openActions.length === 0 ? (
                <p className="text-[11px] text-zinc-600">No open actions.</p>
              ) : openActions.map((a) => {
                const overdue = a.dueAt && a.dueAt < new Date();
                return (
                  <div key={a.id} className="rounded-lg border border-white/6 bg-white/2 p-2.5 print:border-zinc-200">
                    <p className="text-[12px] font-medium text-zinc-100 print:text-zinc-900">{a.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10.5px]">
                      <span className="text-zinc-500">{a.ownerName}</span>
                      {a.dueAt && (
                        <span className={overdue ? "text-rose-400 print:text-rose-600" : "text-zinc-500"}>
                          · due {fmtDate(a.dueAt)}{overdue ? " (OVERDUE)" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exceptions */}
          <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/2 to-transparent p-5 print:border-zinc-200">
            <SectionLabel title="Active Exceptions" count={activeExceptions.length} countColor="text-orange-300" />
            <div className="mt-3 space-y-2.5">
              {activeExceptions.length === 0 ? (
                <p className="text-[11px] text-zinc-600">No active exceptions.</p>
              ) : activeExceptions.map((e) => (
                <div key={e.id} className="rounded-lg border border-orange-400/15 bg-orange-400/5 p-2.5 print:border-orange-200 print:bg-orange-50">
                  <p className="text-[12px] font-medium text-zinc-100 print:text-zinc-900">{e.title}</p>
                  <p className="mt-0.5 text-[10.5px] capitalize text-zinc-500">{e.status} · expires {fmtDate(e.expiresAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ QUESTIONNAIRE DOMAIN SUMMARY ══ */}
        {latestBundle && latestBundle.domains.size > 0 && (
          <ReportSection title="Questionnaire Domain Summary" subtitle={`Assessment v${latest?.version} · Template responses by domain`}>
            <div className="space-y-3">
              {[...latestBundle.domains.entries()].map(([domain, rows]) => {
                const answered = rows.filter((r) => r.a?.response && r.a.response !== "na").length;
                const yes = rows.filter((r) => r.a?.response === "yes").length;
                const partial = rows.filter((r) => r.a?.response === "partial").length;
                const no = rows.filter((r) => r.a?.response === "no").length;
                const pct = rows.length > 0 ? Math.round((answered / rows.length) * 100) : 0;
                return (
                  <div key={domain} className="rounded-xl border border-white/8 bg-white/1 p-4 print:border-zinc-200">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-[13px] font-semibold text-zinc-100 print:text-zinc-900">{domain}</h4>
                        <p className="text-[11px] text-zinc-500">{answered}/{rows.length} answered ({pct}%)</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        {yes > 0 && <span className="text-emerald-300 print:text-emerald-700"><CheckCircle2 className="inline h-3 w-3" /> {yes} yes</span>}
                        {partial > 0 && <span className="text-amber-300 print:text-amber-700">~ {partial} partial</span>}
                        {no > 0 && <span className="text-rose-300 print:text-rose-700"><XCircle className="inline h-3 w-3" /> {no} no</span>}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-white/8 print:bg-zinc-200">
                      <div className="flex h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full" style={{ width: `${(yes / rows.length) * 100}%` }} />
                        <div className="bg-amber-400 h-full" style={{ width: `${(partial / rows.length) * 100}%` }} />
                        <div className="bg-rose-400 h-full" style={{ width: `${(no / rows.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ReportSection>
        )}

        {/* ══ SCORING MODEL DISCLOSURE ══ */}
        <ReportSection title="Scoring Model Transparency" subtitle="All weights shown — configurable, under faculty review">
          <div className="grid gap-3 text-[12px] sm:grid-cols-5">
            {[
              ["Service Criticality", "30%"],
              ["Data Sensitivity", "25%"],
              ["System Access / Integration", "20%"],
              ["Dependency / Concentration", "15%"],
              ["Geographic Exposure", "10%"],
            ].map(([label, weight]) => (
              <div key={label} className="rounded-lg border border-white/8 bg-white/2 p-3 print:border-zinc-200">
                <div className="font-medium text-zinc-200 print:text-zinc-800">{label}</div>
                <div className="mt-1 font-mono text-[11px] text-teal-300 print:text-teal-700">{weight}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-white/6 bg-white/1 p-3.5 text-[11.5px] leading-relaxed text-zinc-500 print:border-zinc-200 print:text-zinc-500">
            <strong className="text-zinc-400 print:text-zinc-600">Residual formula:</strong> Residual = Inherent × (1 − 0.65 × Control Effectiveness / 100).
            Resilience readiness: Plan 50% · Last exercise outcome 40% · Exercise recency 10%.
            Confidence: weighted average of evidence status across evidence-required answers.
            All scores are decision aids. No score alone approves a supplier, establishes compliance, or replaces professional judgement.
          </div>
        </ReportSection>

        {/* ══ FOOTER ══ */}
        <div className="mt-6 border-t border-white/8 pb-8 pt-4 print:border-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-zinc-600">
            <div>
              <span className="font-semibold text-zinc-500 print:text-zinc-500">VRAP</span> — Vendor Risk Assessment Portal
              · Academic prototype (Dhanraj Rana, NFSU MBA-CSM 2026-27)
            </div>
            <div>
              Demonstration data only · Human approval required for all decisions · {fmtDate(now)}
            </div>
          </div>
        </div>

      </div>

      {/* Print-only styles injected here for the report */}
      <style>{`
        @media print {
          .report-page { background: white !important; color: #111 !important; }
          .report-cover { page-break-after: avoid; }
          .report-section { page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
        .report-stat-box {
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1rem 1.25rem;
        }
        @media print {
          .report-stat-box {
            background: #f9fafb !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ReportSection({
  title, subtitle, badge, children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="report-section mb-4 overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.02] to-transparent print:rounded-none print:border-0 print:border-b print:border-zinc-200">
      <div className="border-b border-white/8 px-6 py-4 print:border-zinc-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-zinc-100 print:text-zinc-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>}
          </div>
          {badge}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-40 shrink-0 text-[11px] font-medium uppercase tracking-wider text-zinc-500 print:text-zinc-500">{label}</span>
      <span className="text-[12.5px] text-zinc-300 print:text-zinc-700">{children}</span>
    </div>
  );
}

function SectionLabel({ title, count, countColor }: { title: string; count: number; countColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="text-[13px] font-semibold text-zinc-100 print:text-zinc-900">{title}</h4>
      <span className={cn("font-mono text-xl font-bold", countColor ?? "text-zinc-300")}>{count}</span>
    </div>
  );
}
