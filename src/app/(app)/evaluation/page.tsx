import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listEvaluation } from "@/lib/data";
import { submitEvaluationAction, addEvaluationTaskAction } from "@/app/actions";
import { Card, SectionTitle, Pill } from "@/components/ui";
import { Star, BarChart3, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

const RATING_FIELDS: { key: string; label: string }[] = [
  { key: "taskCompletion", label: "Completion" },
  { key: "ease", label: "Ease of use" },
  { key: "clarity", label: "Clarity" },
  { key: "traceability", label: "Traceability" },
  { key: "usefulness", label: "Usefulness" },
];

export default async function EvaluationPage() {
  const user = await requireUser();
  const { tasks, feedback } = await listEvaluation();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
          Prototype evaluation
        </div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          Scenario-based evaluation
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Work through the scenario tasks, then rate the prototype. Feedback feeds the intended-user
          evaluation and is visible to auditors.{" "}
          <span className="text-teal-400/80">All signed-in users</span>.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Stat card label="Tasks" value={tasks.length} tone="default" icon={<BarChart3 className="h-4 w-4" />} />
        <Stat card label="Feedback received" value={feedback.length} tone="default" icon={<MessageSquare className="h-4 w-4" />} />
        <Stat card label="Avg. usefulness" value={avg(feedback, "usefulness")} tone="default" suffix="/ 5" icon={<Star className="h-4 w-4" />} />
      </div>

      {/* Task cards */}
      <Card>
        <div className="border-b border-white/8 px-5 py-4 flex items-center justify-between">
          <SectionTitle title="Scenario tasks" hint="Evaluate the portal against real TPRM scenarios" />
          {user.role === "admin" || user.role === "reviewer" ? (
            <form action={addEvaluationTaskAction} className="space-y-2 w-full md:w-72">
              <input name="title" placeholder="Task title" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" required />
              <input name="position" type="number" defaultValue={String(tasks.length + 1)} className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" />
              <button className="w-full rounded-lg bg-teal-400/10 px-2 py-2 text-[11px] font-medium text-teal-300 hover:bg-teal-400/20">Add task</button>
            </form>
          ) : null}
        </div>
        <div className="divide-y divide-white/6">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-[12px] text-zinc-500">No scenario tasks defined.</div>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-medium text-zinc-100">{t.title}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">{t.scenario}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Scenario {t.position}</span>
                </div>
                <div className="text-[11.5px] text-zinc-400 mb-3">{t.instructions}</div>
                <div className="text-[11px] font-medium text-teal-300">Expected outcome: {t.expectedOutcome}</div>
                <form action={submitEvaluationAction} className="mt-4 space-y-2">
                  <input type="hidden" name="taskId" value={String(t.id)} />
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-2">Rate this task (1-5)</div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {RATING_FIELDS.map(({ key, label }) => (
                      <div key={key} className="flex flex-col gap-1">
                        <div className="text-[10px] text-zinc-400">{label}</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <label key={n} className="rounded border border-white/8 bg-white/4 px-1.5 py-1 text-[10px] font-medium text-zinc-400 cursor-pointer hover:border-teal-400 hover:text-teal-300">
                              <input type="radio" name={key} value={String(n)} className="peer sr-only" />
                              <span className="peer-checked:border-teal-400 peer-checked:bg-teal-400/20 peer-checked:text-teal-300 inline-block rounded border px-1.5 py-1 text-center w-6">
                                {n}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input name="respondentName" defaultValue={user.name} className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none flex-1" />
                    <input name="respondentRole" defaultValue={user.role} className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none flex-1" />
                    <button className="rounded-lg bg-teal-400/10 px-3 py-2 text-[11px] font-medium text-teal-300 hover:bg-teal-400/20">Submit feedback</button>
                  </div>
                </form>
                <textarea name="comments" placeholder="Comments (optional)" className="mt-2 w-full rounded border border-white/10 bg-white/4 px-3 py-3 text-[11.5px] focus:border-teal-400 outline-none"></textarea>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Recent feedback */}
      <Card>
        <div className="border-b border-white/8 px-5 py-4">
          <SectionTitle title="Recent feedback" hint="Intended-user responses" />
        </div>
        <div className="divide-y divide-white/6">
          {feedback.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-zinc-500">No feedback yet.</div>
          ) : (
            feedback.map((f) => (
              <div key={f.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-zinc-100 text-[12px]">{f.respondentName}</span>
                  <span className="text-[10px] text-zinc-500">{f.respondentRole}</span>
                  {f.taskId && <Pill label={`Task ${f.taskId}`} cls="border-white/8 bg-white/5 text-zinc-400 text-[10px] px-2 py-0.5" />}
                </div>
                <div className="flex gap-3 text-[11px] text-zinc-400 mb-2">
                  {RATING_FIELDS.map(({ key }) => {
                    const v = (f as Record<string, unknown>)[key];
                    return (
                      <span key={key} className="flex items-center gap-1">
                        {v == null ? "—" : String(v)}<Star className="h-3 w-3 fill-zinc-700" /> {key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
                    );
                  })}
                </div>
                {f.comments && <div className="text-[11.5px] italic text-zinc-400">“{f.comments}”</div>}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ card, label, value, tone = "default", suffix = "", icon }: { card?: boolean; label: string; value: number | string; tone?: "default" | "warn" | "danger" | "good"; suffix?: string; icon?: React.ReactNode }) {
  const toneCls = tone === "danger" ? "text-rose-300 border-rose-400/20" : tone === "warn" ? "text-amber-300 border-amber-400/20" : tone === "good" ? "text-emerald-300 border-emerald-400/20" : "text-zinc-100 border-white/8";
  return (
    <div className="rounded-lg border px-4 py-4 flex items-start justify-between gap-2">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
        <div className="mt-1 flex items-end gap-1">
          <span className={cn("font-mono text-[24px] font-semibold leading-none", toneCls)}>{value}</span>
          <span className="text-[11px] text-zinc-500">{suffix}</span>
        </div>
      </div>
      {icon && <div className="opacity-70">{icon}</div>}
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function avg(items: any[], k: string) {
  const vals = items.filter((i) => i[k] != null).map((i) => i[k]);
  if (vals.length === 0) return "—";
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}
