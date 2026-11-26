import Link from "next/link";
import { redirect } from "next/navigation";
import { FileBarChart, TrendingUp, AlertTriangle, Shield, Activity, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listVendorSummaries } from "@/lib/data";
import { db } from "@/db";
import { actions, assessments, findings } from "@/db/schema";
import { Card, SectionTitle, TierBadge, VendorStatusPill } from "@/components/ui";
import { RESILIENCE_META, INHERENT_WEIGHTS, TIER_META } from "@/lib/scoring";
import { cn, fmtDate, daysFromNow } from "@/lib/utils";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  if (user.role === "vendor") redirect("/");

  const summaries = [...(await listVendorSummaries())].sort(
    (a, b) => b.inherent.score - a.inherent.score,
  );

  // Portfolio-level stats
  const totalVendors = summaries.length;
  const criticalHigh = summaries.filter(
    (s) => s.inherent.tier === "critical" || s.inherent.tier === "high",
  ).length;
  const atRisk = summaries.filter((s) => s.resilience.status === "at_risk").length;
  const evidenceIssues = summaries.reduce((acc, s) => acc + s.evidenceAttention, 0);

  const openActions = await db.select().from(actions).where(eq(actions.status, "open"));
  const openFindings = await db.select().from(findings);
  const openAssessments = await db
    .select()
    .from(assessments)
    .where(eq(assessments.status, "in_review"));

  const tierBreakdown = {
    critical: summaries.filter((s) => s.inherent.tier === "critical").length,
    high: summaries.filter((s) => s.inherent.tier === "high").length,
    moderate: summaries.filter((s) => s.inherent.tier === "moderate").length,
    low: summaries.filter((s) => s.inherent.tier === "low").length,
  };

  const resilienceBreakdown = {
    ready: summaries.filter((s) => s.resilience.status === "ready").length,
    partial: summaries.filter((s) => s.resilience.status === "partial").length,
    at_risk: summaries.filter((s) => s.resilience.status === "at_risk").length,
    unknown: summaries.filter((s) => s.resilience.status === "unknown").length,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
          Reporting &amp; Analytics
        </div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          Portfolio Risk Summary
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Organisation-wide risk posture across {totalVendors} vendors — click a vendor to open its
          professional assessment report.
        </p>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Vendors Registered"
          value={totalVendors}
          sub="in portfolio"
          icon={<Shield className="h-4 w-4 text-teal-300" />}
        />
        <KpiTile
          label="High / Critical Inherent"
          value={criticalHigh}
          sub={`${Math.round((criticalHigh / Math.max(1, totalVendors)) * 100)}% of portfolio`}
          tone={criticalHigh > 0 ? "danger" : "good"}
          icon={<TrendingUp className="h-4 w-4 text-rose-300" />}
        />
        <KpiTile
          label="Evidence Issues"
          value={evidenceIssues}
          sub="missing / stale / rejected"
          tone={evidenceIssues > 0 ? "warn" : "good"}
          icon={<AlertTriangle className="h-4 w-4 text-amber-300" />}
        />
        <KpiTile
          label="Resilience At Risk"
          value={atRisk}
          sub={`${Math.round((atRisk / Math.max(1, totalVendors)) * 100)}% of portfolio`}
          tone={atRisk > 0 ? "warn" : "good"}
          icon={<Activity className="h-4 w-4 text-orange-300" />}
        />
      </div>

      {/* Breakdown charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tier distribution */}
        <Card>
          <SectionTitle title="Inherent Risk Distribution" hint="Vendor count by inherent exposure tier" />
          <div className="space-y-2.5">
            {(["critical", "high", "moderate", "low"] as const).map((tier) => {
              const count = tierBreakdown[tier];
              const pct = totalVendors > 0 ? (count / totalVendors) * 100 : 0;
              const meta = TIER_META[tier];
              return (
                <div key={tier} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-20 text-right font-medium text-zinc-300">{meta.label}</span>
                  <div className="flex-1 rounded-full bg-white/6">
                    <div
                      className={cn("h-5 rounded-full flex items-center px-2", meta.bar)}
                      style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                    >
                      {count > 0 && (
                        <span className="text-[10px] font-bold text-[#0a0e13]">{count}</span>
                      )}
                    </div>
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] text-zinc-500">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Resilience breakdown */}
        <Card>
          <SectionTitle
            title="Resilience Readiness"
            hint="Continuity plan and exercise status — separate from cyber risk"
          />
          <div className="space-y-2.5">
            {(["ready", "partial", "at_risk", "unknown"] as const).map((status) => {
              const count = resilienceBreakdown[status];
              const pct = totalVendors > 0 ? (count / totalVendors) * 100 : 0;
              const meta = RESILIENCE_META[status];
              return (
                <div key={status} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-20 text-right font-medium text-zinc-300">{meta.label}</span>
                  <div className="flex-1 rounded-full bg-white/6">
                    <div
                      className="h-5 rounded-full flex items-center px-2"
                      style={{
                        width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
                        background: meta.hex,
                        opacity: 0.85,
                      }}
                    >
                      {count > 0 && (
                        <span className="text-[10px] font-bold text-[#0a0e13]">{count}</span>
                      )}
                    </div>
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] text-zinc-500">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Main register table */}
      <Card className="!p-0">
        <div className="border-b border-white/8 px-5 py-4">
          <SectionTitle
            title="Vendor Risk Register"
            hint="Ranked by inherent exposure — click Open to generate the full professional report"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-3 font-medium">Vendor</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Inherent Risk</th>
                <th className="px-3 py-3 font-medium">Latest Assessment</th>
                <th className="px-3 py-3 font-medium">Resilience</th>
                <th className="px-3 py-3 font-medium">Evidence Issues</th>
                <th className="px-3 py-3 font-medium">Open Actions</th>
                <th className="px-3 py-3 font-medium">Next Reassessment</th>
                <th className="px-5 py-3 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => {
                const due = daysFromNow(s.vendor.nextReassessmentAt);
                const reassessmentUrgent = due != null && due <= 30;
                return (
                  <tr
                    key={s.vendor.id}
                    className="table-row border-b border-white/5 last:border-0"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/vendors/${s.vendor.id}`}
                        className="font-medium text-zinc-100 hover:text-teal-300"
                      >
                        {s.vendor.name}
                      </Link>
                      <div className="text-[11px] text-zinc-500">{s.vendor.category}</div>
                    </td>
                    <td className="px-3 py-3">
                      <VendorStatusPill status={s.vendor.status} />
                    </td>
                    <td className="px-3 py-3">
                      <TierBadge tier={s.inherent.tier} score={s.inherent.score} />
                    </td>
                    <td className="px-3 py-3 text-[12px] text-zinc-400">
                      {s.latestAssessment
                        ? `v${s.latestAssessment.version} · ${s.latestAssessment.status.replaceAll("_", " ")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          RESILIENCE_META[s.resilience.status].cls,
                        )}
                      >
                        {RESILIENCE_META[s.resilience.status].label}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 font-mono text-[12px]",
                        s.evidenceAttention > 0 ? "text-amber-300" : "text-emerald-300",
                      )}
                    >
                      {s.evidenceAttention > 0
                        ? `${s.evidenceAttention} item${s.evidenceAttention === 1 ? "" : "s"}`
                        : "✓ clear"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 font-mono text-[12px]",
                        s.openActions > 0 ? "text-amber-300" : "text-zinc-500",
                      )}
                    >
                      {s.openActions > 0 ? s.openActions : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {s.vendor.nextReassessmentAt ? (
                        <span
                          className={cn(
                            "text-[12px]",
                            reassessmentUrgent ? "font-medium text-amber-300" : "text-zinc-400",
                          )}
                        >
                          {fmtDate(s.vendor.nextReassessmentAt)}
                          {reassessmentUrgent && due != null && (
                            <span className="ml-1 font-mono text-[10px]">({due}d)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[12px] text-zinc-600">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/reports/vendor/${s.vendor.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-400/30 bg-teal-400/8 px-3 py-1.5 text-[11.5px] font-medium text-teal-300 transition-colors hover:border-teal-400/60 hover:bg-teal-400/15"
                      >
                        <FileBarChart className="h-3.5 w-3.5" /> Open
                        <ChevronRight className="h-3 w-3 opacity-60" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Scoring model card */}
      <Card>
        <SectionTitle
          title="Scoring Model (Documented)"
          hint="Configurable weights — provisional and under faculty review"
        />
        <div className="grid gap-2 text-[12.5px] sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(INHERENT_WEIGHTS).map(([k, w]) => (
            <div key={k} className="rounded-lg border border-white/6 bg-white/2 px-3 py-2.5">
              <div className="font-medium text-zinc-200">
                {k.replace(/([A-Z])/g, " $1").replace(/^d/, "D")}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-teal-300">
                {(w * 100).toFixed(0)}% weight
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-zinc-500">
          Residual view = inherent × (1 − 0.65 × control effectiveness). Confidence reflects
          evidence completeness and freshness. Resilience readiness is reported separately.
          Thresholds and weights are provisional and configurable; no score alone approves a
          supplier, establishes compliance, or replaces professional judgement.
        </p>
      </Card>
    </div>
  );
}

function KpiTile({
  label, value, sub, tone = "default", icon,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "default" | "warn" | "danger" | "good";
  icon?: React.ReactNode;
}) {
  const toneCls =
    tone === "danger"
      ? "text-rose-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "good"
          ? "text-emerald-300"
          : "text-zinc-100";
  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
        {icon && <div className="opacity-70">{icon}</div>}
      </div>
      <div className={cn("mt-2 font-mono text-[26px] font-semibold leading-none", toneCls)}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}
