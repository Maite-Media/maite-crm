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
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  { label: "Config", href: "/settings", icon: Settings },
];

interface SidebarProps {
  user: {
    email?: string;
    full_name?: string;
    role?: string;
    avatar_url?: string;
  } | null;
}

function NavLink({ item, index, isActive, onClick }: { item: NavItem; index: number; isActive: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  const num = String(index + 1).padStart(2, "0");
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="group flex items-center gap-2.5 px-3 py-2 transition-all relative"
      style={isActive ? {
        background: "rgba(227,30,36,0.12)",
        borderLeft: "2px solid #E31E24",
        boxShadow: "inset 0 0 16px rgba(227,30,36,0.06)",
      } : {
        borderLeft: "2px solid transparent",
      }}
    >
      <span className={`text-[9px] font-mono shrink-0 transition-colors ${isActive ? "text-[#E31E24]" : "text-zinc-700 group-hover:text-zinc-500"}`}>
        {num}
      </span>
      <Icon className={`size-3.5 shrink-0 transition-colors ${isActive ? "text-[#E31E24]" : "text-zinc-600 group-hover:text-zinc-400"}`} />
      <span className={`text-[11px] font-mono uppercase tracking-widest transition-colors ${isActive ? "text-white font-bold" : "text-zinc-500 group-hover:text-zinc-300"}`}>
        {item.label}
      </span>
      {isActive && (
        <div className="ml-auto w-1 h-1 bg-[#E31E24] rounded-full" style={{ boxShadow: "0 0 6px #E31E24" }} />
      )}
    </Link>
  );
}

function SidebarDesktop({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:z-30 lg:flex lg:flex-col"
      style={{ background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="w-7 h-7 flex items-center justify-center text-white font-mono font-bold text-xs shrink-0"
          style={{ background: "#E31E24", boxShadow: "0 0 12px rgba(227,30,36,0.5)" }}
        >
          M
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono tracking-[0.35em] text-zinc-600 uppercase leading-none">Sistema</p>
          <p className="text-[11px] font-mono font-bold text-white tracking-[0.2em] uppercase leading-snug" style={{ textShadow: "0 0 8px rgba(227,30,36,0.35)" }}>
            MAITE CRM
          </p>
        </div>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" style={{ boxShadow: "0 0 5px #22c55e" }} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <p className="px-4 mb-2 text-[9px] font-mono tracking-[0.3em] text-zinc-700 uppercase">Módulos</p>
        <div className="space-y-0.5 px-1">
          {navItems.slice(0, 6).map((item, i) => (
            <NavLink
              key={item.href}
              item={item}
              index={i}
              isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            />
          ))}
        </div>
        <div className="mx-4 my-3" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
        <div className="px-1">
          {navItems.slice(6).map((item, i) => (
            <NavLink
              key={item.href}
              item={item}
              index={6 + i}
              isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            />
          ))}
        </div>
      </nav>

      {/* User */}
      {user && (
        <div className="px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 flex items-center justify-center text-[#E31E24] font-mono font-bold text-xs shrink-0"
              style={{ background: "rgba(227,30,36,0.12)", border: "1px solid rgba(227,30,36,0.3)" }}
            >
              {user.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider truncate leading-none">
                {user.full_name || "Usuario"}
              </p>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">
                {user.role || "viewer"}
              </p>
            </div>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-zinc-700 hover:text-[#E31E24] transition-colors" title="Cerrar sesión">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

function SidebarMobile({ user, open, onClose }: SidebarProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  function handleLogout() {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/signout';
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-64 p-0" style={{ background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="w-7 h-7 flex items-center justify-center text-white font-mono font-bold text-xs shrink-0"
            style={{ background: "#E31E24", boxShadow: "0 0 12px rgba(227,30,36,0.5)" }}
          >
            M
          </div>
          <p className="text-[11px] font-mono font-bold text-white tracking-[0.2em] uppercase" style={{ textShadow: "0 0 8px rgba(227,30,36,0.35)" }}>
            MAITE CRM
          </p>
        </div>

        <nav className="py-3">
          <div className="space-y-0.5 px-1">
            {navItems.map((item, i) => (
              <NavLink
                key={item.href}
                item={item}
                index={i}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                onClick={onClose}
              />
            ))}
          </div>
        </nav>

        {user && (
          <div className="px-3 py-3 absolute bottom-0 left-0 right-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 flex items-center justify-center text-[#E31E24] font-mono font-bold text-xs shrink-0"
                style={{ background: "rgba(227,30,36,0.12)", border: "1px solid rgba(227,30,36,0.3)" }}
              >
                {user.full_name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider truncate">
                  {user.full_name || "Usuario"}
                </p>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{user.role || "viewer"}</p>
              </div>
              <button onClick={handleLogout} className="text-zinc-700 hover:text-[#E31E24] transition-colors">
                <LogOut className="h-3.5 w-3.5" />
              </button>
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
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-1.5 text-zinc-400 hover:text-white transition-colors"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>
    </>
  );
}

export { SidebarDesktop, SidebarMobile };
