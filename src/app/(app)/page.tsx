import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, AlertTriangle, Flame } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listVendorSummaries, listEvidenceWithVendors } from "@/lib/data";
import { db } from "@/db";
import { actions, assessments, auditEvents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, SectionTitle, KpiCard, TierBadge, VendorStatusPill, EmptyState, EvidencePill } from "@/components/ui";
import { TierDistributionChart, EvidenceDonut } from "@/components/charts";
import { TIER_META } from "@/lib/scoring";
import { cn, daysFromNow, effectiveEvidenceStatus, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  // Vendor representatives land on their own vendor page
  if (user.role === "vendor") {
    if (user.vendorId) redirect(`/vendors/${user.vendorId}`);
    redirect("/vendors");
  }

  const summaries = await listVendorSummaries();
  const openAssessments = await db
    .select()
    .from(assessments)
    .where(eq(assessments.status, "in_review"));
  const decisionPending = await db.select().from(assessments).where(eq(assessments.status, "decision_pending"));
  const issued = await db.select().from(assessments).where(eq(assessments.status, "issued"));
  const allActions = await db.select().from(actions);
  const evidenceRows = await listEvidenceWithVendors();
  const recent = await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(9);

  const openActions = allActions.filter((a) => a.status !== "done");
  const overdueActions = openActions.filter((a) => a.dueAt && daysFromNow(a.dueAt)! < 0);
  const attentionEvidence = evidenceRows.filter(({ ev }) => {
    const st = effectiveEvidenceStatus(ev.status, ev.validUntil);
    return st === "stale" || st === "missing" || st === "rejected";
  });
  const reassessmentsDue = summaries.filter(
    (s) => s.vendor.nextReassessmentAt && daysFromNow(s.vendor.nextReassessmentAt)! <= 45,
  );

  const tierCounts: Record<string, number> = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
  for (const s of summaries) tierCounts[TIER_META[s.inherent.tier].label] += 1;
  const tierData = (Object.keys(TIER_META) as (keyof typeof TIER_META)[]).map((t) => ({
    name: TIER_META[t].label,
    value: tierCounts[TIER_META[t].label],
    fill: TIER_META[t].hex,
  }));

  const evCounts: Record<string, number> = { verified: 0, submitted: 0, stale: 0, clarification_requested: 0, rejected: 0, missing: 0 };
  for (const { ev } of evidenceRows) {
    const st = effectiveEvidenceStatus(ev.status, ev.validUntil);
    evCounts[st] = (evCounts[st] ?? 0) + 1;
  }
  const evData = [
    { name: "Verified", value: evCounts.verified, fill: "#34d399" },
    { name: "Submitted", value: evCounts.submitted, fill: "#38bdf8" },
    { name: "Expired / stale", value: evCounts.stale, fill: "#fbbf24" },
    { name: "Clarification", value: evCounts.clarification_requested, fill: "#a78bfa" },
    { name: "Rejected", value: evCounts.rejected, fill: "#fb7185" },
  ].filter((d) => d.value > 0);

  const priority = [...summaries].sort((a, b) => b.inherent.score - a.inherent.score).slice(0, 6);
  const resilienceAtRisk = summaries.filter((s) => s.resilience.status === "at_risk");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">Portfolio overview</div>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-zinc-50">Third-party risk dashboard</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            {fmtDate(new Date())} · single-organisation workspace · demonstration data
          </p>
        </div>
        <Link href="/vendors/new" className="btn btn-primary">New vendor intake</Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <KpiCard label="Active vendors" value={summaries.length} sub={`${summaries.filter((s) => s.vendor.status === "monitoring").length} in monitoring`} />
        <KpiCard
          label="High / critical inherent"
          value={summaries.filter((s) => s.inherent.tier === "high" || s.inherent.tier === "critical").length}
          sub="of portfolio"
          tone={summaries.some((s) => s.inherent.tier === "critical") ? "danger" : "warn"}
        />
        <KpiCard
          label="Open assessments"
          value={openAssessments.length + issued.length + decisionPending.length}
          sub={`${decisionPending.length} awaiting decision`}
        />
        <KpiCard label="Evidence attention" value={attentionEvidence.length} sub="missing / stale / rejected" tone={attentionEvidence.length ? "warn" : "good"} />
        <KpiCard label="Open actions" value={openActions.length} sub={`${overdueActions.length} overdue`} tone={overdueActions.length ? "danger" : "default"} />
        <KpiCard label="Reassessments ≤ 45d" value={reassessmentsDue.length} sub="scheduled reviews" tone={reassessmentsDue.length ? "warn" : "good"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle title="Inherent exposure by tier" hint="Weighted intake factors across the register" />
          <TierDistributionChart data={tierData} />
        </Card>
        <Card>
          <SectionTitle title="Evidence freshness" hint="Effective status incl. expiry detection" />
          <EvidenceDonut data={evData} />
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {evData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                {d.name} <span className="font-mono text-zinc-300">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Resilience readiness watch" hint="Separate from cyber risk rating" />
          {resilienceAtRisk.length === 0 ? (
            <EmptyState title="No vendors at risk" hint="Continuity plans and exercises look healthy." />
          ) : (
            <ul className="space-y-2.5">
              {resilienceAtRisk.slice(0, 5).map((s) => (
                <li key={s.vendor.id}>
                  <Link href={`/vendors/${s.vendor.id}#resilience`} className="group flex items-center gap-3 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5 transition-colors hover:border-rose-400/25">
                    <Flame className="h-4 w-4 shrink-0 text-rose-400" strokeWidth={1.8} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-zinc-100">{s.vendor.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        Readiness <span className="font-mono">{s.resilience.score ?? "—"}</span>/100
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <SectionTitle
            title="Priority review queue"
            hint="Ranked by inherent exposure score"
            right={<Link href="/vendors" className="text-[12px] font-medium text-teal-300 hover:text-teal-200">Full register →</Link>}
          />
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Supports</th>
                  <th className="px-3 py-2 font-medium">Inherent</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Next reassessment</th>
                </tr>
              </thead>
              <tbody>
                {priority.map((s) => {
                  const due = daysFromNow(s.vendor.nextReassessmentAt);
                  return (
                    <tr key={s.vendor.id} className="table-row border-b border-white/5">
                      <td className="px-5 py-3">
                        <Link href={`/vendors/${s.vendor.id}`} className="font-medium text-zinc-100 hover:text-teal-300">{s.vendor.name}</Link>
                        <div className="text-[11px] text-zinc-500">{s.vendor.category}</div>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-zinc-400">{s.deps.length} service{s.deps.length === 1 ? "" : "s"}</td>
                      <td className="px-3 py-3"><TierBadge tier={s.inherent.tier} score={s.inherent.score} /></td>
                      <td className="px-3 py-3"><VendorStatusPill status={s.vendor.status} /></td>
                      <td className="px-5 py-3">
                        {s.vendor.nextReassessmentAt ? (
                          <span className={cn("flex items-center gap-1.5 text-[12px]", due != null && due <= 30 ? "text-amber-300" : "text-zinc-400")}>
                            <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.8} />
                            {fmtDate(s.vendor.nextReassessmentAt)}
                            {due != null && due <= 30 && <span className="font-mono text-[10px]">({due}d)</span>}
                          </span>
                        ) : (
                          <span className="text-[12px] text-zinc-600">Not scheduled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Recent activity" hint="Audit trail across the workspace" />
          {recent.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ol className="relative space-y-4 border-l border-white/8 pl-5">
              {recent.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#10161d] bg-teal-400" />
                  <div className="text-[12px] font-medium text-zinc-200">{e.action}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">{e.detail}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                    {e.actorName} · {fmtDate(e.createdAt)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {attentionEvidence.length > 0 && (
        <Card className="border-amber-400/15">
          <SectionTitle
            title="Evidence needing attention"
            hint="Expired or unverified items reduce assessment confidence — they do not auto-fail a control"
            right={<AlertTriangle className="h-4 w-4 text-amber-300" strokeWidth={1.8} />}
          />
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {attentionEvidence.slice(0, 6).map(({ ev, vendorName }) => (
              <Link
                key={ev.id}
                href={`/vendors/${ev.vendorId}#evidence`}
                className="rounded-lg border border-white/6 bg-white/2 px-3.5 py-3 transition-colors hover:border-amber-400/25"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12.5px] font-medium text-zinc-100">{ev.title}</span>
                  <EvidencePill status={effectiveEvidenceStatus(ev.status, ev.validUntil)} />
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  {vendorName} · valid until {fmtDate(ev.validUntil)}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
