import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  const userDisplay = {
    email: user.email,
    full_name: profile?.full_name ?? user.user_metadata?.full_name ?? "",
    role: profile?.role ?? "viewer",
    avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={userDisplay} />

      <div className="flex flex-col flex-1 min-w-0 ml-64">
        <Topbar />

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}