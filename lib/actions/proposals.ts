'use server'

import { createClient } from '@/lib/supabase/server'

export type ProposalData = {
  opportunity: {
    id: string
    title: string
    estimated_value: number | null
    close_probability: number | null
    expected_close_date: string | null
    notes: string | null
  }
  contact: {
    first_name: string
    last_name: string | null
    email: string | null
    phone: string | null
  } | null
  company: {
    name: string
  } | null
  services: Array<{
    name: string
    service_type: string | null
    price: number | null
  }>
}

export async function getProposalData(opportunityId: string): Promise<{ success: boolean; data?: ProposalData; error?: string }> {
  const supabase = await createClient()

  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select(`
      id,
      title,
      estimated_value,
      close_probability,
      expected_close_date,
      notes,
      contacts:contact_id (
        first_name,
        last_name,
        email,
        phone
      ),
      companies:company_id (
        name
      )
    `)
    .eq('id', opportunityId)
    .is('deleted_at', null)
    .single()

  if (oppError || !opportunity) {
    return { success: false, error: oppError?.message ?? 'Oportunidad no encontrada' }
  }

  // Get services for this opportunity
  const { data: oppServices } = await supabase
    .from('opportunity_services')
    .select(`
      quantity,
      unit_price,
      services:service_id (
        name,
        service_type,
        price
      )
    `)
    .eq('opportunity_id', opportunityId)

  type OppServiceRow = {
    quantity: number | null
    unit_price: number | null
    services: Array<{
      name: string | null
      service_type: string | null
      price: number | null
    }> | null
  }

  const services = (oppServices ?? []).map((os: OppServiceRow) => {
    const svc = Array.isArray(os.services) ? os.services[0] : os.services
    return {
      name: svc?.name ?? 'Servicio',
      service_type: svc?.service_type ?? null,
      price: os.unit_price ?? svc?.price ?? 0,
    }
  })

  return {
    success: true,
    data: {
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        estimated_value: opportunity.estimated_value,
        close_probability: opportunity.close_probability,
        expected_close_date: opportunity.expected_close_date,
        notes: opportunity.notes,
      },
      contact: Array.isArray(opportunity.contacts) ? opportunity.contacts[0] : opportunity.contacts,
      company: Array.isArray(opportunity.companies) ? opportunity.companies[0] : opportunity.companies,
      services,
    },
  }
}