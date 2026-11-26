import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, CalendarClock, FileText, Mail, RefreshCcw,
  ShieldAlert, User,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getVendorBundle } from "@/lib/data";
import { db } from "@/db";
import { businessServices } from "@/db/schema";
import { asc } from "drizzle-orm";
import {
  addActionItemAction, addExceptionAction, addFindingAction, addVendorServiceAction,
  registerEvidenceAction, removeVendorServiceAction, reviewEvidenceAction,
  triggerReassessmentAction, updateResilienceAction,
} from "@/app/actions";
import {
  AssessmentStatusPill, Card, EmptyState, EvidencePill, Pill, SectionTitle,
  SeverityPill, VendorStatusPill,
} from "@/components/ui";
import { AutoSubmitSelect } from "@/components/client-bits";
import { RESILIENCE_META, TIER_META } from "@/lib/scoring";
import { cn, daysFromNow, effectiveEvidenceStatus, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const vendorId = parseInt(id, 10);
  if (!Number.isFinite(vendorId)) notFound();

  // Vendor representatives are hard-scoped to their own record
  if (user.role === "vendor" && user.vendorId !== vendorId) redirect(user.vendorId ? `/vendors/${user.vendorId}` : "/login");

  const bundle = await getVendorBundle(vendorId);
  if (!bundle) notFound();
  const { vendor, deps, assessments: vAssessments, evidence: vEvidence, resilience, resilienceScore, findings: vFindings, actions: vActions, exceptions: vExceptions, trail, inherent } = bundle;

  const allServices = await db.select().from(businessServices).orderBy(asc(businessServices.name));
  const mappedIds = new Set(deps.map((d) => d.vs.serviceId));
  const unmapped = allServices.filter((s) => !mappedIds.has(s.id));
  const canManage = ["admin", "reviewer"].includes(user.role);
  const tierMeta = TIER_META[inherent.tier];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/vendors" className="no-print inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Vendor register
      </Link>

      {/* Header */}
      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-50">{vendor.name}</h1>
              <VendorStatusPill status={vendor.status} />
              {vendor.personalDataFlag && <Pill label="Processes personal data" cls="border-violet-400/30 bg-violet-400/10 text-violet-300" />}
              {vendor.aiUseFlag && <Pill label="AI in service" cls="border-sky-400/30 bg-sky-400/10 text-sky-300" />}
            </div>
            <p className="mt-1 text-[13px] text-zinc-500">{vendor.category} · {vendor.country}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-zinc-400">
              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-zinc-500" />{vendor.ownerName}</span>
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-zinc-500" />{vendor.contactName} · {vendor.contactEmail}</span>
              {vendor.nextReassessmentAt && (
                <span className="flex items-center gap-1.5 text-amber-300/90"><CalendarClock className="h-3.5 w-3.5" />Next reassessment {fmtDate(vendor.nextReassessmentAt)}</span>
              )}
            </div>
          </div>
          {canManage && (
            <form action={triggerReassessmentAction} className="no-print flex items-center gap-2">
              <input type="hidden" name="vendorId" value={vendor.id} />
              <input name="reason" placeholder="Trigger reason (incident, expiry, change)…" className="input !w-72" required />
              <button className="btn btn-ghost"><RefreshCcw className="h-3.5 w-3.5" strokeWidth={1.8} />Open reassessment</button>
            </form>
          )}
        </div>
        {vendor.notes && <p className="mt-4 border-t border-white/6 pt-3 text-[12.5px] leading-relaxed text-zinc-400">{vendor.notes}</p>}
      </header>

      {/* Score overview */}
      <div className="grid gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Inherent exposure</div>
          <div className="mt-2 flex items-end gap-2">
            <span className={cn("font-mono text-3xl font-semibold leading-none", tierMeta.cls.split(" ")[0])}>{inherent.score}</span>
            <span className={cn("mb-0.5 rounded-full border px-2 py-px text-[10px] font-semibold", tierMeta.cls)}>{tierMeta.label}</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">From intake factors, before controls</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Assessments</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-mono text-3xl font-semibold leading-none text-zinc-100">{vAssessments.length}</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            Latest: {vAssessments[0] ? <>v{vAssessments[0].version} · {vAssessments[0].status.replaceAll("_", " ")}</> : "none yet"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Resilience readiness</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-mono text-3xl font-semibold leading-none text-zinc-100">{resilienceScore.score ?? "—"}</span>
            <span className={cn("mb-0.5 rounded-full border px-2 py-px text-[10px] font-semibold", RESILIENCE_META[resilienceScore.status].cls)}>
              {RESILIENCE_META[resilienceScore.status].label}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">Separate from cyber risk rating</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Open follow-up</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-mono text-3xl font-semibold leading-none text-zinc-100">{vActions.filter((a) => a.status !== "done").length}</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            {vFindings.filter((f) => !["closed", "mitigated"].includes(f.status)).length} open findings · {vExceptions.filter((e) => e.status !== "retired").length} exceptions
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Inherent breakdown */}
        <Card>
          <SectionTitle title="Inherent exposure breakdown" hint="Every point traces to an intake factor × weight" />
          <div className="space-y-3">
            {inherent.contributions.map((c) => (
              <div key={c.key}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="font-medium text-zinc-300">{c.label}</span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {c.value} × {(c.weight * 100).toFixed(0)}% = <span className="text-zinc-200">{c.points}</span> pts
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/5">
                  <div className="h-1.5 rounded-full bg-teal-400/80" style={{ width: `${c.value}%` }} />
                </div>
                <div className="mt-0.5 text-[10.5px] text-zinc-600">{c.inputLabel}</div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-white/8 pt-3 text-[12.5px]">
              <span className="font-medium text-zinc-300">Total inherent exposure</span>
              <span className={cn("font-mono font-semibold", tierMeta.cls.split(" ")[0])}>{inherent.score} / 100</span>
            </div>
          </div>
        </Card>

        {/* Service dependencies */}
        <Card>
          <SectionTitle title="Business service dependencies" hint="What breaks if this vendor fails" />
          {deps.length === 0 ? (
            <EmptyState title="No services mapped" hint="Map the business services this vendor supports." />
          ) : (
            <div className="space-y-2.5">
              {deps.map(({ vs, service }) => (
                <div key={vs.id} className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/2 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-100">
                      {service.name}
                      <Pill
                        label={service.criticality}
                        cls={cn({
                          "border-rose-400/30 bg-rose-400/10 text-rose-300": service.criticality === "critical",
                          "border-orange-400/30 bg-orange-400/10 text-orange-300": service.criticality === "high",
                          "border-amber-400/30 bg-amber-400/10 text-amber-200": service.criticality === "medium",
                          "border-sky-400/30 bg-sky-400/10 text-sky-300": service.criticality === "low",
                        })}
                      />
                      {service.rtoHours != null && <span className="text-[10px] text-zinc-500">RTO {service.rtoHours}h</span>}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {vs.dependencyLevel} provider{vs.concentration != null ? ` · ~${vs.concentration}% concentration` : ""}{vs.notes ? ` — ${vs.notes}` : ""}
                    </div>
                  </div>
                  {vs.concentration != null && vs.concentration >= 75 && (
                    <span className="flex items-center gap-1 text-[10.5px] font-medium text-amber-300"><ShieldAlert className="h-3.5 w-3.5" />concentration</span>
                  )}
                  {canManage && (
                    <form action={removeVendorServiceAction} className="no-print">
                      <input type="hidden" name="id" value={vs.id} />
                      <input type="hidden" name="vendorId" value={vendor.id} />
                      <button className="text-[11px] text-zinc-600 hover:text-rose-300">Remove</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
          {canManage && unmapped.length > 0 && (
            <form action={addVendorServiceAction} className="no-print mt-4 grid grid-cols-[1fr_130px_90px_auto] items-end gap-2 border-t border-white/6 pt-3">
              <input type="hidden" name="vendorId" value={vendor.id} />
              <select name="serviceId" className="select !py-1.5 !text-[12px]">
                {unmapped.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select name="dependencyLevel" className="select !py-1.5 !text-[12px]" defaultValue="partial">
                <option value="primary">Primary</option>
                <option value="partial">Partial</option>
                <option value="backup">Backup</option>
              </select>
              <input name="concentration" type="number" min={0} max={100} placeholder="Conc. %" className="input !py-1.5 !text-[12px]" />
              <button className="btn btn-ghost !py-1.5 !text-[12px]">Map</button>
            </form>
          )}
        </Card>
      </div>

      {/* Assessments */}
      <Card>
        <SectionTitle title="Assessment history" hint="Versioned questionnaires with decisions and rationale" />
        {vAssessments.length === 0 ? (
          <EmptyState title="No assessments yet" hint="Issue a reassessment from the header to begin the lifecycle." />
        ) : (
          <div className="space-y-2">
            {vAssessments.map((a) => (
              <Link
                key={a.id}
                href={`/assessments/${a.id}`}
                className="group flex items-center gap-4 rounded-lg border border-white/6 bg-white/2 px-4 py-3 transition-colors hover:border-teal-400/25"
              >
                <span className="font-mono text-[12px] font-semibold text-zinc-300">v{a.version}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-zinc-100 group-hover:text-teal-300">
                    {a.triggerReason ?? "Assessment"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    Issued {fmtDate(a.issuedAt)} · due {fmtDate(a.dueAt)}
                    {a.decidedAt && <> · decided {fmtDate(a.decidedAt)}</>}
                  </div>
                </div>
                <AssessmentStatusPill status={a.status} />
                <ArrowUpRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-300" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Evidence register */}
      <Card id="evidence">
        <SectionTitle
          title="Evidence register"
          hint="Owner, versions, validity dates and reviewer status — expired items lose confidence but never auto-fail a control"
        />
        {vEvidence.length === 0 ? (
          <EmptyState title="No evidence registered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Valid until</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Reviewer note</th>
                  {canManage && <th className="py-2 pl-3 font-medium no-print">Review</th>}
                </tr>
              </thead>
              <tbody>
                {vEvidence.map((ev) => {
                  const eff = effectiveEvidenceStatus(ev.status, ev.validUntil);
                  return (
                    <tr key={ev.id} className="table-row border-b border-white/5 align-top last:border-0">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5 font-medium text-zinc-100">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                          {ev.title} <span className="font-mono text-[10px] text-zinc-500">v{ev.version}</span>
                        </div>
                        <div className="mt-0.5 pl-5 text-[10.5px] text-zinc-600">{ev.type}{ev.fileName ? ` · ${ev.fileName}` : ""}</div>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">{ev.owner}</td>
                      <td className={cn("px-3 py-2.5", eff === "stale" ? "text-amber-300" : "text-zinc-400")}>{fmtDate(ev.validUntil)}</td>
                      <td className="px-3 py-2.5"><EvidencePill status={eff} /></td>
                      <td className="max-w-56 px-3 py-2.5 text-[11.5px] leading-snug text-zinc-500">{ev.reviewerNote || "—"}</td>
                      {canManage && (
                        <td className="py-2.5 pl-3 no-print">
                          <form action={reviewEvidenceAction} className="flex items-center gap-1.5">
                            <input type="hidden" name="id" value={ev.id} />
                            <AutoSubmitSelect
                              name="status"
                              defaultValue={ev.status === "missing" ? "submitted" : ev.status}
                              options={[
                                { value: "verified", label: "Verify" },
                                { value: "submitted", label: "Submitted" },
                                { value: "clarification_requested", label: "Clarify" },
                                { value: "rejected", label: "Reject" },
                              ]}
                            />
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* register new evidence: vendor rep uploads, reviewers may also register */}
        {(canManage || (user.role === "vendor" && user.vendorId === vendor.id)) && (
          <form action={registerEvidenceAction} className="no-print mt-4 grid grid-cols-[1.4fr_130px_1fr_130px_auto] items-end gap-2 border-t border-white/6 pt-3">
            <input type="hidden" name="vendorId" value={vendor.id} />
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Evidence title</label>
              <input name="title" required className="input !py-1.5 !text-[12px]" placeholder="e.g. Penetration test summary 2025" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Type</label>
              <select name="type" className="select !py-1.5 !text-[12px]">
                {["policy", "certificate", "report", "test", "contract", "other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">File reference</label>
              <input name="fileName" className="input !py-1.5 !text-[12px]" placeholder="document.pdf (metadata only)" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Valid until</label>
              <input name="validUntil" type="date" className="input !py-1.5 !text-[12px]" />
            </div>
            <button className="btn btn-ghost !py-1.5 !text-[12px]">Register</button>
          </form>
        )}
      </Card>

      {/* Resilience */}
      <Card id="resilience">
        <SectionTitle
          title="Resilience readiness"
          hint="Continuity plan + recovery exercise — reported separately from the cyber risk rating (no single score hides a failed test)"
        />
        {resilience ? (
          <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
            <div className="space-y-2.5">
              <InfoRow label="Continuity / DR plan" value={resilience.continuityPlanStatus} />
              <InfoRow label="Last exercise" value={resilience.lastExerciseAt ? fmtDate(resilience.lastExerciseAt) : "not run"} />
              <InfoRow label="Exercise outcome" value={resilience.exerciseOutcome.replaceAll("_", " ")} warn={resilience.exerciseOutcome === "failed" || resilience.exerciseOutcome === "partial"} />
              <InfoRow label="Vendor RTO" value={resilience.rtoHours != null ? `${resilience.rtoHours} hours` : "—"} />
              {resilience.notes && <p className="rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-[11.5px] leading-relaxed text-amber-200/80">{resilience.notes}</p>}
            </div>
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">Readiness composition</div>
              <div className="space-y-2">
                {resilienceScore.parts.map((p) => (
                  <div key={p.label} className="flex items-center gap-3">
                    <span className="w-40 text-[11.5px] text-zinc-400">{p.label}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-white/5">
                      <div className={cn("h-1.5 rounded-full", p.value >= 80 ? "bg-emerald-400" : p.value >= 50 ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${p.value}%` }} />
                    </div>
                    <span className="w-10 text-right font-mono text-[11px] text-zinc-400">{p.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-zinc-600">Readiness {resilienceScore.score ?? "—"}/100 → {RESILIENCE_META[resilienceScore.status].label}</div>
            </div>
          </div>
        ) : (
          <EmptyState title="No resilience record" />
        )}
        {canManage && (
          <form action={updateResilienceAction} className="no-print mt-4 grid grid-cols-[1fr_1fr_130px_100px_auto] items-end gap-2 border-t border-white/6 pt-3">
            <input type="hidden" name="vendorId" value={vendor.id} />
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Plan status</label>
              <select name="continuityPlanStatus" className="select !py-1.5 !text-[12px]" defaultValue={resilience?.continuityPlanStatus ?? "none"}>
                {["none", "draft", "approved", "tested"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Exercise outcome</label>
              <select name="exerciseOutcome" className="select !py-1.5 !text-[12px]" defaultValue={resilience?.exerciseOutcome ?? "not_run"}>
                {["not_run", "failed", "partial", "passed"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Exercise date</label>
              <input name="lastExerciseAt" type="date" className="input !py-1.5 !text-[12px]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">RTO (h)</label>
              <input name="rtoHours" type="number" min={0} className="input !py-1.5 !text-[12px]" defaultValue={resilience?.rtoHours ?? undefined} />
            </div>
            <button className="btn btn-ghost !py-1.5 !text-[12px]">Update</button>
          </form>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Findings & actions */}
        <Card>
          <SectionTitle title="Findings & remediation actions" hint="Time-bound follow-up work with owners" />
          {vFindings.length === 0 ? (
            <EmptyState title="No findings raised" />
          ) : (
            <div className="mb-4 space-y-2">
              {vFindings.map((f) => (
                <div key={f.id} className="rounded-lg border border-white/6 bg-white/2 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-zinc-100">{f.title}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <SeverityPill severity={f.severity} />
                      <Pill label={f.status.replaceAll("_", " ")} cls="border-white/10 bg-white/4 text-zinc-300" />
                    </div>
                  </div>
                  {f.description && <p className="mt-1 text-[11.5px] leading-snug text-zinc-500">{f.description}</p>}
                </div>
              ))}
            </div>
          )}
          {vActions.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {vActions.map((a) => {
                const overdue = a.status !== "done" && a.dueAt && daysFromNow(a.dueAt)! < 0;
                return (
                  <div key={a.id} className="flex items-center gap-3 text-[12px]">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", a.status === "done" ? "bg-emerald-400" : overdue ? "bg-rose-400" : "bg-amber-400")} />
                    <span className={cn("flex-1", a.status === "done" ? "text-zinc-500 line-through" : "text-zinc-300")}>{a.title}</span>
                    <span className={cn("shrink-0 font-mono text-[10.5px]", overdue ? "text-rose-300" : "text-zinc-500")}>
                      {a.dueAt ? fmtDate(a.dueAt) : "no due date"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {canManage && (
            <details className="no-print rounded-lg border border-white/6 bg-white/2 px-3.5 py-2.5">
              <summary className="cursor-pointer text-[12px] font-medium text-teal-300">+ Add finding or action</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <form action={addFindingAction} className="space-y-2">
                  <input type="hidden" name="vendorId" value={vendor.id} />
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">New finding</div>
                  <input name="title" required className="input !py-1.5 !text-[12px]" placeholder="Finding title" />
                  <select name="severity" className="select !py-1.5 !text-[12px]">
                    {["low", "medium", "high", "critical"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <textarea name="description" rows={2} className="textarea !text-[12px]" placeholder="Description / impact" />
                  <button className="btn btn-ghost !py-1.5 !text-[12px]">Raise finding</button>
                </form>
                <form action={addActionItemAction} className="space-y-2">
                  <input type="hidden" name="vendorId" value={vendor.id} />
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">New action</div>
                  <input name="title" required className="input !py-1.5 !text-[12px]" placeholder="Action title" />
                  <input name="ownerName" className="input !py-1.5 !text-[12px]" placeholder="Owner" />
                  <input name="dueAt" type="date" className="input !py-1.5 !text-[12px]" />
                  <button className="btn btn-ghost !py-1.5 !text-[12px]">Create action</button>
                </form>
              </div>
            </details>
          )}
        </Card>

        {/* Exceptions + audit */}
        <div className="space-y-5">
          <Card>
            <SectionTitle title="Risk exceptions" hint="Accepted risks with expiry — never silent" />
            {vExceptions.length === 0 ? (
              <EmptyState title="No exceptions" />
            ) : (
              <div className="space-y-2">
                {vExceptions.map((ex) => {
                  const d = daysFromNow(ex.expiresAt);
                  const expired = ex.status === "active" && d != null && d < 0;
                  return (
                    <div key={ex.id} className="rounded-lg border border-white/6 bg-white/2 px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-medium text-zinc-100">{ex.title}</span>
                        <Pill
                          label={expired ? "expired" : ex.status}
                          cls={cn({
                            "border-emerald-400/30 bg-emerald-400/10 text-emerald-300": ex.status === "active" && !expired,
                            "border-amber-400/30 bg-amber-400/10 text-amber-300": ex.status === "proposed" || expired,
                            "border-zinc-500/40 bg-zinc-500/10 text-zinc-400": ex.status === "retired",
                          })}
                        />
                      </div>
                      <p className="mt-1 text-[11.5px] leading-snug text-zinc-500">{ex.rationale}</p>
                      {ex.compensatingControls && <p className="mt-1 text-[11px] text-zinc-500"><span className="font-medium text-zinc-400">Compensating:</span> {ex.compensatingControls}</p>}
                      <div className={cn("mt-1.5 text-[10.5px]", expired ? "text-amber-300" : "text-zinc-600")}>Expires {fmtDate(ex.expiresAt)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {canManage && (
              <details className="no-print mt-3 rounded-lg border border-white/6 bg-white/2 px-3.5 py-2.5">
                <summary className="cursor-pointer text-[12px] font-medium text-teal-300">+ Propose exception</summary>
                <form action={addExceptionAction} className="mt-3 space-y-2">
                  <input type="hidden" name="vendorId" value={vendor.id} />
                  <input name="title" required className="input !py-1.5 !text-[12px]" placeholder="Exception title" />
                  <textarea name="rationale" rows={2} className="textarea !text-[12px]" placeholder="Why is this risk being accepted?" />
                  <textarea name="compensatingControls" rows={2} className="textarea !text-[12px]" placeholder="Compensating controls" />
                  <input name="expiresAt" type="date" className="input !py-1.5 !text-[12px]" />
                  <button className="btn btn-ghost !py-1.5 !text-[12px]">Propose exception</button>
                </form>
              </details>
            )}
          </Card>

          <Card>
            <SectionTitle title="Decision & activity history" hint="Auditable trail: submissions, reviews, approvals, changes" />
            {trail.length === 0 ? (
              <EmptyState title="No recorded events" />
            ) : (
              <ol className="relative max-h-80 space-y-3.5 overflow-y-auto border-l border-white/8 pl-5 pr-2">
                {trail.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#10161d] bg-teal-400/70" />
                    <div className="text-[12px] font-medium text-zinc-200">{e.action}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">{e.detail}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">{e.actorName} · {fmtDate(e.createdAt)}</div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/6 bg-white/2 px-3.5 py-2">
      <span className="text-[12px] text-zinc-400">{label}</span>
      <span className={cn("text-[12px] font-medium capitalize", warn ? "text-amber-300" : "text-zinc-100")}>{value}</span>
    </div>
  );
}
