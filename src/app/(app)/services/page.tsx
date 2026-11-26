import Link from "next/link";
import { Network, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listServicesWithDeps } from "@/lib/data";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CRIT_CLS: Record<string, string> = {
  critical: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  high: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  low: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

export default async function ServicesPage() {
  const user = await requireUser();
  if (user.role === "vendor") redirect("/");
  const rows = await listServicesWithDeps();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">Dependency map</div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">Business services &amp; vendor dependencies</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Vendor risk is prioritised by the services that depend on each supplier — concentration points are surfaced, not buried.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ service, deps }) => {
          const totalConc = deps.filter((d) => d.vs.dependencyLevel === "primary").reduce((s, d) => s + (d.vs.concentration ?? 0), 0);
          const singlePoint = deps.length === 1 && deps[0].vs.dependencyLevel === "primary" && (service.criticality === "critical" || service.criticality === "high");
          return (
            <Card key={service.id} className="card-hover">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-teal-400" strokeWidth={1.8} />
                    <h3 className="font-display text-[15px] font-semibold text-zinc-100">{service.name}</h3>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-zinc-500">{service.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Pill label={service.criticality} cls={CRIT_CLS[service.criticality]} />
                  {service.rtoHours != null && <span className="text-[10px] text-zinc-500">RTO {service.rtoHours}h</span>}
                </div>
              </div>

              <div className="mt-3 border-t border-white/6 pt-3">
                {deps.length === 0 ? (
                  <p className="text-[12px] text-zinc-600">No vendor dependencies mapped.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {deps.map((d) => (
                      <li key={d.vs.id} className="flex items-center gap-2 text-[12.5px]">
                        <span className={cn("h-1.5 w-1.5 rounded-full", d.vs.dependencyLevel === "primary" ? "bg-teal-400" : d.vs.dependencyLevel === "partial" ? "bg-sky-400" : "bg-zinc-500")} />
                        <Link href={`/vendors/${d.vs.vendorId}`} className="font-medium text-zinc-200 hover:text-teal-300">{d.vendorName}</Link>
                        <span className="text-[11px] text-zinc-500">
                          {d.vs.dependencyLevel}{d.vs.concentration != null ? ` · ~${d.vs.concentration}%` : ""}
                        </span>
                        {d.vs.concentration != null && d.vs.concentration >= 75 && (
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-300" strokeWidth={1.8} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {singlePoint && (
                  <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-400/15 bg-amber-400/5 px-2.5 py-1.5 text-[11px] leading-snug text-amber-200/90">
                    <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                    Single-point dependency on a {service.criticality} service — consider a documented exit or fallback plan.
                  </p>
                )}
                {totalConc > 100 && deps.length > 1 && (
                  <p className="mt-2 text-[11px] text-zinc-600">Multiple primary providers — total stated concentration {totalConc}%.</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
