import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  AlertTriangle,
  Flame,
  ClipboardCheck,
  Scale,
  Inbox,
  FileBarChart,
  SlidersHorizontal,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listVendorSummaries, listEvidenceWithVendors } from "@/lib/data";
import { db } from "@/db";
import { actions, assessments, auditEvents, vendors } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { Card, SectionTitle, KpiCard, TierBadge, VendorStatusPill, EmptyState, EvidencePill } from "@/components/ui";
import { TierDistributionChart, EvidenceDonut } from "@/components/charts";
import { TIER_META } from "@/lib/scoring";
import { cn, daysFromNow, effectiveEvidenceStatus, fmtDate, ROLE_LABELS } from "@/lib/utils";

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

  // Human-decision inbox (approvers/admins) and review queue (reviewers/admins)
  const queueIds = [...decisionPending, ...openAssessments].map((a) => a.vendorId);
  const queueVendors = queueIds.length
    ? await db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(inArray(vendors.id, queueIds))
    : [];
  const vendorName = new Map(queueVendors.map((v) => [v.id, v.name]));

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
  const complianceAverage = (() => {
    const scored = summaries.filter((s) => s.complianceCoverage != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((acc, s) => acc + (s.complianceCoverage ?? 0), 0) / scored.length);
  })();

  // Role-aware focus cards — what this user should look at first
  const focusCards = buildFocusCards(user.role, {
    decisionPending: decisionPending.length,
    inReview: openAssessments.length,
    attentionEvidence: attentionEvidence.length,
    overdueActions: overdueActions.length,
    resilienceAtRisk: resilienceAtRisk.length,
    reassessmentsDue: reassessmentsDue.length,
  });

  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ================= HERO ================= */}
      <header className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-[#0e1a22] via-[#10161d] to-[#0c1218] px-6 py-6 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-70"
          style={{ background: "radial-gradient(closest-side, rgba(45,212,191,0.14), transparent)" }}
        />
        <div className="pointer-events-none absolute right-6 top-6 hidden opacity-15 lg:block">
          <ShieldCheck className="h-28 w-28 text-teal-300" strokeWidth={0.8} />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.22em] text-teal-400/90">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
              Portfolio command center
            </div>
            <h1 className="font-display mt-2 text-3xl font-bold leading-[1.12] tracking-tight text-zinc-50 lg:text-4xl">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
              {fmtDate(new Date())} · signed in as{" "}
              <span className="font-medium text-teal-300">{ROLE_LABELS[user.role] ?? user.role}</span>
              {" — "}your actions below are scoped to what your role may do.
            </p>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            {user.role === "admin" && (
              <>
                <Link href="/access" className="btn btn-ghost"><Lock className="h-4 w-4" />Access control</Link>
                <Link href="/settings" className="btn btn-ghost"><SlidersHorizontal className="h-4 w-4" />Scoring model</Link>
              </>
            )}
            {(user.role === "admin" || user.role === "reviewer") && (
              <Link href="/vendors/new" className="btn btn-primary">New vendor intake<ArrowRight className="h-4 w-4" /></Link>
            )}
            {user.role === "approver" && (
              <Link href="/assessments" className="btn btn-primary"><Inbox className="h-4 w-4" />Decision inbox ({decisionPending.length})</Link>
            )}
            {user.role === "auditor" && (
              <Link href="/reports/generated" className="btn btn-primary"><FileBarChart className="h-4 w-4" />Audit reports</Link>
            )}
          </div>
        </div>

        {/* focus cards */}
        <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
          {focusCards.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 transition-colors hover:border-teal-400/30 hover:bg-teal-400/5"
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", f.tone)}>
                <f.icon className="h-4.5 w-4.5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-zinc-100">{f.title}</div>
                <div className="text-[10.5px] leading-snug text-zinc-500">{f.sub}</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300" strokeWidth={1.8} />
            </Link>
          ))}
        </div>
      </header>

      {/* ================= KPI STRIP ================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <KpiCard label="Active vendors" value={summaries.length} sub={`${summaries.filter((s) => s.vendor.status === "monitoring").length} in monitoring`} />
        <KpiCard
          label="High / critical"
          value={summaries.filter((s) => s.inherent.tier === "high" || s.inherent.tier === "critical").length}
          sub="inherent exposure"
          tone={summaries.some((s) => s.inherent.tier === "critical") ? "danger" : "warn"}
        />
        <KpiCard
          label="Open assessments"
          value={openAssessments.length + issued.length + decisionPending.length}
          sub={`${decisionPending.length} awaiting decision`}
        />
        <KpiCard label="Evidence attention" value={attentionEvidence.length} sub="missing / stale / rejected" tone={attentionEvidence.length ? "warn" : "good"} />
        <KpiCard label="Open actions" value={openActions.length} sub={`${overdueActions.length} overdue`} tone={overdueActions.length ? "danger" : "default"} />
        <KpiCard label="Compliance" value={complianceAverage != null ? `${complianceAverage}%` : "—"} sub="avg. coverage" tone={complianceAverage != null && complianceAverage < 60 ? "warn" : "good"} />
        <KpiCard label="Reassess ≤ 45d" value={reassessmentsDue.length} sub="scheduled reviews" tone={reassessmentsDue.length ? "warn" : "good"} />
      </div>

      {/* ================= CHARTS ================= */}
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

      {/* ================= DECISION INBOX (approver/admin) ================= */}
      {(user.role === "approver" || user.role === "admin") && decisionPending.length > 0 && (
        <Card className="border-violet-400/20">
          <SectionTitle
            title="Awaiting your decision"
            hint="Assessments a reviewer has signed off and sent for human approval"
            right={<Scale className="h-4 w-4 text-violet-300" strokeWidth={1.8} />}
          />
          <div className="grid gap-2 md:grid-cols-2">
            {decisionPending.slice(0, 4).map((a) => (
              <Link
                key={a.id}
                href={`/assessments/${a.id}`}
                className="group flex items-center gap-3 rounded-lg border border-violet-400/15 bg-violet-400/5 px-4 py-3 transition-colors hover:border-violet-400/35"
              >
                <ClipboardCheck className="h-4.5 w-4.5 shrink-0 text-violet-300" strokeWidth={1.8} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-zinc-100">
                    {vendorName.get(a.vendorId) ?? `Vendor #${a.vendorId}`} · assessment v{a.version}
                  </div>
                  <div className="text-[10.5px] text-zinc-500">Decision pending reviewer sign-off{a.submittedAt ? ` · submitted ${fmtDate(a.submittedAt)}` : ""}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-300" strokeWidth={1.8} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* ================= PRIORITY QUEUE + ACTIVITY ================= */}
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

      {/* ================= EVIDENCE ATTENTION ================= */}
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

/* ---------------- role-aware focus cards ---------------- */

function buildFocusCards(
  role: string,
  stats: {
    decisionPending: number;
    inReview: number;
    attentionEvidence: number;
    overdueActions: number;
    resilienceAtRisk: number;
    reassessmentsDue: number;
  },
) {
  const toneTeal = "bg-teal-400/12 text-teal-300";
  const toneViolet = "bg-violet-400/12 text-violet-300";
  const toneAmber = "bg-amber-400/12 text-amber-300";
  const toneRose = "bg-rose-400/12 text-rose-300";
  const toneSky = "bg-sky-400/12 text-sky-300";

  if (role === "approver") {
    return [
      { href: "/assessments", icon: Inbox, title: `${stats.decisionPending} decision${stats.decisionPending === 1 ? "" : "s"} pending`, sub: "Reviewer-signed assessments waiting on you", tone: toneViolet },
      { href: "/exceptions", icon: Scale, title: "Exception approvals", sub: "Proposed risk exceptions needing a decision", tone: toneAmber },
      { href: "/reports/generated", icon: FileBarChart, title: "Audit reports", sub: "Generate & print decision-ready reports", tone: toneTeal },
    ];
  }
  if (role === "reviewer") {
    return [
      { href: "/assessments", icon: ClipboardCheck, title: `${stats.inReview} in review`, sub: "Verified evidence & rationale, then send for decision", tone: toneSky },
      { href: "/actions", icon: AlertTriangle, title: `${stats.overdueActions} overdue actions`, sub: "Remediation commitments past their due date", tone: toneAmber },
      { href: "/monitoring", icon: Flame, title: "Incidents & triggers", sub: "Raise or resolve reassessment triggers", tone: toneRose },
    ];
  }
  if (role === "auditor") {
    return [
      { href: "/reports/generated", icon: FileBarChart, title: "Audit reports", sub: "Point-in-time, printable audit snapshots", tone: toneTeal },
      { href: "/compliance", icon: ClipboardCheck, title: "Compliance matrix", sub: "Standards × vendor coverage heatmap", tone: toneSky },
      { href: "/monitoring", icon: Flame, title: "Monitoring log", sub: "Incidents, fourth parties and triggers (read-only)", tone: toneAmber },
    ];
  }
  // admin (default)
  return [
    { href: "/assessments", icon: Inbox, title: `${stats.decisionPending} awaiting decision`, sub: "Assessments sent for human approval", tone: toneViolet },
    { href: "/vendors", icon: Flame, title: `${stats.reassessmentsDue} reassessments ≤ 45d`, sub: "Scheduled reviews due soon", tone: toneAmber },
    { href: "/compliance", icon: ClipboardCheck, title: "Regulatory coverage", sub: "Standards applicability & gaps across the portfolio", tone: toneTeal },
  ];
}
