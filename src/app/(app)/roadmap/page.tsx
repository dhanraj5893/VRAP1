import { CheckCircle2, CircleDashed, FlaskConical, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Status = "done" | "progress" | "planned";

const MODULES: { name: string; detail: string; status: Status; demo: string }[] = [
  {
    name: "Vendor intake & classification",
    detail: "Profile, owner, contacts, data/system access, personal-data & AI-use screening flags, inherent risk factor capture.",
    status: "done",
    demo: "Vendors → New vendor",
  },
  {
    name: "Service & dependency mapping",
    detail: "Vendor-to-business-service links with dependency level and concentration; single-point warnings on critical services.",
    status: "done",
    demo: "Business services",
  },
  {
    name: "Tailored questionnaires (versioned)",
    detail: "Reusable v1.2 template across five domains; weighted questions; per-assessment versioning with trigger reasons.",
    status: "done",
    demo: "Assessments → open any assessment",
  },
  {
    name: "Evidence register & review",
    detail: "Evidence items with owner, validity date, version and reviewer status; expiry is detected automatically and lowers confidence.",
    status: "done",
    demo: "Vendor page → Evidence register",
  },
  {
    name: "Explainable risk scoring",
    detail: "Inherent exposure from weighted intake factors; control effectiveness from answers; residual view; evidence confidence — all with visible contributions.",
    status: "done",
    demo: "Any assessment → Explainable scoring",
  },
  {
    name: "Resilience readiness (separate dimension)",
    detail: "Continuity plan status, recovery exercise outcome and recency — reported apart from the cyber risk rating.",
    status: "done",
    demo: "Vendor page → Resilience readiness",
  },
  {
    name: "Findings, actions & exceptions",
    detail: "Severity-rated findings, time-bound actions with owners, and expiring risk exceptions with approver sign-off.",
    status: "done",
    demo: "Findings & actions · Exceptions",
  },
  {
    name: "Approvals & reassessment",
    detail: "Reviewer rationale → human approver decision with conditions; scheduled and event-triggered reassessment opens a new version.",
    status: "done",
    demo: "Assessment → Approver panel",
  },
  {
    name: "Standards & regulatory coverage",
    detail: "Fourteen frameworks (ISO 27001, NIST CSF/C-SCRM, SOC 2, PCI-DSS, GDPR, DPDP, DORA, NIS2, CERT-In, RBI/SEBI, CSA CCM, SIG, ISO 42001) with per-vendor applicability and compliance matrix.",
    status: "done",
    demo: "Regulatory coverage",
  },
  {
    name: "Continuous monitoring",
    detail: "Vendor incidents, fourth-party / sub-processor register with DPA status, and reassessment triggers (manual, incident, evidence expiry, contract change, regulatory, scheduled).",
    status: "done",
    demo: "Incidents & triggers",
  },
  {
    name: "Access control & RBAC",
    detail: "User provisioning, five roles (incl. read-only auditor), vendor-scoped reps, account deactivation, and a permission matrix enforced on every server action.",
    status: "done",
    demo: "Access control",
  },
  {
    name: "Configurable scoring model",
    detail: "Admin-editable inherent weights, mitigation cap and tier thresholds persisted and reflected across scoring; changes audited.",
    status: "done",
    demo: "Scoring model",
  },
  {
    name: "Audit report generation",
    detail: "Stored, reproducible audit reports (portfolio, vendor, compliance, audit trail, evidence, findings, access, evaluation) with snapshots and print view.",
    status: "done",
    demo: "Reports → Generate reports",
  },
  {
    name: "Role-based access",
    detail: "Administrator, reviewer, approver, vendor representative. Vendor reps see only their own assigned assessments.",
    status: "done",
    demo: "Sign out → log in as a different persona",
  },
  {
    name: "Scenario-based user evaluation",
    detail: "Four scenario tasks + Likert feedback instrument; intended-user ratings stored and viewable for the review.",
    status: "done",
    demo: "Evaluation",
  },
  {
    name: "AI governance & privacy (DPDP) modules",
    detail: "Standards coverage (ISO 42001, DPDP-2023) implemented in the matrix; dedicated AI-use due-diligence and DPDP privacy-assessment workflows remain a planned extension.",
    status: "planned",
    demo: "Regulatory coverage (partial)",
  },
  {
    name: "Integrations, multi-tenancy & wider validation",
    detail: "Procurement/identity/ticketing integrations, threat feeds and cross-sector scorecard calibration.",
    status: "planned",
    demo: "Future work",
  },
];

const statusMeta: Record<Status, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  done: { label: "Working in prototype", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300", icon: CheckCircle2 },
  progress: { label: "In progress", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300", icon: CircleDashed },
  planned: { label: "Planned extension", cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400", icon: Lock },
};

export default async function RoadmapPage() {
  await requireUser();
  const done = MODULES.filter((m) => m.status === "done").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">Mid-semester review</div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">Implementation status</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
          Requirements and design are established; the prototype core is operational and being evaluated.
          {done} of {MODULES.length} tracked modules are working in this build. User evaluation,
          reporting and access control are now operational; remaining extensions are integrations,
          multi-tenancy and dedicated AI/DPDP workflows.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {(["done", "progress", "planned"] as Status[]).map((s) => {
          const meta = statusMeta[s];
          const n = MODULES.filter((m) => m.status === s).length;
          return (
            <div key={s} className="card p-4">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                <meta.icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {meta.label}
              </div>
              <div className="mt-2 font-mono text-2xl font-semibold text-zinc-100">{n}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {MODULES.map((m, i) => {
          const meta = statusMeta[m.status];
          return (
            <Card key={m.name} className={cn("card-hover flex items-start gap-4", m.status === "planned" && "opacity-75")}>
              <span className="mt-0.5 font-mono text-[11px] text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13.5px] font-semibold text-zinc-100">{m.name}</h3>
                  <Pill label={meta.label} cls={meta.cls} />
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{m.detail}</p>
                <p className="mt-1.5 text-[11px] text-teal-300/80">{m.status === "done" ? `Try it: ${m.demo}` : m.demo}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border-teal-400/15">
        <SectionTitle title="Evaluation framing (RQ / hypotheses)" hint="As defined in the project synopsis" />
        <div className="grid gap-4 text-[12.5px] leading-relaxed text-zinc-400 md:grid-cols-2">
          <div>
            <p className="mb-1.5 font-semibold text-zinc-200">Research questions</p>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>RQ1 — What vendor, service, evidence and resilience information should a small portal capture?</li>
              <li>RQ2 — How can explainable scoring connect exposure, verified controls, evidence confidence and resilience without automating approval?</li>
              <li>RQ3 — How do intended users rate task completion, traceability, clarity and usefulness vs a spreadsheet baseline?</li>
            </ul>
          </div>
          <div>
            <p className="mb-1.5 font-semibold text-zinc-200">Provisional hypotheses</p>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>H0 — No positive difference in paired assessment-traceability vs the spreadsheet baseline.</li>
              <li>H1 — VRAP achieves higher paired assessment-traceability scores.</li>
              <li>H2 — Dependency visibility, evidence freshness and resilience gaps are rated useful for prioritisation.</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 border-t border-white/6 pt-3 text-[11.5px] leading-relaxed text-zinc-500">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" strokeWidth={1.8} />
          Evaluation proceeds only after faculty-guide and any required institutional approvals, using fictional vendor data.
        </p>
      </Card>
    </div>
  );
}
