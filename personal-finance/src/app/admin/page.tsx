import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { isAdmin } from "@/lib/allowlist";
import AllowlistManager from "./AllowlistManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !isAdmin(user.email)) redirect("/");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Admin</h2>
        <p className="text-muted text-sm mt-1">Manage who can access the finance tracker</p>
      </div>
      <AllowlistManager />
    </div>
  );
}
