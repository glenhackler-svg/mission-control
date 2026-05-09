import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/client-auth";
import { ClientSidebar } from "@/components/client-sidebar";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const client = await getClientSession();
  if (!client) {
    redirect("/login");
  }

  return (
    <div className="flex">
      <ClientSidebar clientName={client.name} />
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  );
}
