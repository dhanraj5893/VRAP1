import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, ensureDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

const COOKIE = "vrap_session";
const SECRET = process.env.VRAP_SESSION_SECRET || "vrap-dev-secret-change-me";

export type Role = "admin" | "reviewer" | "approver" | "vendor" | "auditor";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  vendorId: number | null;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

function signatureMatches(payload: string, provided: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function setSession(userId: number, email?: string) {
  const payload = JSON.stringify({ uid: userId, ...(email ? { email } : {}), t: Date.now() });
  const token = Buffer.from(payload).toString("base64url") + "." + sign(payload);
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  await ensureDb();
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [b64, sig] = raw.split(".");
  if (!b64 || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString();
  } catch {
    return null;
  }
  if (!signatureMatches(payload, sig)) return null;
  try {
    const parsed = JSON.parse(payload) as { uid: number; email?: string };
    // Prefer email lookup: on ephemeral deployments the database is re-seeded on
    // cold start, which re-creates users with identical emails but new ids.
    // Email-keyed sessions survive re-seeds; uid remains as a fallback.
    const user = parsed.email
      ? await db.query.users.findFirst({ where: eq(users.email, parsed.email) })
      : await db.query.users.findFirst({ where: eq(users.id, parsed.uid) });
    if (!user) return null;
    // Access control: deactivated accounts lose their session immediately.
    if (user.isActive === false) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role as Role) ?? "reviewer",
      vendorId: user.vendorId,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Fine-grained permission helper used by server actions and page guards.
 * Auditor is strictly read-only; vendor reps are scoped to their own vendor
 * record (enforced additionally in each action via vendorId checks).
 */
export function can(user: SessionUser, action: string): boolean {
  switch (action) {
    case "intake": // create/edit vendors, map services
      return user.role === "admin" || user.role === "reviewer";
    case "answer": // vendor rep fills questionnaires & evidence
      return user.role === "admin" || user.role === "vendor";
    case "review": // verify evidence, write rationale, submit for decision
      return user.role === "admin" || user.role === "reviewer";
    case "decide": // approve / conditionally approve / hold
      return user.role === "admin" || user.role === "approver";
    case "exceptionApprove":
      return user.role === "admin" || user.role === "approver";
    case "manageUsers": // access control administration
      return user.role === "admin";
    case "configureScoring":
      return user.role === "admin";
    case "manageQuestionnaires":
      return user.role === "admin" || user.role === "reviewer";
    case "manageCompliance":
      return user.role === "admin" || user.role === "reviewer";
    case "manageMonitoring": // incidents, sub-processors, triggers
      return user.role === "admin" || user.role === "reviewer";
    case "generateReports":
      return user.role === "admin" || user.role === "reviewer" || user.role === "approver" || user.role === "auditor";
    case "viewAudit":
      return user.role === "admin" || user.role === "reviewer" || user.role === "approver" || user.role === "auditor";
    case "viewReports":
      return user.role !== "vendor";
    case "submitEvaluation":
      return true; // any signed-in user (incl. vendor reps) may give feedback
    default:
      return true;
  }
}

/** RBAC matrix for the Access Controls page (single source of truth). */
export const PERMISSION_MATRIX: { action: string; label: string; roles: Role[] }[] = [
  { action: "intake", label: "Vendor intake & service mapping", roles: ["admin", "reviewer"] },
  { action: "answer", label: "Answer questionnaires & register evidence", roles: ["admin", "vendor"] },
  { action: "review", label: "Verify evidence, findings & rationale", roles: ["admin", "reviewer"] },
  { action: "decide", label: "Approve / hold assessments", roles: ["admin", "approver"] },
  { action: "exceptionApprove", label: "Approve risk exceptions", roles: ["admin", "approver"] },
  { action: "manageUsers", label: "Manage users & access", roles: ["admin"] },
  { action: "configureScoring", label: "Configure scoring weights", roles: ["admin"] },
  { action: "manageQuestionnaires", label: "Build questionnaires", roles: ["admin", "reviewer"] },
  { action: "manageCompliance", label: "Record regulatory compliance", roles: ["admin", "reviewer"] },
  { action: "manageMonitoring", label: "Incidents, sub-processors & triggers", roles: ["admin", "reviewer"] },
  { action: "generateReports", label: "Generate audit reports", roles: ["admin", "reviewer", "approver", "auditor"] },
  { action: "viewAudit", label: "View audit trail", roles: ["admin", "reviewer", "approver", "auditor"] },
  { action: "viewReports", label: "View portfolio reports", roles: ["admin", "reviewer", "approver", "auditor"] },
];
