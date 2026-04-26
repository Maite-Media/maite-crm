'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronRightIcon } from 'lucide-react'
import { globalSearch } from '@/lib/actions/search'
import type { SearchResults } from '@/lib/actions/search'

interface BreadcrumbItem {
  label: string
  href?: string
}

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  companies: 'Empresas',
  pipeline: 'Pipeline',
  tasks: 'Tareas',
  projects: 'Proyectos',
  settings: 'Configuración',
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const label = routeLabels[segment] || segment
    breadcrumbs.push({
      label,
      href:
        segments.indexOf(segment) < segments.length - 1 ? currentPath : undefined,
    })
  }

  return breadcrumbs
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const breadcrumbs = buildBreadcrumbs(pathname)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isSearching, startTransition] = useTransition()
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setShowDropdown(true)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.length < 3) {
      setResults(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await globalSearch(value)
        if (result.success) {
          setResults(result.data)
        }
      })
    }, 400)
  }, [])

  function handleResultClick(href: string, id?: string) {
    setQuery('')
    setResults(null)
    setShowDropdown(false)
    const url = id ? `${href}?open=${id}` : href
    router.push(url)
  }

  const hasResults = results && (
    results.leads.length > 0 ||
    results.empresas.length > 0 ||
    results.oportunidades.length > 0
  )

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
      <div className="hidden md:flex items-center gap-2 mr-4" ref={containerRef}>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query.length >= 3 && setShowDropdown(true)}
            className="w-48 pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
          {showDropdown && query.length >= 3 && (
            <div className="absolute top-full mt-1 w-80 bg-popover border rounded-lg shadow-lg overflow-hidden">
              {isSearching ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Buscando...
                </div>
              ) : hasResults ? (
                <div className="py-2 max-h-96 overflow-y-auto">
                  {results!.leads.length > 0 && (
                    <div>
                      <p className="px-3 py-1 text-xs font-medium text-muted-foreground">Leads</p>
                      {results!.leads.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => handleResultClick('/leads', lead.id)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        >
                          {lead.first_name} {lead.last_name ?? ''}
                          {lead.email && (
                            <span className="text-muted-foreground ml-2">{lead.email}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.empresas.length > 0 && (
                    <div>
                      <p className="px-3 py-1 text-xs font-medium text-muted-foreground">Empresas</p>
                      {results!.empresas.map((company) => (
                        <button
                          key={company.id}
                          onClick={() => handleResultClick('/companies', company.id)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        >
                          {company.name}
                          {company.industry && (
                            <span className="text-muted-foreground ml-2">{company.industry}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.oportunidades.length > 0 && (
                    <div>
                      <p className="px-3 py-1 text-xs font-medium text-muted-foreground">Oportunidades</p>
                      {results!.oportunidades.map((opp) => (
                        <button
                          key={opp.id}
                          onClick={() => handleResultClick('/pipeline', opp.id)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        >
                          {opp.title}
                          {opp.estimated_value && (
                            <span className="text-muted-foreground ml-2">
                              ₲{opp.estimated_value.toLocaleString('es-PY')}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Sin resultados
                </div>
              )}
            </div>
          )}
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
  )
}