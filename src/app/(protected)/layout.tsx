import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("mc_session")?.value;
  const expected = process.env.DASHBOARD_SESSION_SECRET;
  if (!expected || session !== expected) {
    redirect("/login");
  }
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await checkAuth();

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  );
}
