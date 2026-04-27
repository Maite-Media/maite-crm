'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { Search, Bell } from 'lucide-react'
import { ChevronRightIcon } from 'lucide-react'
import { globalSearch } from '@/lib/actions/search'
import type { SearchResults } from '@/lib/actions/search'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  companies: 'Empresas',
  pipeline: 'Pipeline',
  tasks: 'Tareas',
  projects: 'Proyectos',
  settings: 'Config',
}

function buildBreadcrumbs(pathname: string): Array<{ label: string; href?: string }> {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: Array<{ label: string; href?: string }> = []
  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const label = routeLabels[segment] || segment
    breadcrumbs.push({
      label: label.toUpperCase(),
      href: segments.indexOf(segment) < segments.length - 1 ? currentPath : undefined,
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
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 3) { setResults(null); return }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await globalSearch(value)
        if (result.success) setResults(result.data)
      })
    }, 400)
  }, [])

  function handleResultClick(href: string, id?: string) {
    setQuery(''); setResults(null); setShowDropdown(false)
    router.push(id ? `${href}?open=${id}` : href)
  }

  const hasResults = results && (results.leads.length > 0 || results.empresas.length > 0 || results.oportunidades.length > 0)

  return (
    <header
      className="sticky top-0 z-40 flex items-center h-12 px-4 lg:px-6"
      style={{
        background: '#0a0a0a',
        borderBottom: '1px solid rgba(227,30,36,0.2)',
        boxShadow: '0 1px 0 rgba(227,30,36,0.08)',
      }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1">
        <span className="text-[10px] font-mono text-zinc-700 mr-1">SYS</span>
        <ChevronRightIcon className="size-2.5 text-zinc-700" />
        {breadcrumbs.map((item, index) => (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRightIcon className="size-2.5 text-zinc-700" />}
            {item.href ? (
              <Link href={item.href} className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors tracking-widest">
                {item.label}
              </Link>
            ) : (
              <span
                className="text-[11px] font-mono font-bold tracking-widest"
                style={{ color: '#E31E24', textShadow: '0 0 8px rgba(227,30,36,0.4)' }}
              >
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center mr-3" ref={containerRef}>
        <div className="relative">
          <div className="flex items-center gap-1.5 px-3 h-8 text-[11px] font-mono transition-all"
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.06)',
              minWidth: '180px',
            }}
          >
            <span className="text-[#E31E24] shrink-0">›</span>
            <input
              type="text"
              placeholder="buscar..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => query.length >= 3 && setShowDropdown(true)}
              className="bg-transparent border-none outline-none text-zinc-300 placeholder:text-zinc-700 font-mono text-[11px] w-full"
            />
            <Search className="size-3 text-zinc-700 shrink-0" />
          </div>

          {showDropdown && query.length >= 3 && (
            <div
              className="absolute top-full mt-1 w-80 overflow-hidden z-50"
              style={{ background: '#111', border: '1px solid rgba(227,30,36,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
            >
              {isSearching ? (
                <div className="p-3 text-[10px] font-mono text-zinc-600 text-center uppercase tracking-wider">
                  Procesando...
                </div>
              ) : hasResults ? (
                <div className="py-1 max-h-80 overflow-y-auto">
                  {results!.leads.length > 0 && (
                    <div>
                      <p className="px-3 py-1.5 text-[9px] font-mono text-zinc-600 uppercase tracking-widest" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        [LEADS]
                      </p>
                      {results!.leads.map((lead) => (
                        <button key={lead.id} onClick={() => handleResultClick('/leads', lead.id)}
                          className="w-full text-left px-3 py-2 font-mono text-[11px] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          {lead.first_name} {lead.last_name ?? ''}
                          {lead.email && <span className="text-zinc-600 ml-2">{lead.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.empresas.length > 0 && (
                    <div>
                      <p className="px-3 py-1.5 text-[9px] font-mono text-zinc-600 uppercase tracking-widest" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        [EMPRESAS]
                      </p>
                      {results!.empresas.map((company) => (
                        <button key={company.id} onClick={() => handleResultClick('/companies', company.id)}
                          className="w-full text-left px-3 py-2 font-mono text-[11px] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          {company.name}
                          {company.industry && <span className="text-zinc-600 ml-2">{company.industry}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.oportunidades.length > 0 && (
                    <div>
                      <p className="px-3 py-1.5 text-[9px] font-mono text-zinc-600 uppercase tracking-widest" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        [PIPELINE]
                      </p>
                      {results!.oportunidades.map((opp) => (
                        <button key={opp.id} onClick={() => handleResultClick('/pipeline', opp.id)}
                          className="w-full text-left px-3 py-2 font-mono text-[11px] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          {opp.title}
                          {opp.estimated_value && <span className="text-zinc-600 ml-2">₲{Number(opp.estimated_value).toLocaleString('es-PY')}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-[10px] font-mono text-zinc-700 text-center uppercase tracking-wider">
                  Sin resultados
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <button
        className="relative p-2 text-zinc-600 hover:text-zinc-300 transition-colors"
        title="Notificaciones"
      >
        <Bell className="size-4" />
      </button>
    </header>
  )
}
