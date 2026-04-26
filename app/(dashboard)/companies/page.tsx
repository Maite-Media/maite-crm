import { getCompanies } from '@/lib/actions/companies'
import { CompanyTable } from '@/components/companies/company-table'
import type { CompanyWithRelations } from '@/lib/actions/companies'

export default async function CompaniesPage() {
  const result = await getCompanies()
  const companies = (result.success ? result.data : []) as CompanyWithRelations[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
        <p className="text-muted-foreground">
          Gestión de empresas y clientes
        </p>
      </div>

      <CompanyTable initialCompanies={companies} />
    </div>
  )
}
