import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listAuditReports } from "@/lib/data";
import { generateReportAction } from "@/app/actions";
import { Card, SectionTitle, Pill } from "@/components/ui";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { asc } from "drizzle-orm";
import { FileText, Clock, Play } from "lucide-react";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  portfolio: "Portfolio risk report",
  vendor: "Vendor due-diligence report",
  compliance: "Regulatory compliance coverage",
  audit_trail: "Audit trail extract",
  evidence: "Evidence confidence report",
  findings: "Findings, actions & exceptions",
  access: "Access control & RBAC report",
  evaluation: "Prototype evaluation report",
};

export default async function GeneratedReportsPage() {
  const user = await requireUser();
  if (!["admin", "reviewer", "approver", "auditor"].includes(user.role)) redirect("/");

  const reports = await listAuditReports();
  const allVendors = await db.select().from(vendors).orderBy(asc(vendors.name));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
            Audit report generation
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">
            Generated reports
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Produce a point-in-time audit report from the current portfolio data. Each report is
            stored with a reproducible snapshot and appears in the audit trail.{" "}
            <span className="text-teal-400/80">Reviewer / Approver / Auditor</span>.
          </p>
        </div>

        <form action={generateReportAction} className="flex flex-col sm:flex-row gap-2 items-end">
          <select
            name="reportType"
            className="rounded border border-white/10 bg-white/4 px-3 py-2 text-[12px] focus:border-teal-400 outline-none"
          >
            <option value="portfolio">Portfolio risk report</option>
            <option value="vendor">Vendor due-diligence report</option>
            <option value="compliance">Regulatory compliance coverage</option>
            <option value="audit_trail">Audit trail extract</option>
            <option value="evidence">Evidence confidence report</option>
            <option value="findings">Findings, actions & exceptions</option>
            <option value="access">Access control & RBAC report</option>
            <option value="evaluation">Prototype evaluation report</option>
          </select>
          <select name="vendorId" className="rounded border border-white/10 bg-white/4 px-3 py-2 text-[12px] focus:border-teal-400 outline-none">
            <option value="">All vendors</option>
            {allVendors.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name}
              </option>
            ))}
          </select>
          <input
            name="title"
            placeholder="Optional report title"
            className="rounded border border-white/10 bg-white/4 px-3 py-2 text-[12px] focus:border-teal-400 outline-none flex-1 min-w-0"
          />
          <button className="rounded-lg bg-teal-400/10 px-4 py-2 text-[12px] font-medium text-teal-300 border border-teal-400/30 hover:bg-teal-400/20">
            <Play className="h-3.5 w-3.5 mr-1.5" /> Generate
          </button>
        </form>
      </header>

      <div className="grid gap-3 lg:grid-cols-4">
        <Stat card label="Reports generated" value={reports.length} tone="default" />
        <Stat card label="Portfolio" value={reports.filter((r) => r.reportType === "portfolio").length} tone="default" />
        <Stat card label="Vendor-specific" value={reports.filter((r) => r.reportType === "vendor").length} tone="default" />
        <Stat card label="Compliance" value={reports.filter((r) => r.reportType === "compliance").length} tone="default" />
      </div>

      <Card className="!p-0">
        <div className="border-b border-white/8 px-5 py-4">
          <SectionTitle title="Report library" hint="Click a report to view or print it" />
        </div>
        <div className="divide-y divide-white/6">
          {reports.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[12px] text-zinc-500">No reports generated yet. Create one above.</p>
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between group hover:bg-white/3 transition-colors last:border-0 border-b border-white/5">
                <div>
                  <Link
                    href={`/reports/generated/${r.id}`}
                    className="font-medium text-zinc-100 hover:text-teal-300"
                  >
                    {r.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                    <Pill label={TYPE_LABELS[r.reportType] ?? r.reportType} cls="border-white/8 bg-white/5 text-zinc-400 text-[10px] px-2 py-0.5" />
                    <span>{r.generatedByName}</span>
                    <span>·</span>
                    <span>{fmtDate(r.createdAt)}</span>
                  </div>
                </div>
                <div className="text-[11px] text-right text-zinc-400">
                  {r.vendorId ? `Vendor #${r.vendorId}` : "Portfolio"}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="rounded-lg border border-white/8 bg-white/4 p-5 text-[11.5px] leading-relaxed text-zinc-500">
        <span className="font-medium text-zinc-200">How it works.</span>{" "}
        Generating a report snapshots the current portfolio: tier distribution, open findings and
        actions, overdue items, evidence verification rate, resilience at-risk count, and
        regulatory coverage. The snapshot is stored immutably with the report so it can be
        reproduced later, and the generation event is written to the audit trail.
      </div>
    </div>
  );
}

function Stat({ card, label, value, tone = "default" }: { card?: boolean; label: string; value: number; tone?: "default" | "warn" | "danger" | "good" }) {
  const toneCls = tone === "danger" ? "text-rose-300 border-rose-400/20" : tone === "warn" ? "text-amber-300 border-amber-400/20" : tone === "good" ? "text-emerald-300 border-emerald-400/20" : "text-zinc-100 border-white/8";
  return (
    <div className="rounded-lg border px-4 py-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div className="mt-2 font-mono text-[24px] font-semibold leading-none {toneCls}">{value}</div>
    </div>
  );
}
