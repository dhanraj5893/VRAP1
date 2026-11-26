import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listActionsWithVendors, listFindingsWithVendors } from "@/lib/data";
import { updateActionStatusAction, updateFindingStatusAction } from "@/app/actions";
import { Card, Pill, SectionTitle, SeverityPill } from "@/components/ui";
import { AutoSubmitSelect } from "@/components/client-bits";
import { cn, daysFromNow, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  let actionRows = await listActionsWithVendors();
  let findingRows = await listFindingsWithVendors();

  if (user.role === "vendor" && user.vendorId) {
    actionRows = actionRows.filter((r) => r.action.vendorId === user.vendorId);
    findingRows = findingRows.filter((r) => r.finding.vendorId === user.vendorId);
  }

  const openActions = actionRows.filter((r) => r.action.status !== "done");
  const overdue = openActions.filter((r) => r.action.dueAt && daysFromNow(r.action.dueAt)! < 0);
  const openFindings = findingRows.filter((r) => !["closed", "mitigated"].includes(r.finding.status));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">Follow-up</div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">Findings &amp; remediation actions</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          {openActions.length} open actions ({overdue.length} overdue) · {openFindings.length} open findings
        </p>
      </header>

      <Card className="!p-0">
        <div className="border-b border-white/8 px-5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Actions register</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-2.5 font-medium">Action</th>
                <th className="px-3 py-2.5 font-medium">Vendor</th>
                <th className="px-3 py-2.5 font-medium">Owner</th>
                <th className="px-3 py-2.5 font-medium">Due</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {actionRows.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-500">No actions recorded.</td></tr>
              )}
              {actionRows.map(({ action: a, vendorName }) => {
                const d = daysFromNow(a.dueAt);
                const isOverdue = a.status !== "done" && d != null && d < 0;
                return (
                  <tr key={a.id} className="table-row border-b border-white/5 last:border-0">
                    <td className={cn("max-w-md px-5 py-3", a.status === "done" && "text-zinc-500 line-through")}>{a.title}</td>
                    <td className="px-3 py-3">
                      <Link href={`/vendors/${a.vendorId}`} className="text-zinc-300 hover:text-teal-300">{vendorName}</Link>
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{a.ownerName}</td>
                    <td className={cn("px-3 py-3 font-mono text-[11.5px]", isOverdue ? "text-rose-300" : "text-zinc-400")}>
                      {a.dueAt ? fmtDate(a.dueAt) : "—"}{isOverdue ? " · overdue" : ""}
                    </td>
                    <td className="px-5 py-3">
                      <form action={updateActionStatusAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <AutoSubmitSelect
                          name="status"
                          defaultValue={a.status}
                          options={[
                            { value: "open", label: "Open" },
                            { value: "in_progress", label: "In progress" },
                            { value: "done", label: "Done" },
                          ]}
                        />
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!p-0">
        <div className="border-b border-white/8 px-5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Findings register</span>
        </div>
        <div className="divide-y divide-white/5">
          {findingRows.length === 0 && <p className="px-5 py-8 text-center text-[12.5px] text-zinc-500">No findings recorded.</p>}
          {findingRows.map(({ finding: f, vendorName }) => (
            <div key={f.id} className="table-row flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/vendors/${f.vendorId}`} className="text-[13px] font-medium text-zinc-100 hover:text-teal-300">{f.title}</Link>
                  <SeverityPill severity={f.severity} />
                </div>
                <div className="mt-0.5 text-[11.5px] text-zinc-500">
                  {vendorName} · raised {fmtDate(f.createdAt)}{f.description ? ` — ${f.description}` : ""}
                </div>
              </div>
              {["admin", "reviewer"].includes(user.role) ? (
                <form action={updateFindingStatusAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <AutoSubmitSelect
                    name="status"
                    defaultValue={f.status}
                    options={[
                      { value: "open", label: "Open" },
                      { value: "in_progress", label: "In progress" },
                      { value: "mitigated", label: "Mitigated" },
                      { value: "accepted", label: "Accepted (exception)" },
                      { value: "closed", label: "Closed" },
                    ]}
                  />
                </form>
              ) : (
                <Pill label={f.status.replaceAll("_", " ")} cls="border-white/10 bg-white/4 text-zinc-300" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
