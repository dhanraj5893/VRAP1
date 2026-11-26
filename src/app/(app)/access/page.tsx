import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listUsers, listVendorNames } from "@/lib/data";
import { createUserAction, updateUserAction, toggleUserActiveAction } from "@/app/actions";
import { Card, SectionTitle, Pill } from "@/components/ui";
import { PERMISSION_MATRIX } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");

  const usersWithVendors = await listUsers();
  const vendorNames = await listVendorNames();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-400/90">
          Access control
        </div>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          Users & RBAC
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Provision users, assign roles, and scope vendor representatives to a single vendor.
          Deactivated accounts cannot sign in. The full matrix below shows what each role can do.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-4">
        <Stat card label="Users" value={usersWithVendors.length} tone="default" />
        <Stat card label="Administrators" value={usersWithVendors.filter((u) => u.user.role === "admin").length} tone="default" />
        <Stat card label="Deactivated" value={usersWithVendors.filter((u) => !(u.user.isActive ?? true)).length} tone="warn" />
        <Stat card label="Vendor reps" value={usersWithVendors.filter((u) => u.user.role === "vendor").length} tone="default" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* User directory */}
        <Card className="lg:col-span-2">
          <div className="border-b border-white/8 px-5 py-4 flex items-center justify-between">
            <SectionTitle title="Directory" hint="All portal users" />
            <form action={createUserAction} className="space-y-2 w-full md:w-80">
              <input name="name" placeholder="Full name" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" required />
              <input name="email" placeholder="email@demo.vrap" type="email" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none" required />
              <div className="grid gap-2 sm:grid-cols-2">
                <select name="role" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none">
                  <option value="reviewer">Reviewer</option>
                  <option value="approver">Approver</option>
                  <option value="vendor">Vendor representative</option>
                  <option value="auditor">Auditor</option>
                  <option value="admin">Administrator</option>
                </select>
                <select name="vendorId" className="rounded border border-white/10 bg-white/4 px-2 py-2 text-[11.5px] focus:border-teal-400 outline-none">
                  <option value="">No vendor</option>
                  {vendorNames.map((v) => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
                </select>
              </div>
              <button className="w-full rounded-lg bg-teal-400/10 px-3 py-2 text-[11px] font-medium text-teal-300 hover:bg-teal-400/20">Provision</button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Vendor scope</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Last login</th>
                  <th className="px-5 py-3 font-medium">Controls</th>
                </tr>
              </thead>
              <tbody>
                {usersWithVendors.map(({ user: u, vendorName }) => {
                  const active = u.isActive !== false;
                  return (
                    <tr key={u.id} className="border-b border-white/5 last:border-0 group">
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-100">{u.name}</div>
                        <div className="text-[11px] text-zinc-500">{u.email}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Pill label={u.role} cls="border-white/8 bg-white/6 text-zinc-400 text-[10px] px-2 py-0.5" />
                      </td>
                      <td className="px-3 py-3 text-zinc-400">{vendorName ?? "—"}</td>
                      <td className="px-3 py-3">
                        <form action={toggleUserActiveAction}>
                          <input name="id" value={String(u.id)} />
                          <button
                            name="active"
                            value={String(!active)}
                            formAction={toggleUserActiveAction}
                            className={cnBtn(
                              "rounded border px-2 py-1 text-[10px] font-medium",
                              active ? "border-rose-400/30 text-rose-300" : "border-emerald-400/30 text-emerald-300",
                              u.id === user.id ? "opacity-50 cursor-not-allowed" : "",
                            )}
                            disabled={u.id === user.id}
                          >
                            {active ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-zinc-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().slice(0, 10) : "Never"}
                      </td>
                      <td className="px-5 py-3">
                        <form action={updateUserAction} className="flex gap-1.5">
                          <input name="id" value={String(u.id)} />
                          <select name="role" defaultValue={u.role} className="rounded border border-white/10 bg-white/4 px-2 py-1.5 text-[10px] focus:border-teal-400 outline-none">
                            {["admin", "reviewer", "approver", "vendor", "auditor"].map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <select name="vendorId" className="rounded border border-white/10 bg-white/4 px-2 py-1.5 text-[10px] focus:border-teal-400 outline-none">
                            <option value="">None</option>
                            {vendorNames.map((v) => (
                              <option key={v.id} value={String(v.id)}>{v.name}</option>
                            ))}
                          </select>
                          <button className="rounded bg-white/5 px-2 py-1.5 text-[10px] font-medium text-zinc-300 hover:bg-white/10">Save</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* RBAC matrix */}
        <Card>
          <div className="border-b border-white/8 px-5 py-4">
            <SectionTitle title="Permission matrix" hint="What each role may do" />
          </div>
          <div className="p-4 space-y-3 text-[11.5px]">
            {PERMISSION_MATRIX.map((p) => (
              <div key={p.action} className="flex items-center gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <div className="w-40 text-right font-medium text-zinc-300">{p.label}</div>
                <div className="flex-1 flex gap-1">
                  {["admin", "reviewer", "approver", "vendor", "auditor"].map((r) => (
                    <span
                      key={r}
                      className={cnCell("rounded px-1.5 py-0.5 text-[9px] font-medium", p.roles.includes(r as any))}
                    >
                      {r[0].toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ card, label, value, tone = "default" }: { card?: boolean; label: string; value: number; tone?: "default" | "warn" | "danger" | "good" }) {
  const toneCls = tone === "danger" ? "text-rose-300 border-rose-400/20" : tone === "warn" ? "text-amber-300 border-amber-400/20" : tone === "good" ? "text-emerald-300 border-emerald-400/20" : "text-zinc-100 border-white/8";
  return (
    <div className="rounded-lg border px-4 py-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div className="mt-2 font-mono text-[24px] font-semibold leading-none {toneCls}">{value}</div>
    </div>
  );
}

function cnBtn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function cnCell(cls: string, allowed: boolean) {
  return `${cls} ${allowed ? "bg-teal-400/15 text-teal-300 border-teal-400/40" : "bg-white/4 text-zinc-500 border-white/6"}`;
}
