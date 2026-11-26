import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listVendorSummaries } from "@/lib/data";
import { Card, TierBadge, VendorStatusPill, EmptyState } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; status?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").toLowerCase();
  let summaries = await listVendorSummaries();

  // Vendor reps only see their own organisation
  if (user.role === "vendor" && user.vendorId) {
    summaries = summaries.filter((s) => s.vendor.id === user.vendorId);
  }
  if (q) {
    summaries = summaries.filter(
      (s) => s.vendor.name.toLowerCase().includes(q) || s.vendor.category.toLowerCase().includes(q),
    );
  }
  if (sp.tier) summaries = summaries.filter((s) => s.inherent.tier === sp.tier);
  if (sp.status) summaries = summaries.filter((s) => s.vendor.status === sp.status);

  const canIntake = user.role === "admin" || user.role === "reviewer";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">Inventory</div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">Vendor register</h1>
          <p className="mt-1 text-[13px] text-zinc-500">{summaries.length} vendor{summaries.length === 1 ? "" : "s"} · linked to business services and assessments</p>
        </div>
        {canIntake && (
          <Link href="/vendors/new" className="btn btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2} /> New vendor
          </Link>
        )}
      </header>

      {user.role !== "vendor" && (
        <form method="GET" className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={1.8} />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name or category…" className="input !w-64 !pl-8" />
          </div>
          <select name="tier" defaultValue={sp.tier ?? ""} className="select !w-auto">
            <option value="">All tiers</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className="select !w-auto">
            <option value="">All statuses</option>
            <option value="intake">Intake</option>
            <option value="assessment">Assessment</option>
            <option value="review">Review</option>
            <option value="monitoring">Monitoring</option>
          </select>
          <button className="btn btn-ghost" type="submit">Filter</button>
          {(sp.q || sp.tier || sp.status) && (
            <Link href="/vendors" className="text-[12px] text-zinc-500 hover:text-zinc-300">Clear</Link>
          )}
        </form>
      )}

      <Card className="!p-0">
        {summaries.length === 0 ? (
          <div className="p-6"><EmptyState title="No vendors match" hint="Adjust filters or register a new vendor." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-3 py-3 font-medium">Services</th>
                  <th className="px-3 py-3 font-medium">Inherent exposure</th>
                  <th className="px-3 py-3 font-medium">Resilience</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Flags</th>
                  <th className="px-5 py-3 font-medium">Next reassessment</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.vendor.id} className="table-row border-b border-white/5 last:border-0">
                    <td className="px-5 py-3.5">
                      <Link href={`/vendors/${s.vendor.id}`} className="font-medium text-zinc-100 hover:text-teal-300">
                        {s.vendor.name}
                      </Link>
                      <div className="text-[11px] text-zinc-500">{s.vendor.category}</div>
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-zinc-400">
                      {s.deps.length > 0 ? `${s.deps.length} mapped` : <span className="text-zinc-600">none</span>}
                    </td>
                    <td className="px-3 py-3.5"><TierBadge tier={s.inherent.tier} score={s.inherent.score} /></td>
                    <td className="px-3 py-3.5">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", {
                        "border-emerald-400/30 text-emerald-300": s.resilience.status === "ready",
                        "border-amber-400/30 text-amber-300": s.resilience.status === "partial",
                        "border-rose-400/30 text-rose-300": s.resilience.status === "at_risk",
                        "border-zinc-500/40 text-zinc-400": s.resilience.status === "unknown",
                      })}>
                        {s.resilience.status === "at_risk" ? "At risk" : s.resilience.status[0].toUpperCase() + s.resilience.status.slice(1)}
                        {s.resilience.score != null && <span className="ml-1 font-mono">{s.resilience.score}</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3.5"><VendorStatusPill status={s.vendor.status} /></td>
                    <td className="px-3 py-3.5">
                      <div className="flex gap-1">
                        {s.vendor.personalDataFlag && <span className="rounded border border-violet-400/30 bg-violet-400/10 px-1.5 py-px text-[10px] font-medium text-violet-300">PII</span>}
                        {s.vendor.aiUseFlag && <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-px text-[10px] font-medium text-sky-300">AI</span>}
                        {s.openActions > 0 && <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-px text-[10px] font-medium text-amber-300">{s.openActions} action{s.openActions === 1 ? "" : "s"}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-zinc-400">{s.vendor.nextReassessmentAt ? fmtDate(s.vendor.nextReassessmentAt) : <span className="text-zinc-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
