import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysFromNow(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

/** Evidence freshness: a verified/submitted item past its valid-until date is stale. */
export function effectiveEvidenceStatus(
  status: string,
  validUntil: Date | string | null | undefined,
): string {
  if (status === "missing") return "missing";
  if (validUntil) {
    const v = typeof validUntil === "string" ? new Date(validUntil) : validUntil;
    if (v.getTime() < Date.now()) return "stale";
  }
  return status;
}

export const EVIDENCE_META: Record<string, { label: string; cls: string; dot: string }> = {
  verified: {
    label: "Verified",
    cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  submitted: {
    label: "Submitted",
    cls: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    dot: "bg-sky-400",
  },
  stale: {
    label: "Expired / stale",
    cls: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  clarification_requested: {
    label: "Clarification",
    cls: "border-violet-400/30 bg-violet-400/10 text-violet-300",
    dot: "bg-violet-400",
  },
  rejected: {
    label: "Rejected",
    cls: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400",
  },
  missing: {
    label: "Missing",
    cls: "border-zinc-400/30 bg-zinc-400/10 text-zinc-300",
    dot: "bg-zinc-400",
  },
};

export const ASSESSMENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300" },
  issued: { label: "Issued", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  in_review: { label: "In review", cls: "border-violet-400/30 bg-violet-400/10 text-violet-300" },
  decision_pending: {
    label: "Decision pending",
    cls: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  approved: {
    label: "Approved",
    cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  conditionally_approved: {
    label: "Conditionally approved",
    cls: "border-teal-400/30 bg-teal-400/10 text-teal-300",
  },
  on_hold: { label: "On hold", cls: "border-orange-400/30 bg-orange-400/10 text-orange-300" },
  expired: { label: "Expired", cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400" },
};

export const VENDOR_STATUS_META: Record<string, { label: string; cls: string }> = {
  intake: { label: "Intake", cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300" },
  assessment: { label: "Assessment", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  review: { label: "Review", cls: "border-violet-400/30 bg-violet-400/10 text-violet-300" },
  monitoring: {
    label: "Monitoring",
    cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  reassessment_due: {
    label: "Reassessment due",
    cls: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  offboarded: {
    label: "Offboarded",
    cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
  },
};

export const SEVERITY_META: Record<string, string> = {
  critical: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  high: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  low: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  reviewer: "Reviewer",
  approver: "Approver",
  vendor: "Vendor representative",
  auditor: "Auditor (read-only)",
};

/** Minimal CSV builder for report exports (quotes + escapes every cell). */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}
