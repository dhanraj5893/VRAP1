import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getComplianceMatrix, listStandards } from "@/lib/data";
import { setComplianceAction, syncComplianceAction } from "@/app/actions";
import { isStandardApplicable } from "@/lib/standards";
import { COMPLIANCE_STATUS_META } from "@/lib/standards";
import { Card, SectionTitle, Pill } from "@/components/ui";
import { db } from "@/db";
import { standards, vendorCompliance, vendors } from "@/db/schema";
import { asc } from "drizzle-orm";
import { ROLE_LABELS } from "@/lib/utils";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not_assessed", label: "Not assessed" },
  { value: "compliant", label: "Compliant" },
  { value: "partial", label: "Partial" },
  { value: "non_compliant", label: "Non-compliant" },
  { value: "na", label: "N/A" },
];

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const user = await requireUser();
  if (!canView(user)) redirect("/");

  const { standards: stds, vendors: vends, rows } = await getComplianceMatrix();
  const allStandards = await listStandards();
  const allVendors = await db.select().from(vendors).orderBy(asc(vendors.name));

  // Build a lookup: standardId -> vendorId -> row
  const byStd = new Map<number, Map<number, (typeof vendorCompliance.$inferSelect)>>();
  for (const r of rows) {
    let m = byStd.get(r.standardId);
    if (!m) { m = new Map(); byStd.set(r.standardId, m); }
    m.set(r.vendorId, r);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
          Regulatory &amp; standards coverage
        </div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          Standards &amp; Regulatory Matrix
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Map each vendor against the standards &amp; regulations that apply to them. Status is set
          manually by a reviewer/approver and appears on audit reports.{" "}
          <span className="text-teal-400/80">N/A</span> means the framework is not applicable to
          that vendor&rsquo;s profile.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Frameworks tracked</div>
          <div className="mt-1 font-mono text-[24px] font-semibold text-zinc-100">{allStandards.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Assessed</div>
          <div className="mt-1 font-mono text-[24px] font-semibold text-zinc-100">
            {rows.filter((r) => r.status !== "not_assessed" && r.status !== "na").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Compliant</div>
          <div className="mt-1 font-mono text-[24px] font-semibold text-emerald-300">
            {rows.filter((r) => r.status === "compliant").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Gaps</div>
          <div className="mt-1 font-mono text-[24px] font-semibold text-amber-300">
            {rows.filter((r) => r.status === "partial" || r.status === "non_compliant").length}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <form action={syncComplianceAction}>
          <input type="hidden" name="vendorId" value="0" />
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/6 px-3 py-2 text-[12px] font-medium text-zinc-300 hover:bg-white/10">
            <span className="text-[11px]">Sync register</span>
          </button>
        </form>
        <p className="text-[11px] text-zinc-500">
          Re-evaluates every vendor against the current catalog and creates not-assessed rows for
          newly applicable frameworks.
        </p>
      </div>

      {/* Heatmap matrix: standards x vendors */}
      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-white/8 bg-white/4 px-5 py-4">
          <SectionTitle title="Coverage heatmap" hint="Click a cell to record/update the compliance status" />
        </div>
        <div className="overflow-x-auto border-b border-white/8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/8 sticky top-0 bg-[#0d131a]/60 z-10">
                <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-500">Standard / region</th>
                {allVendors.map((v) => (
                  <th key={v.id} className="px-3 py-3 text-[10px] uppercase tracking-wider text-zinc-500">
                    <div className="truncate w-32 text-right">{v.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allStandards.map((s) => {
                const m = byStd.get(s.id) ?? new Map();
                return (
                  <tr key={s.id} className="border-b border-white/5 last:border-0 group hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 text-[12px]">
                      <div className="font-medium text-zinc-100">{s.code}</div>
                      <div className="text-[11px] text-zinc-500">{s.name}</div>
                      <div className="mt-1 flex gap-1.5">
                        <Pill label={s.region} cls="border-white/8 bg-white/5 text-zinc-400 text-[10px] px-2 py-0.5" />
                        <Pill label={s.category} cls="border-teal-400/30 bg-teal-400/8 text-teal-300 text-[10px] px-2 py-0.5" />
                      </div>
                    </td>
                    {allVendors.map((v) => {
                      const row = m.get(v.id);
                      const applicable = row ? row.status !== "na" : isStandardApplicable(s.applicability, v);
                      const meta = row ? COMPLIANCE_STATUS_META[row.status] : COMPLIANCE_STATUS_META.na;
                      return (
                        <td key={v.id} className="px-3 py-3">
                          {user.role === "admin" || user.role === "reviewer" ? (
                            <form action={setComplianceAction}>
                              <input type="hidden" name="id" value={row ? row.id : 0} />
                              <input type="hidden" name="vendorId" value={v.id} />
                              <select
                                name="status"
                                defaultValue={row ? row.status : "not_assessed"}
                                className="w-full rounded border border-white/10 bg-white/4 px-2 py-1.5 text-[11px] font-medium text-zinc-300 focus:border-teal-400 outline-none"
                              >
                                {STATUS_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <input name="notes" defaultValue={row?.notes ?? ""} hidden />
                              <button className="mt-1.5 rounded bg-teal-400/10 px-2 py-1 text-[10px] font-medium text-teal-300 border border-teal-400/30 hover:bg-teal-400/20">
                                Save
                              </button>
                            </form>
                          ) : (
                            <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", meta.cls)}>
                              {meta.label}
                            </span>
                          )}
                          {!applicable && user.role !== "admin" && user.role !== "reviewer" && (
                            <span className="ml-1 text-[10px] text-zinc-600">(n/a)</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 text-[11px] text-zinc-500 border-t border-white/8">
          Legend
          {Object.entries(COMPLIANCE_STATUS_META).map(([k, m]) => (
            <span key={k} className="ml-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium {m.cls}">
              {m.label}
            </span>
          ))}
        </div>
      </Card>

      {user.role === "admin" || user.role === "reviewer" ? (
        <Card>
          <div className="border-b border-white/8 px-5 py-4">
            <SectionTitle title="Catalog" hint="Frameworks that can be mapped to vendors" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Region</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Applicability</th>
                </tr>
              </thead>
              <tbody>
                {allStandards.map((s) => (
                  <tr key={s.code} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-mono text-[11.5px] text-zinc-300">{s.code}</td>
                    <td className="px-3 py-3 text-zinc-100">{s.name}</td>
                    <td className="px-3 py-3 text-zinc-400">{s.region}</td>
                    <td className="px-3 py-3 text-zinc-400">{s.category}</td>
                    <td className="px-3 py-3 text-[11px] text-zinc-500">{s.applicability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function canView(u: { role: string }) {
  return ["admin", "reviewer", "approver", "auditor"].includes(u.role);
}
