import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  BarChart3,
  AlertCircle,
  FileBarChart,
  Lock,
  Layers,
  Database,
  BookOpenCheck,
  CheckCircle2,
  Info,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, SectionTitle, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

const CAPABILITIES = [
  { icon: Building2, title: "Central vendor inventory", detail: "Owners, services, criticality, data sensitivity, system access, geographic exposure, contract/DPA/exit records — one register of record." },
  { icon: Layers, title: "Service & dependency mapping", detail: "Vendors mapped to business services with dependency level and concentration — single-point-of-failure warnings included." },
  { icon: ClipboardCheck, title: "Tailored questionnaires", detail: "Versioned templates scoped to the vendor's inherent risk tier; every question carries standards traceability (ISO, NIST, DPDP, DORA…)." },
  { icon: FileCheck2, title: "Evidence register & review", detail: "Type, owner, validity, version and reviewer status. Expired evidence lowers confidence automatically — it never auto-fails a control." },
  { icon: Gauge, title: "Explainable scoring", detail: "Inherent exposure (configurable weights) → control effectiveness → residual view. All parameters adjustable by administrators and audited." },
  { icon: BarChart3, title: "Regulatory coverage", detail: "14 frameworks pre-catalogued (ISO 27001, NIST CSF, GDPR, DPDP, DORA, NIS2, RBI/SEBI…). Applicability auto-maps per vendor; heatmap view." },
  { icon: AlertCircle, title: "Continuous monitoring", detail: "Incidents with auto reassessment triggers, fourth-party sub-processors with DPA tracking, and manual/scheduled/evidence-expiry triggers." },
  { icon: FileBarChart, title: "Audit reporting", detail: "Point-in-time, reproducible report snapshots (portfolio, vendor, compliance, audit trail, evidence, findings, access, evaluation) — printable." },
  { icon: Lock, title: "Role-based access control", detail: "Server-side permission checks on every action. Vendor reps are scoped to their own vendor; auditors are strictly read-only; deactivated accounts are refused." },
];

const ROLES = [
  { role: "Administrator", who: "Dhanraj Rana", detail: "Full access: provisioning & password resets, scoring model, all reports, all modules.", tone: "border-teal-400/30 bg-teal-400/8 text-teal-300" },
  { role: "Reviewer", who: "Raj Jadav", detail: "Evidence verification, findings, actions, compliance records, monitoring, review rationale.", tone: "border-sky-400/30 bg-sky-400/8 text-sky-300" },
  { role: "Approver", who: "Chaitanya Nagre", detail: "Assessment decisions (approve / conditional / hold) and exception approvals. No intake or admin powers.", tone: "border-violet-400/30 bg-violet-400/8 text-violet-300" },
  { role: "Vendor representative", who: "Jenil Dalal (Nimbus)", detail: "Scoped strictly to their own vendor record: questionnaire responses and evidence registration only.", tone: "border-amber-400/30 bg-amber-400/8 text-amber-300" },
  { role: "Auditor", who: "Elena Rossi", detail: "Read-only across portfolio, reports, compliance matrix, monitoring and the audit trail. Cannot create or change anything.", tone: "border-zinc-500/30 bg-zinc-500/8 text-zinc-400" },
];

const STACK = [
  "Next.js 16 (App Router, server actions)",
  "React 19 + TypeScript",
  "Tailwind CSS 4",
  "Drizzle ORM 0.45",
  "PGlite (WASM Postgres) locally & on Vercel; node-postgres via DATABASE_URL",
  "recharts",
  "scrypt password hashing (Node crypto)",
  "HMAC-signed session cookies (httpOnly)",
];

const STANDARDS = [
  "ISO/IEC 27001:2022", "NIST CSF 2.0", "NIST SP 800-161", "SOC 2 TSC", "PCI-DSS 4.0.1",
  "EU GDPR", "EU DORA", "EU NIS2", "India DPDP 2023", "CERT-In 2022",
  "RBI / SEBI / IRDAI", "CSA CCM", "Shared Assessments SIG", "ISO/IEC 42001",
];

