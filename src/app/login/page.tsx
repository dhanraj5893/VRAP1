import { loginAction } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, KeyRound, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Incorrect email or password. Please try again.",
  missing: "Enter both your email and password.",
  disabled: "This account has been deactivated. Contact an administrator.",
  nopassword: "This account has no password set yet. Ask an administrator to reset it.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const existing = await getSessionUser();
  if (existing) redirect("/");

  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] ?? "Sign-in failed. Please try again.") : null;

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

      {/* Right: credential form */}
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
            Enter your portal email and password. Role-based access is enforced after sign-in.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-400/8 px-4 py-3 text-[12.5px] leading-snug text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form action={loginAction} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Email / user ID
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" strokeWidth={1.8} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. dhanraj.rana@demo.vrap"
                  className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pl-10 pr-3.5 text-[13px] text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-teal-400/60 focus:bg-teal-400/4"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Password
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" strokeWidth={1.8} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pl-10 pr-3.5 text-[13px] text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-teal-400/60 focus:bg-teal-400/4"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-2 w-full justify-center !py-2.5 text-[13px]">
              Sign in to workspace
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-white/8 bg-white/2 px-4 py-3">
            <p className="text-[11px] leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-400">Demo accounts.</span> Five role-based demo
              personas are seeded (administrator, reviewer, approver, vendor representative, auditor).
              Their IDs and passwords are documented in{" "}
              <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-[10px] text-teal-300">README.md</code>{" "}
              under “Demo accounts”.
            </p>
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-zinc-600">
            Roles demonstrated: administrator (full access), reviewer (evidence &amp; rationale),
            approver (final decisions), vendor representative (own vendor record only) and auditor
            (read-only portfolio access).
          </p>
        </div>
      </div>
    </div>
  );
}
