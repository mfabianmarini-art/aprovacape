import { requireSession } from "@/lib/require-role";
import { getNavCounts, navWithCounts } from "@/lib/nav-counts";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const counts = await getNavCounts(session.user.role, session.user.id);
  const nav = navWithCounts(session.user.role, counts);

  return (
    <div className="app-shell">
      <Sidebar nav={nav} />
      <main className="app-main">{children}</main>
    </div>
  );
}
