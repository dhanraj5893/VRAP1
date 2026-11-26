import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { businessServices } from "@/db/schema";
import { asc } from "drizzle-orm";
import { createVendorAction } from "@/app/actions";
import { Card, SectionTitle } from "@/components/ui";
import { FACTOR_LABELS, INHERENT_WEIGHTS } from "@/lib/scoring";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const LEVELS = [1, 2, 3, 4, 5];

function FactorSelect({
  name,
  label,
  weight,
  defaultValue = 3,
  help,
}: {
  name: string;
  label: string;
  weight: number;
  defaultValue?: number;
  help: string;
}) {
  return (
    <div>
      <label className="mb-1 flex items-baseline justify-between text-[12px] font-medium text-zinc-300">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-zinc-500">weight {(weight * 100).toFixed(0)}%</span>
      </label>
      <select name={name} defaultValue={defaultValue} className="select">
        {LEVELS.map((l) => (
          <option key={l} value={l}>{l} — {FACTOR_LABELS[l]}</option>
        ))}
      </select>
      <p className="mt-1 text-[11px] leading-snug text-zinc-600">{help}</p>
    </div>
  );
}

export default async function NewVendorPage() {
  const user = await requireUser();
  if (user.role === "vendor" || user.role === "approver") redirect("/vendors");
  const services = await db.select().from(businessServices).orderBy(asc(businessServices.name));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/vendors" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to register
      </Link>

      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">Module 1 · Intake</div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">Vendor intake &amp; classification</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Register the supplier, record exposure factors and map the business services that depend on them.
          These inputs drive the explainable inherent-exposure score.
        </p>
      </header>

      <form action={createVendorAction} className="space-y-5">
        <Card>
          <SectionTitle title="Vendor profile" />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-zinc-300">Vendor name *</label>
              <input name="name" required className="input" placeholder="e.g. Nimbus Cloud Hosting" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-zinc-300">Category</label>
              <select name="category" className="select" defaultValue="Cloud hosting / IaaS">
                {["Cloud hosting / IaaS", "SaaS - business application", "SaaS - payroll", "SaaS - CRM", "SaaS - analytics", "Managed security services", "Managed IT services", "Data processing", "Logistics services", "Professional services", "Office supplies", "Other"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-zinc-300">Country / hosting locations</label>
              <input name="country" className="input" placeholder="e.g. India (DCs: Mumbai, Singapore)" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-zinc-300">Internal relationship owner</label>
              <input name="ownerName" className="input" placeholder="e.g. K. Deshmukh (IT Infra)" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-zinc-300">Vendor contact name</label>
              <input name="contactName" className="input" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-zinc-300">Vendor contact email</label>
              <input name="contactEmail" type="email" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[12px] font-medium text-zinc-300">Notes</label>
              <textarea name="notes" rows={2} className="textarea" placeholder="Context, contract notes, prior incidents…" />
            </div>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-[12px] text-zinc-300">
                <input type="checkbox" name="personalDataFlag" className="accent-teal-400" />
                Processes personal data <span className="text-zinc-600">(DPDP screening flag)</span>
              </label>
              <label className="flex items-center gap-2 text-[12px] text-zinc-300">
                <input type="checkbox" name="aiUseFlag" className="accent-teal-400" />
                Uses AI in service delivery <span className="text-zinc-600">(AI-governance flag)</span>
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle
            title="Inherent exposure factors"
            hint="1 = very low … 5 = very high. Weighted and fully visible in the score breakdown."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FactorSelect name="serviceCriticality" label="Service criticality" weight={INHERENT_WEIGHTS.serviceCriticality} defaultValue={3} help="Business impact if this vendor's service fails or is compromised." />
            <FactorSelect name="dataSensitivity" label="Data sensitivity" weight={INHERENT_WEIGHTS.dataSensitivity} defaultValue={3} help="Confidentiality and regulatory sensitivity of data the vendor handles." />
            <FactorSelect name="systemAccess" label="System access / integration" weight={INHERENT_WEIGHTS.systemAccess} defaultValue={3} help="Depth of access: none → data feed → API integration → privileged admin." />
            <FactorSelect name="geographicExposure" label="Geographic exposure" weight={INHERENT_WEIGHTS.geographicExposure} defaultValue={2} help="Jurisdictional, concentration and third-country transfer considerations." />
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5 text-[11.5px] leading-relaxed text-zinc-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" strokeWidth={1.8} />
            Dependency / concentration (15%) is derived automatically from the service mapping below:
            a primary provider with high concentration scores highest. Nothing is hidden.
          </div>
        </Card>

        <Card>
          <SectionTitle title="Business service mapping" hint="Which of our services depend on this vendor, and how heavily?" />
          <div className="space-y-2.5">
            {services.map((s) => (
              <div key={s.id} className="grid grid-cols-[1fr_150px_120px] items-center gap-3 rounded-lg border border-white/6 bg-white/2 px-3.5 py-2.5">
                <label className="flex items-center gap-2.5 text-[13px] text-zinc-200">
                  <input type="checkbox" name="serviceIds" value={s.id} className="accent-teal-400" />
                  <span>
                    {s.name}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-500">{s.criticality}</span>
                  </span>
                </label>
                <select name={`depLevel_${s.id}`} className="select !py-1 !text-[12px]" defaultValue="partial">
                  <option value="primary">Primary provider</option>
                  <option value="partial">Partial dependency</option>
                  <option value="backup">Backup provider</option>
                </select>
                <input name={`conc_${s.id}`} type="number" min={0} max={100} placeholder="% conc." className="input !py-1 !text-[12px]" />
              </div>
            ))}
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px] text-zinc-300">
            <input type="checkbox" name="startAssessment" defaultChecked className="accent-teal-400" />
            Issue the standard questionnaire immediately (v1)
          </label>
          <div className="flex gap-2">
            <Link href="/vendors" className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary">Register vendor</button>
          </div>
        </div>
      </form>
    </div>
  );
}
