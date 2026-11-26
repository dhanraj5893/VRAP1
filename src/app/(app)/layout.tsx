import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <Sidebar user={user} logoutAction={logoutAction} />
      <main className="ml-60 min-h-screen px-8 py-8">{children}</main>
    </div>
  );
}
