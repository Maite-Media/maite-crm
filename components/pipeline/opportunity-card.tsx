'use client'

import React, { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { moveStage } from '@/lib/actions/opportunities'
import type { OpportunityWithRelations } from '@/lib/actions/opportunities'

const CURRENCY_SYMBOL = '₲'

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return `${CURRENCY_SYMBOL}${value.toLocaleString('es-PY')}`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
  })
}

interface OpportunityCardProps {
  opportunity: OpportunityWithRelations
  isDragging?: boolean
  onClick?: () => void
}

export const OpportunityCard = React.memo(function OpportunityCard({ opportunity, isDragging, onClick }: OpportunityCardProps) {
  const contactName = opportunity.contacts
    ? `${opportunity.contacts.first_name}${opportunity.contacts.last_name ? ` ${opportunity.contacts.last_name}` : ''}`
    : null

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm line-clamp-2">{opportunity.title}</p>

        {opportunity.companies && (
          <p className="text-xs text-muted-foreground">{opportunity.companies.name}</p>
        )}

        {contactName && !opportunity.companies && (
          <p className="text-xs text-muted-foreground">{contactName}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(opportunity.estimated_value)}
          </span>
          {opportunity.expected_close_date && (
            <span className="text-xs text-muted-foreground">
              Cierre: {formatDate(opportunity.expected_close_date)}
            </span>
          )}
        </div>

        {opportunity.close_probability !== null && opportunity.close_probability !== undefined && (
          <div className="flex items-center gap-1">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${opportunity.close_probability}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{opportunity.close_probability}%</span>
          </div>
        )}

        {opportunity.services && opportunity.services.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {opportunity.services.slice(0, 3).map((svc, i) => (
              <span
                key={svc.id || i}
                className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded"
              >
                {svc.name}
              </span>
            ))}
            {opportunity.services.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{opportunity.services.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.opportunity.id === nextProps.opportunity.id &&
    prevProps.opportunity.title === nextProps.opportunity.title &&
    prevProps.opportunity.updated_at === nextProps.opportunity.updated_at &&
    prevProps.opportunity.estimated_value === nextProps.opportunity.estimated_value &&
    prevProps.opportunity.close_probability === nextProps.opportunity.close_probability &&
    prevProps.opportunity.expected_close_date === nextProps.opportunity.expected_close_date &&
    prevProps.isDragging === nextProps.isDragging
  )
})