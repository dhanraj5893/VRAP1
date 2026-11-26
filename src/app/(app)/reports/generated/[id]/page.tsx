import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAuditReport } from "@/lib/data";
import { PrintButton } from "@/components/client-bits";
import { Card, SectionTitle, Pill } from "@/components/ui";
import { TIER_META, RESILIENCE_META } from "@/lib/scoring";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GeneratedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!["admin", "reviewer", "approver", "auditor"].includes(user.role)) redirect("/");

  const { id } = await params;
  const numId = Number(id);
  const report = await getAuditReport(numId);
  if (!report) notFound();

  const snap = (() => {
    try { return JSON.parse(report.snapshot); } catch { return {}; }
  })() as any;

  return (
    <div className="mx-auto max-w-5xl space-y-6 no-print">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
            Audit report
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">
            {report.title}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
            <Pill label={report.reportType} cls="border-white/8 bg-white/5 text-zinc-400 text-[10px] px-2 py-0.5" />
            <span>{report.generatedByName}</span>
            <span>·</span>
            <span>{fmtDate(report.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <a href="/reports/generated" className="rounded-lg border border-white/8 bg-white/6 px-3 py-2 text-[11.5px] font-medium text-zinc-300 hover:bg-white/10">
            Back to library
          </a>
        </div>
      </header>

      <div className="print-only mx-auto max-w-[210mm] p-6 bg-[#0a0e13]">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">VRAP · Audit report</div>
        <div className="text-2xl font-bold text-zinc-50 mb-1">{report.title}</div>
        <div className="text-[11px] text-zinc-500 mb-4">
          Generated {fmtDate(report.createdAt)} by {report.generatedByName} · Type: {report.reportType}
        </div>
        <ReportBody snap={snap} />
      </div>

      <div className="not-print">
        <div className="rounded-lg border border-white/8 bg-white/5 p-5">
          <SectionTitle title="Report contents" hint="Snapshot captured at generation time" />
          <div className="grid gap-3 lg:grid-cols-4">
            {Object.entries(snap.summary ?? {}).map(([k, v]) => (
              <StatCard key={k} label={k.replace(/([A-Z])/g, " $1").replace(/^s/, "S")} value={String(v)} />
            ))}
          </div>
          <Card className="mt-4">
            <div className="border-b border-white/8 px-5 py-3">
              <SectionTitle title="Vendors" hint={snap.vendorId ? "Single-vendor report" : "Portfolio-wide"} />
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-2 font-medium">Vendor</th>
                    <th className="px-3 py-2 font-medium">Tier</th>
                    <th className="px-3 py-2 font-medium">Inherent</th>
                    <th className="px-3 py-2 font-medium">Resilience</th>
                    <th className="px-3 py-2 font-medium">Compliance</th>
                    <th className="px-3 py-2 font-medium">Evidence issues</th>
                    <th className="px-3 py-2 font-medium">Open actions</th>
                    <th className="px-3 py-2 font-medium">Open incidents</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(snap.vendors ?? []).map((v: any) => (
                    <tr key={v.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2 font-medium text-zinc-100">{v.name}</td>
                      <td className="px-3 py-2">
                        <span className={cnPill("inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", v.tier)}>
                          {v.tier}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-300">{v.inherent ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-zinc-300">{v.resilience ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-zinc-300">{v.complianceCoverage == null ? "—" : v.complianceCoverage + "%"}</td>
                      <td className="px-3 py-2 font-mono text-zinc-400">{v.evidenceAttention ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-zinc-400">{v.openActions ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-zinc-400">{v.openIncidents ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-500">{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReportBody({ snap }: { snap: any }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(snap.summary ?? {}).map(([k, v]) => (
          <div key={k} className="rounded border border-white/8 bg-white/4 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium mb-1">
              {k.replace(/([A-Z])/g, " $1")}
            </div>
            <div className="text-xl font-mono font-bold text-zinc-100">{String(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/5 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div className="mt-1 font-mono text-[20px] font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function cnPill(base: string, tier: string) {
  const meta = TIER_META[tier as keyof typeof TIER_META];
  const cls = meta ? (meta.cls.includes("border") ? meta.cls : "border-white/8") : "border-white/8";
  return `${base} ${cls}`;
}
