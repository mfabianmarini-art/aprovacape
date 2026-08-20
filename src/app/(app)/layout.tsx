import { requireSession } from "@/lib/require-role";
import { getNavCounts, navWithCounts } from "@/lib/nav-counts";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const counts = await getNavCounts(session.user.role, session.user.id);
  const nav = navWithCounts(session.user.role, counts);

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "stretch" }}>
      <Sidebar nav={nav} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{children}</main>
    </div>
  );
}
