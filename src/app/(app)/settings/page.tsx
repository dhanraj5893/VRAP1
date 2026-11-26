import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getScoringParams, listScoringConfig } from "@/lib/data";
import { saveScoringConfigAction } from "@/app/actions";
import { Card, SectionTitle, Pill } from "@/components/ui";
import { DEFAULT_SCORING_PARAMS } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");

  const params = await getScoringParams();
  const configRows = await listScoringConfig();

  const weightFields = [
    { key: "w_serviceCriticality", label: "Service criticality", hint: "How mission-critical the vendor&rsquo;s service is" },
    { key: "w_dataSensitivity", label: "Data sensitivity", hint: "Sensitivity of data the vendor can access" },
    { key: "w_systemAccess", label: "System access / integration", hint: "Depth and privilege of system access" },
    { key: "w_dependency", label: "Dependency / concentration", hint: "How dependent the business is on this vendor" },
    { key: "w_geographicExposure", label: "Geographic exposure", hint: "Cross-border / jurisdiction risk" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
          Scoring model configuration
        </div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          Transparent risk factors
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Weights drive the inherent exposure score shown throughout the portal. They must sum to
          100%. Changes apply immediately to new and existing assessments and are recorded in the
          audit trail. Administrator only.
        </p>
      </header>

      <Card>
        <div className="border-b border-white/8 px-5 py-4">
          <SectionTitle title="Inherent risk weights" hint="Each vendor is scored 1-5 on five factors; this is their relative importance" />
        </div>
        <form action={saveScoringConfigAction} className="divide-y divide-white/6 p-5 space-y-4">
          {weightFields.map((f) => {
            const current = Math.round((params.weights[f.key] ?? DEFAULT_SCORING_PARAMS.weights[f.key]) * 1000) / 10;
            return (
              <div key={f.key} className="flex items-center gap-4 px-2">
                <div className="w-48 text-[12.5px]">
                  <div className="font-medium text-zinc-200">{f.label}</div>
                  <div className="text-[11px] text-zinc-500">{f.hint}</div>
                </div>
                <div className="flex-1 max-w-xs">
                  <input
                    name={f.key}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    defaultValue={String(current)}
                    className="w-20 rounded border border-white/10 bg-white/4 px-2 py-1.5 text-[12px] font-mono text-zinc-100 focus:border-teal-400 outline-none"
                  />
                  <span className="ml-2 text-[11px] text-zinc-500">%</span>
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-white/6">
            <div className="flex justify-between text-[11px] font-medium text-zinc-300 mb-2">
              <span>Total (must equal 100%)</span>
              <span id="weight-total" className="font-mono">{Object.values(params.weights).reduce((a, b) => a + b, 0) * 100}%</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 mt-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Mitigation cap</div>
              <input
                name="mitigation_cap"
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue={String(params.mitigationCap * 100)}
                className="w-20 rounded border border-white/10 bg-white/4 px-2 py-1.5 text-[12px] font-mono text-zinc-100 focus:border-teal-400 outline-none"
              />
              <div className="text-[10px] text-zinc-500">Max residual reduction from controls</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Moderate threshold</div>
              <input
                name="tier_moderate"
                type="number"
                min="0"
                max="100"
                defaultValue={String(params.tierModerate)}
                className="w-20 rounded border border-white/10 bg-white/4 px-2 py-1.5 text-[12px] font-mono text-zinc-100 focus:border-teal-400 outline-none"
              />
              <div className="text-[10px] text-zinc-500">Inherent score ≥ this = moderate</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">High threshold</div>
              <input
                name="tier_high"
                type="number"
                min="0"
                max="100"
                defaultValue={String(params.tierHigh)}
                className="w-20 rounded border border-white/10 bg-white/4 px-2 py-1.5 text-[12px] font-mono text-zinc-100 focus:border-teal-400 outline-none"
              />
              <div className="text-[10px] text-zinc-500">Inherent score ≥ this = high</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Critical threshold</div>
              <input
                name="tier_critical"
                type="number"
                min="0"
                max="100"
                defaultValue={String(params.tierCritical)}
                className="w-20 rounded border border-white/10 bg-white/4 px-2 py-1.5 text-[12px] font-mono text-zinc-100 focus:border-teal-400 outline-none"
              />
              <div className="text-[10px] text-zinc-500">Inherent score ≥ this = critical</div>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-zinc-500">
            Residual risk = inherent × (1 − mitigation cap × control effectiveness / 100). Tier
            thresholds split inherent scores into low / moderate / high / critical.
          </p>
          <div className="mt-6">
            <button className="rounded-lg bg-teal-400/10 px-4 py-2 text-[11.5px] font-medium text-teal-300 border border-teal-400/30 hover:bg-teal-400/20">
              Save scoring model
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="border-b border-white/8 px-5 py-4">
          <SectionTitle title="Current stored configuration" hint="Values persisted in scoring_config" />
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {configRows.map((r) => (
                <tr key={r.key} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2 font-mono text-[11px] text-zinc-300">{r.key}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-zinc-100">
                    {(r.value / 1000).toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-[11px] text-zinc-400">{r.label}</td>
                  <td className="px-4 py-2 text-[11px] text-zinc-500">{r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
