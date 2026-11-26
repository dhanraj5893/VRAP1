import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { assessments, vendors } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { AssessmentStatusPill, Card, EmptyState, SectionTitle } from "@/components/ui";
import { cn, fmtDate, daysFromNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const user = await requireUser();

  let rows = await db
    .select({ a: assessments, vendorName: vendors.name })
    .from(assessments)
    .innerJoin(vendors, eq(assessments.vendorId, vendors.id))
    .orderBy(desc(assessments.createdAt));

  if (user.role === "vendor") {
    rows = user.vendorId ? rows.filter((r) => r.a.vendorId === user.vendorId) : [];
  }

  const buckets: { key: string; label: string; filter: (s: string) => boolean }[] = [
    { key: "attention", label: "Needs attention", filter: (s) => ["issued", "in_review", "decision_pending"].includes(s) },
    { key: "decided", label: "Decided", filter: (s) => ["approved", "conditionally_approved", "on_hold"].includes(s) },
    { key: "draft", label: "Draft / other", filter: (s) => !["issued", "in_review", "decision_pending", "approved", "conditionally_approved", "on_hold"].includes(s) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">Workflow</div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">Assessments</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Versioned questionnaire lifecycle: issued → responses → review → human decision → monitoring.
        </p>
      </header>

      {buckets.map(({ key, label, filter }) => {
        const list = rows.filter((r) => filter(r.a.status));
        if (list.length === 0) return null;
        return (
          <Card key={key} className="!p-0">
            <div className="border-b border-white/8 px-5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
              <span className="ml-2 font-mono text-[11px] text-zinc-600">{list.length}</span>
            </div>
            <div>
              {list.map(({ a, vendorName }) => {
                const due = daysFromNow(a.dueAt);
                const overdue = !["approved", "conditionally_approved"].includes(a.status) && due != null && due < 0;
                return (
                  <Link
                    key={a.id}
                    href={`/assessments/${a.id}`}
                    className="table-row group flex items-center gap-4 border-b border-white/5 px-5 py-3.5 last:border-0"
                  >
                    <span className="w-10 shrink-0 font-mono text-[12px] font-semibold text-zinc-400">v{a.version}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-zinc-100 group-hover:text-teal-300">{vendorName}</span>
                        <AssessmentStatusPill status={a.status} />
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-zinc-500">{a.triggerReason ?? "Assessment"}</div>
                    </div>
                    <div className="hidden text-right text-[11.5px] sm:block">
                      <div className={cn(overdue ? "text-rose-300" : "text-zinc-400")}>
                        due {fmtDate(a.dueAt)}{overdue ? " (overdue)" : due != null ? ` (${due}d)` : ""}
                      </div>
                      {a.decidedAt && <div className="text-zinc-600">decided {fmtDate(a.decidedAt)}</div>}
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-300" />
                  </Link>
                );
              })}
            </div>
          </Card>
        );
      })}

      {rows.length === 0 && <EmptyState title="No assessments visible" hint="Assessments appear here once issued to a vendor." />}
    </div>
  );
}
