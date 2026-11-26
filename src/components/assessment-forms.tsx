"use client";

import { useRef } from "react";
import { saveAnswerAction } from "@/app/actions";
import { EvidencePill } from "@/components/ui";
import { cn } from "@/lib/utils";

const RESPONSES = [
  { value: "yes", label: "Yes", cls: "peer-checked:border-emerald-400/60 peer-checked:bg-emerald-400/15 peer-checked:text-emerald-200" },
  { value: "partial", label: "Partial", cls: "peer-checked:border-amber-400/60 peer-checked:bg-amber-400/15 peer-checked:text-amber-200" },
  { value: "no", label: "No", cls: "peer-checked:border-rose-400/60 peer-checked:bg-rose-400/15 peer-checked:text-rose-200" },
  { value: "na", label: "N/A", cls: "peer-checked:border-zinc-400/50 peer-checked:bg-zinc-400/15 peer-checked:text-zinc-200" },
];

export function AnswerRow({
  assessmentId,
  questionId,
  response,
  comment,
  evidenceId,
  evidenceOptions,
  editable,
  effectiveStatus,
}: {
  assessmentId: number;
  questionId: number;
  response: string | null;
  comment: string;
  evidenceId: number | null;
  evidenceOptions: { id: number; title: string; status: string }[];
  editable: boolean;
  effectiveStatus: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const auto = () => formRef.current?.requestSubmit();

  if (!editable) {
    return (
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {response ? (
          <>
            <span
              className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize", {
                "border-emerald-400/40 bg-emerald-400/10 text-emerald-200": response === "yes",
                "border-amber-400/40 bg-amber-400/10 text-amber-200": response === "partial",
                "border-rose-400/40 bg-rose-400/10 text-rose-200": response === "no",
                "border-zinc-400/40 bg-zinc-400/10 text-zinc-300": response === "na",
              })}
            >
              {response === "na" ? "N/A" : response}
            </span>
            {comment && <span className="text-[11.5px] italic text-zinc-500">“{comment}”</span>}
            {effectiveStatus && <EvidencePill status={effectiveStatus} />}
          </>
        ) : (
          <span className="text-[11.5px] text-zinc-600">Not answered yet</span>
        )}
      </div>
    );
  }

  return (
    <form ref={formRef} action={saveAnswerAction} className="mt-2.5 space-y-2">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="questionId" value={questionId} />
      <div className="flex flex-wrap items-center gap-1.5">
        {RESPONSES.map((r) => (
          <label key={r.value} className="cursor-pointer">
            <input
              type="radio"
              name="response"
              value={r.value}
              defaultChecked={response === r.value}
              className="peer sr-only"
              onChange={auto}
            />
            <span className={cn("inline-block rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400 transition-all hover:border-white/25", r.cls)}>
              {r.label}
            </span>
          </label>
        ))}
        {effectiveStatus && (
          <span className="ml-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
            evidence: <EvidencePill status={effectiveStatus} />
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <select
          name="evidenceId"
          defaultValue={evidenceId ?? ""}
          className="select !w-56 !py-1 !text-[11px]"
          onChange={auto}
        >
          <option value="">Link evidence…</option>
          {evidenceOptions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({e.status})
            </option>
          ))}
        </select>
        <input
          name="comment"
          defaultValue={comment}
          placeholder="Add a comment…"
          className="input flex-1 !py-1 !text-[11px]"
          onBlur={auto}
        />
      </div>
    </form>
  );
}
