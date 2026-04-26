"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRightIcon } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  companies: "Empresas",
  pipeline: "Pipeline",
  tasks: "Tareas",
  projects: "Proyectos",
  settings: "Configuración",
};

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = routeLabels[segment] || segment;
    breadcrumbs.push({
      label,
      href:
        segments.indexOf(segment) < segments.length - 1 ? currentPath : undefined,
    });
  }

  return breadcrumbs;
}

export function Topbar() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 flex items-center h-16 px-4 border-b bg-background lg:px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {breadcrumbs.map((item, index) => (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRightIcon className="size-3" />}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 mr-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="w-48 pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger className="relative inline-flex items-center justify-center size-9 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer">
          <Bell className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
          <DropdownMenuItem className="text-muted-foreground">
            No hay notificaciones nuevas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}