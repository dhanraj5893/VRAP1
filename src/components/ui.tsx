import { cn } from "@/lib/utils";
import { TIER_META, type Tier } from "@/lib/scoring";
import { EVIDENCE_META, ASSESSMENT_STATUS_META, VENDOR_STATUS_META, SEVERITY_META } from "@/lib/utils";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div className={cn("card p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-zinc-100">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        cls,
      )}
    >
      {label}
    </span>
  );
}

export function TierBadge({ tier, score }: { tier: Tier; score?: number | null }) {
  const meta = TIER_META[tier];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", meta.cls)}>
      {score != null && <span className="font-mono">{score}</span>}
      {meta.label}
    </span>
  );
}

export function TierDot({ tier }: { tier: Tier }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", TIER_META[tier].bar)} />;
}

export function EvidencePill({ status }: { status: string }) {
  const meta = EVIDENCE_META[status] ?? EVIDENCE_META.missing;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", meta.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function AssessmentStatusPill({ status }: { status: string }) {
  const meta = ASSESSMENT_STATUS_META[status] ?? { label: status, cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300" };
  return <Pill label={meta.label} cls={meta.cls} />;
}

export function VendorStatusPill({ status }: { status: string }) {
  const meta = VENDOR_STATUS_META[status] ?? { label: status, cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300" };
  return <Pill label={meta.label} cls={meta.cls} />;
}

export function SeverityPill({ severity }: { severity: string }) {
  return <Pill label={severity} cls={SEVERITY_META[severity] ?? SEVERITY_META.medium} />;
}

export function ScoreDial({
  label,
  score,
  tier,
  hint,
}: {
  label: string;
  score: number | null;
  tier?: Tier;
  hint?: string;
}) {
  const t = score == null ? null : TIER_META[tier ?? (score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "moderate" : "low")];
  return (
    <div className="card relative overflow-hidden p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className={cn("font-mono text-3xl font-semibold leading-none", score == null ? "text-zinc-600" : t?.cls.split(" ")[0])}>
          {score == null ? "—" : score}
        </span>
        {score != null && t && (
          <span className={cn("mb-0.5 rounded-full border px-2 py-px text-[10px] font-semibold", t.cls)}>{t.label}</span>
        )}
      </div>
      {hint && <div className="mt-1.5 text-[11px] leading-snug text-zinc-500">{hint}</div>}
      <div className="mt-3 h-1 rounded-full bg-white/5">
        <div
          className={cn("h-1 rounded-full transition-all duration-700", t?.bar ?? "bg-zinc-600")}
          style={{ width: `${score ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressBar({ value, barClass }: { value: number; barClass?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5">
      <div className={cn("h-1.5 rounded-full", barClass ?? "bg-teal-400")} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const toneCls =
    tone === "danger" ? "text-rose-300" : tone === "warn" ? "text-amber-300" : tone === "good" ? "text-emerald-300" : "text-zinc-100";
  return (
    <div className="card card-hover p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn("mt-2 font-mono text-[26px] font-semibold leading-none", toneCls)}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}
