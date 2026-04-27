import { getCompanies } from '@/lib/actions/companies'
import { CompanyTable } from '@/components/companies/company-table'
import type { CompanyWithRelations } from '@/lib/actions/companies'

export default async function CompaniesPage() {
  const result = await getCompanies()
  const companies = (result.success ? result.data : []) as CompanyWithRelations[]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-8 bg-[#E31E24]" style={{ boxShadow: '0 0 8px rgba(227,30,36,0.6)' }} />
        <div>
          <p className="text-[9px] font-mono tracking-[0.35em] text-zinc-600 uppercase leading-none">Módulo 03</p>
          <h1 className="text-lg font-mono font-bold text-white tracking-widest uppercase leading-snug" style={{ textShadow: '0 0 16px rgba(227,30,36,0.25)' }}>
            Empresas
          </h1>
        </div>
        <div className="ml-auto">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
            {companies.length} registros
          </span>
        </div>
      </div>
      <CompanyTable initialCompanies={companies} />
    </div>
  )
}