export default async function AboutPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
          About this portal
        </div>
        <h1 className="font-display mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight text-zinc-50">
          <ShieldCheck className="h-7 w-7 text-teal-300" strokeWidth={1.8} />
          VRAP — Vendor Risk Assessment Portal
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-zinc-400">
          A traceable, risk-based third-party risk management (TPRM) prototype for vendor assessment and
          operational-resilience review. VRAP supports the complete vendor lifecycle — central inventory,
          tailored questionnaires, evidence tracking, explainable risk scoring, regulatory coverage,
          continuous monitoring, human approvals and audit reporting — under strict role-based access control.
        </p>
      </header>

      {/* What it is */}
      <Card>
        <div className="border-b border-white/8 px-5 py-4">
          <SectionTitle title="What VRAP does" hint="Core capabilities at a glance" />
        </div>
        <div className="grid gap-px overflow-hidden rounded-b-lg bg-white/5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="bg-[#10161d] p-4">
              <c.icon className="h-4.5 w-4.5 text-teal-300" strokeWidth={1.6} />
              <div className="mt-2 text-[13px] font-semibold text-zinc-100">{c.title}</div>
              <div className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">{c.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Roles */}
        <Card className="lg:col-span-3">
          <div className="border-b border-white/8 px-5 py-4">
            <SectionTitle
              title="Who can do what"
              hint="Five roles, least privilege, enforced server-side"
              right={<Link href="/access" className="text-[12px] font-medium text-teal-300 hover:text-teal-200">Admin view →</Link>}
            />
          </div>
          <div className="divide-y divide-white/5 p-3">
            {ROLES.map((r) => (
              <div key={r.role} className="flex items-start gap-3 px-2 py-3">
                <Pill label={r.role} cls={`${r.tone} mt-0.5 shrink-0 border text-[9.5px] px-2 py-1`} />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-zinc-100">{r.who}</div>
                  <div className="mt-0.5 text-[11.5px] leading-snug text-zinc-500">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 px-5 py-3 text-[11px] text-zinc-600">
            Deactivated accounts cannot sign in. Vendor representatives only ever see their own vendor
            record. Every state-changing action is written to the immutable audit trail.
          </div>
        </Card>

        {/* Tech + demo */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="border-b border-white/8 px-5 py-4">
              <SectionTitle title="Built with" hint="Modern, boring, auditable technology" />
            </div>
            <ul className="space-y-2 p-4">
              {STACK.map((s) => (
                <li key={s} className="flex items-start gap-2 text-[12px] leading-snug text-zinc-400">
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" strokeWidth={1.6} />
                  {s}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-teal-400/15">
            <div className="border-b border-white/8 px-5 py-4">
              <SectionTitle title="Trying the demo" hint="Sign in with role-based demo accounts" />
            </div>
            <div className="space-y-2.5 p-4 text-[12px] leading-relaxed text-zinc-400">
              <p>
                VRAP ships with a fictional dataset (8 vendors, 14 frameworks, 5 role personas). Demo
                credentials are documented in the project <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-[10.5px] text-teal-300">README.md</code> under
                “Demo accounts”.
              </p>
              <p>
                You are signed in as <span className="font-medium text-zinc-200">{user.name}</span> with the{" "}
                <span className="font-medium text-zinc-200">{user.role}</span> role — the navigation and
                available actions already reflect your permissions.
              </p>
              <Link href="/roadmap" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-teal-300 hover:text-teal-200">
                <BookOpenCheck className="h-4 w-4" strokeWidth={1.8} />
                See project status &amp; module roadmap
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Standards */}
      <Card>
        <div className="border-b border-white/8 px-5 py-4">
          <SectionTitle title="Standards & regulatory coverage" hint="14 frameworks pre-catalogued and auto-mapped per vendor" />
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {STANDARDS.map((s) => (
            <span key={s} className="rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11.5px] text-zinc-300">
              {s}
            </span>
          ))}
        </div>
      </Card>

      {/* Disclaimer */}
      <Card className="border-amber-400/15">
        <div className="flex items-start gap-3 p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" strokeWidth={1.8} />
          <div className="text-[12px] leading-relaxed text-zinc-400">
            <div className="font-semibold text-amber-200/90">Demonstration prototype — not a compliance determination</div>
            <p className="mt-1.5">
              VRAP is built for evaluation and training with fictional data. No score, report or automated
              output constitutes legal, regulatory or audit advice, a supplier approval, or a substitute for
              professional judgement. Every decision (approve, condition, hold) is made and recorded by a human,
              with rationale, in the audit trail.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-600">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              VRAP v1.0 · Vendor Risk Assessment Portal · fictional demo dataset · built with Next.js
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
