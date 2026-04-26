"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  CheckSquare,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";


interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Empresas", href: "/companies", icon: Building2 },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Tareas", href: "/tasks", icon: CheckSquare },
  { label: "Proyectos", href: "/projects", icon: FolderKanban },
  { label: "Configuración", href: "/settings", icon: Settings },
];

interface SidebarProps {
  user: {
    email?: string;
    full_name?: string;
    role?: string;
    avatar_url?: string;
  } | null;
}

function SidebarDesktop({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-background">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
          <span className="text-sm font-bold">M</span>
        </div>
        <span className="font-semibold text-foreground">MAITE CRM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="px-3 py-4 border-t flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
            {user.full_name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{user.full_name || "Usuario"}</span>
            <span className="text-xs text-muted-foreground capitalize">{user.role || "viewer"}</span>
          </div>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}

function SidebarMobile({
  user,
  open,
  onClose,
}: SidebarProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">M</span>
          </div>
          <span className="font-semibold text-foreground">MAITE CRM</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="px-3 py-4 border-t">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar size="sm">
                {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                <AvatarFallback>
                  {user.full_name
                    ? user.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : user.email?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">
                  {user.full_name || "Usuario"}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user.role || "viewer"}
                </span>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <SidebarDesktop user={user} />
      <SidebarMobile user={user} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
    </>
  );
}

export { SidebarDesktop, SidebarMobile };