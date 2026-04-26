'use server'

import { createClient } from '@/lib/supabase/server'

export type SearchResults = {
  leads: Array<{
    id: string
    first_name: string
    last_name: string | null
    email: string | null
  }>
  empresas: Array<{
    id: string
    name: string
    industry: string | null
  }>
  oportunidades: Array<{
    id: string
    title: string
    estimated_value: number | null
  }>
}

export async function globalSearch(query: string): Promise<{ success: boolean; data: SearchResults; error?: string }> {
  if (query.length < 3) {
    return { success: true, data: { leads: [], empresas: [], oportunidades: [] } }
  }

  const supabase = await createClient()

  const [contactsResult, companiesResult, opportunitiesResult] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5),
    supabase
      .from('companies')
      .select('id, name, industry')
      .ilike('name', `%${query}%`)
      .limit(5),
    supabase
      .from('opportunities')
      .select('id, title, estimated_value')
      .ilike('title', `%${query}%`)
      .limit(5),
  ])

  return {
    success: true,
    data: {
      leads: (contactsResult.data ?? []) as SearchResults['leads'],
      empresas: (companiesResult.data ?? []) as SearchResults['empresas'],
      oportunidades: (opportunitiesResult.data ?? []) as SearchResults['oportunidades'],
    },
  }
}