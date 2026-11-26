"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";

/** Select that auto-submits its parent form on change (used for status inline edits). */
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  className,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const ref = useRef<HTMLSelectElement>(null);
  return (
    <select
      ref={ref}
      name={name}
      defaultValue={defaultValue}
      className={className ?? "select !w-auto !py-1 !text-[11px]"}
      onChange={() => ref.current?.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn btn-ghost flex items-center gap-1.5"
      title="Print or save as PDF"
    >
      <Printer className="h-3.5 w-3.5" strokeWidth={1.8} />
      Print / Export PDF
    </button>
  );
}
