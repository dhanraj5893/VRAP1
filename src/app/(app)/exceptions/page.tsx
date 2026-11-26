import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listExceptionsWithVendors } from "@/lib/data";
import { decideExceptionAction } from "@/app/actions";
import { Card, Pill } from "@/components/ui";
import { Check, X } from "lucide-react";
import { cn, daysFromNow, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage() {
  const user = await requireUser();
  if (user.role === "vendor" || user.role === "auditor") redirect("/");
  const rows = await listExceptionsWithVendors();
  const canDecide = ["admin", "approver"].includes(user.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">Risk acceptance</div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">Exceptions register</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Time-boxed risk acceptances with compensating controls. Expired exceptions must be renewed or retired — never silent.
        </p>
      </header>

      <div className="space-y-3">
        {rows.length === 0 && (
          <Card><p className="py-6 text-center text-[13px] text-zinc-500">No exceptions on record.</p></Card>
        )}
        {rows.map(({ exception: ex, vendorName }) => {
          const d = daysFromNow(ex.expiresAt);
          const expired = ex.status === "active" && d != null && d < 0;
          return (
            <Card key={ex.id} className="card-hover">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/vendors/${ex.vendorId}`} className="text-[14px] font-semibold text-zinc-100 hover:text-teal-300">{ex.title}</Link>
                    <Pill
                      label={expired ? "expired" : ex.status}
                      cls={cn({
                        "border-emerald-400/30 bg-emerald-400/10 text-emerald-300": ex.status === "active" && !expired,
                        "border-amber-400/30 bg-amber-400/10 text-amber-300": ex.status === "proposed" || expired,
                        "border-zinc-500/40 bg-zinc-500/10 text-zinc-400": ex.status === "retired",
                      })}
                    />
                    <span className="text-[11px] text-zinc-500">{vendorName}</span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">{ex.rationale}</p>
                  {ex.compensatingControls && (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
                      <span className="font-medium text-zinc-400">Compensating controls:</span> {ex.compensatingControls}
                    </p>
                  )}
                  <p className={cn("mt-2 text-[11px]", expired ? "font-medium text-amber-300" : "text-zinc-500")}>
                    Registered {fmtDate(ex.createdAt)} · expires {fmtDate(ex.expiresAt)}
                    {d != null && !expired && ex.status === "active" && <span className="font-mono"> ({d}d left)</span>}
                  </p>
                </div>
                {canDecide && ex.status === "proposed" && (
                  <div className="flex gap-2 no-print">
                    <form action={decideExceptionAction}>
                      <input type="hidden" name="id" value={ex.id} />
                      <input type="hidden" name="status" value="active" />
                      <button className="btn btn-ghost !text-emerald-300 hover:!border-emerald-400/40"><Check className="h-3.5 w-3.5" />Activate</button>
                    </form>
                    <form action={decideExceptionAction}>
                      <input type="hidden" name="id" value={ex.id} />
                      <input type="hidden" name="status" value="retired" />
                      <button className="btn btn-danger"><X className="h-3.5 w-3.5" />Decline</button>
                    </form>
                  </div>
                )}
                {canDecide && ex.status === "active" && (
                  <form action={decideExceptionAction} className="no-print">
                    <input type="hidden" name="id" value={ex.id} />
                    <input type="hidden" name="status" value="retired" />
                    <button className="btn btn-ghost">Retire</button>
                  </form>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
