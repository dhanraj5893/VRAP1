import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser, setSession, clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/utils";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const existing = await getSessionUser();
  if (existing) redirect("/");

  const allUsers = await db.select().from(users);

  async function login(formData: FormData) {
    "use server";
    const uid = parseInt(String(formData.get("userId") ?? ""), 10);
    if (Number.isFinite(uid)) {
      await clearSession();
      await setSession(uid);
    }
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-white/8 bg-[#0c1218] p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(600px 400px at 20% 10%, rgba(45,212,191,0.12), transparent 60%), radial-gradient(500px 380px at 90% 90%, rgba(56,189,248,0.08), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300">
            <ShieldCheck className="h-5.5 w-5.5" strokeWidth={2} />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight">VRAP</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Vendor Risk Assessment Portal</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-zinc-50">
            Traceable, risk-based
            <br />
            third-party assessment,
            <br />
            <span className="text-teal-300">with human decisions.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-400">
            Vendor intake, tailored questionnaires, evidence freshness, explainable scoring,
            resilience readiness and reassessment — connected to the business services each
            supplier supports.
          </p>
          <ul className="mt-8 space-y-2.5">
            {[
              "Explainable inherent → residual risk scoring",
              "Evidence freshness tracked, never auto-failed",
              "Resilience readiness kept separate from cyber risk",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[13px] text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-teal-400" strokeWidth={1.8} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[11px] text-zinc-600">
          Academic prototype — demonstration data only. All approval decisions remain with human reviewers.
        </div>
      </div>

      {/* Right: login */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="font-display text-lg font-bold">VRAP</div>
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-100">Sign in</h2>
          <p className="mt-1.5 text-[13px] text-zinc-500">
            Demo login — pick a seeded persona to explore the role-based workflow.
          </p>

          <Suspense>
            <LoginError />
          </Suspense>

          <form action={login} className="mt-6 space-y-2.5">
            {allUsers.map((u) => (
              <label
                key={u.id}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/2 px-4 py-3 transition-all hover:border-teal-400/30 hover:bg-teal-400/4 has-checked:border-teal-400/50 has-checked:bg-teal-400/8"
              >
                <input type="radio" name="userId" value={u.id} defaultChecked={u.role === "admin"} className="accent-teal-400" />
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-[11px] font-bold text-zinc-200">
                  {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-zinc-100">{u.name}</div>
                  <div className="text-[11px] text-zinc-500">{ROLE_LABELS[u.role] ?? u.role}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-has-checked:text-teal-300" strokeWidth={1.8} />
              </label>
            ))}

            <button type="submit" className="btn btn-primary mt-4 w-full justify-center !py-2.5 text-[13px]">
              Continue to workspace
            </button>
          </form>

          <p className="mt-6 text-[11px] leading-relaxed text-zinc-600">
            Roles demonstrated: administrator (full access), reviewer (evidence &amp; rationale),
            approver (final decisions), and vendor representative (only their own assigned assessment).
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginError() {
  return null;
}
