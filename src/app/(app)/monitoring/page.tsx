import { redirect } from "next/navigation";
import { requireUser, can } from "@/lib/auth";
import { listMonitoring } from "@/lib/data";
import { addIncidentAction, updateIncidentStatusAction, addSubProcessorAction, removeSubProcessorAction, raiseTriggerAction, resolveTriggerAction } from "@/app/actions";
import { SeverityPill, Card, SectionTitle, Pill } from "@/components/ui";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { AlertTriangle, MoreHorizontal, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "reviewer" && user.role !== "auditor")
    redirect("/");

  const canManage = can(user, "manageMonitoring");

  const { subProcessors, incidents, triggers, vendors: vends } = await listMonitoring();
  const vendorById = new Map(vends.map((v) => [v.id, v.name]));

  const openIncidents = incidents.filter((i) => i.inc.status !== "closed");
  const activeTriggers = triggers.filter((t) => t.trg.status === "open");
  const unsignedSubs = subProcessors.filter((s) => s.sp.dpaStatus !== "signed");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
          Continuous monitoring
        </div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          Incidents, fourth parties & triggers
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Track vendor incidents, sub-processors (fourth parties), and reassessment triggers.
          High/critical incidents automatically raise a trigger.{" "}
          <span className="text-teal-400/80">Reviewer+</span> only.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-4">
        <Stat card label="Open incidents" value={openIncidents.length} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        <Stat card label="Open triggers" value={activeTriggers.length} tone="warn" icon={<Play className="h-4 w-4" />} />
        <Stat card label="Unsigned DPAs" value={unsignedSubs.length} tone="warn" icon={<MoreHorizontal className="h-4 w-4" />} />
        <Stat card label="Sub-processors" value={subProcessors.length} tone="default" icon={<Play className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Incidents */}
        <Card>
          <div className="border-b border-white/8 px-5 py-4 flex items-center justify-between">
            <SectionTitle title="Incidents" hint="Recorded vendor incidents" />
            {canManage && (
              <form action={addIncidentAction} className="space-y-2">
                <select name="vendorId" required defaultValue="" className="w-full rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none">
                  <option value="" disabled>Select vendor…</option>
                  {vends.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="title" placeholder="Title" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" />
                  <select name="severity" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <input name="occurredAt" type="date" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" />
                <button className="rounded-lg bg-teal-400/10 px-2 py-2 text-[11px] font-medium text-teal-300 hover:bg-teal-400/20">Record</button>
              </form>
            )}
          </div>
          <div className="divide-y divide-white/5 p-3 max-h-[420px] overflow-y-auto">
            {incidents.length === 0 ? (
              <div className="text-[11px] text-zinc-500 text-center py-6">No incidents recorded.</div>
            ) : (
              incidents.map((i) => {
                const v = vendorById.get(i.inc.vendorId);
                return (
                  <div key={i.inc.id} className="pb-2 mb-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-[11.5px] font-medium text-zinc-200 truncate max-w-[140px]">{i.inc.title}</div>
                      <SeverityPill severity={i.inc.severity} />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span>{v}</span>
                      <span>{i.inc.status}</span>
                      <span>{i.inc.occurredAt ? new Date(i.inc.occurredAt).toISOString().slice(0, 10) : "—"}</span>
                    </div>
                    <form action={updateIncidentStatusAction} className="mt-1.5 flex gap-1.5">
                      <input type="hidden" name="id" value={String(i.inc.id)} />
                      <select name="status" defaultValue={i.inc.status} className="rounded border border-white/10 bg-white/4 px-2 py-1 text-[10px] focus:border-teal-400 outline-none">
                        <option value="open">Open</option>
                        <option value="investigating">Investigating</option>
                        <option value="contained">Contained</option>
                        <option value="closed">Closed</option>
                      </select>
                      <button className="rounded bg-white/5 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:bg-white/10">Save</button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Fourth parties */}
        <Card>
          <div className="border-b border-white/8 px-5 py-4 flex items-center justify-between">
            <SectionTitle title="Sub-processors" hint="Vendor&rsquo;s fourth parties" />
            {canManage && (
              <form action={addSubProcessorAction} className="space-y-2">
                <select name="vendorId" required defaultValue="" className="w-full rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none">
                  <option value="" disabled>Select vendor…</option>
                  {vends.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="name" placeholder="Name" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" />
                  <input name="country" placeholder="Country" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" />
                </div>
                <input name="purpose" placeholder="Purpose" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="dataCategories" placeholder="Data categories" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" />
                  <select name="dpaStatus" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none">
                    <option value="not_signed">DPA not signed</option>
                    <option value="signed">DPA signed</option>
                    <option value="na">N/A</option>
                  </select>
                </div>
                <button className="rounded-lg bg-teal-400/10 px-2 py-2 text-[11px] font-medium text-teal-300 hover:bg-teal-400/20">Register</button>
              </form>
            )}
          </div>
          <div className="divide-y divide-white/5 p-3 max-h-[420px] overflow-y-auto">
            {subProcessors.length === 0 ? (
              <div className="text-[11px] text-zinc-500 text-center py-6">No sub-processors registered.</div>
            ) : (
              subProcessors.map((s) => {
                const v = vendorById.get(s.sp.vendorId);
                const dpaOk = s.sp.dpaStatus === "signed";
                return (
                  <div key={s.sp.id} className="pb-2 mb-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-[11.5px] font-medium text-zinc-200 truncate max-w-[140px]">{s.sp.name}</div>
                      <Pill label={dpaOk ? "DPA signed" : "DPA not signed"} cls={dpaOk ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[10px] px-2 py-0.5" : "border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px] px-2 py-0.5"} />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span>{v}</span>
                      <span>{s.sp.country}</span>
                      <span>{s.sp.dataCategories}</span>
                    </div>
                    <form action={removeSubProcessorAction} className="mt-1.5">
                      <input type="hidden" name="id" value={String(s.sp.id)} />
                      <input type="hidden" name="vendorId" value={String(s.sp.vendorId)} />
                      <button className="rounded bg-white/5 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-rose-300 hover:bg-rose-400/8">Remove</button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Triggers */}
        <Card>
          <div className="border-b border-white/8 px-5 py-4 flex items-center justify-between">
            <SectionTitle title="Reassessment triggers" hint="Open triggers ready to convert or dismiss" />
            {canManage && (
              <form action={raiseTriggerAction} className="space-y-2">
                <select name="vendorId" required defaultValue="" className="w-full rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none">
                  <option value="" disabled>Select vendor…</option>
                  {vends.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="reason" placeholder="Reason" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" />
                  <select name="triggerType" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none">
                    <option value="manual">Manual</option>
                    <option value="incident">Incident</option>
                    <option value="evidence_expiry">Evidence expiry</option>
                    <option value="contract_change">Contract change</option>
                    <option value="regulatory">Regulatory</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <button className="rounded-lg bg-teal-400/10 px-2 py-2 text-[11px] font-medium text-teal-300 hover:bg-teal-400/20">Raise</button>
              </form>
            )}
          </div>
          <div className="divide-y divide-white/5 p-3 max-h-[420px] overflow-y-auto">
            {triggers.length === 0 ? (
              <div className="text-[11px] text-zinc-500 text-center py-6">No triggers.</div>
            ) : (
              triggers.map((t) => {
                const v = vendorById.get(t.trg.vendorId);
                return (
                  <div key={t.trg.id} className="pb-2 mb-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-[11.5px] font-medium text-zinc-200 truncate max-w-[140px]">{t.trg.reason}</div>
                      <Pill label={t.trg.triggerType} cls="border-white/8 bg-white/5 text-zinc-400 text-[10px] px-2 py-0.5" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span>{v}</span>
                      <span>{t.trg.status}</span>
                    </div>
                    <form action={resolveTriggerAction} className="mt-1.5 flex gap-1.5">
                      <input type="hidden" name="id" value={String(t.trg.id)} />
                      <button name="decision" value="converted" className="rounded bg-emerald-400/8 px-2 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-400/15">Convert → assess</button>
                      <button name="decision" value="dismissed" className="rounded bg-white/5 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:bg-white/10">Dismiss</button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ card, label, value, tone = "default", icon }: { card?: boolean; label: string; value: number; tone?: "default" | "warn" | "danger" | "good"; icon?: React.ReactNode }) {
  const toneCls = tone === "danger" ? "text-rose-300 border-rose-400/20" : tone === "warn" ? "text-amber-300 border-amber-400/20" : tone === "good" ? "text-emerald-300 border-emerald-400/20" : "text-zinc-100 border-white/8";
  return (
    <div className="rounded-lg border px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
        {icon && <div className="opacity-70">{icon}</div>}
      </div>
      <div className={cn("mt-2 font-mono text-[24px] font-semibold leading-none", toneCls)}>{value}</div>
    </div>
  );
}

