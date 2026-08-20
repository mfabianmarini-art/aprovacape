import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homeForRole } from "@/lib/nav";

export default async function RootPage() {
  const session = await auth();
  redirect(session ? homeForRole(session.user.role) : "/login");
}
