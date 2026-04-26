'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, FileText } from 'lucide-react'
import { getProposalData } from '@/lib/actions/proposals'
import { createActivity } from '@/lib/actions/activities'
import { jsPDF } from 'jspdf'

interface ProposalButtonProps {
  opportunityId: string
  companyName?: string
}

export function ProposalButton({ opportunityId, companyName }: ProposalButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const result = await getProposalData(opportunityId)
      if (!result.success || !result.data) {
        alert(result.error ?? 'Error al obtener datos')
        return
      }

      const { data } = result
      const today = new Date().toLocaleDateString('es-PY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      const dateStr = new Date().toISOString().split('T')[0]

      const doc = new jsPDF()

      // Header
      doc.setFontSize(24)
      doc.setTextColor(227, 30, 36) // MAITE red
      doc.setFont('helvetica', 'bold')
      doc.text('MAITE MEDIA', 20, 25)

      doc.setFontSize(16)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text('Propuesta Comercial', 20, 33)

      // Date on the right
      doc.setFontSize(10)
      doc.text(today, 190, 25, { align: 'right' })

      // Separator line
      doc.setDrawColor(227, 30, 36)
      doc.setLineWidth(0.5)
      doc.line(20, 40, 190, 40)

      // "Para:" section
      let y = 55
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Para:', 20, y)

      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)

      if (data.contact) {
        const fullName = `${data.contact.first_name}${data.contact.last_name ? ` ${data.contact.last_name}` : ''}`
        doc.text(fullName, 20, y)
        y += 6
      }

      if (data.company) {
        doc.text(data.company.name, 20, y)
        y += 6
      }

      if (data.contact?.email) {
        doc.text(data.contact.email, 20, y)
        y += 6
      }

      if (data.contact?.phone) {
        doc.text(data.contact.phone, 20, y)
        y += 6
      }

      // Proposal section
      y += 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(data.opportunity.title, 20, y)

      y += 10

      // Services table header
      doc.setFillColor(240, 240, 240)
      doc.rect(20, y, 170, 8, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Servicio', 25, y + 5)
      doc.text('Tipo', 100, y + 5)
      doc.text('Precio', 160, y + 5, { align: 'right' })

      y += 12
      doc.setFont('helvetica', 'normal')

      let total = 0
      for (const service of data.services) {
        doc.text(service.name.substring(0, 40), 25, y)
        doc.text(service.service_type ?? '-', 100, y)
        const price = service.price ?? 0
        doc.text(`₲${price.toLocaleString('es-PY')}`, 190, y, { align: 'right' })
        total += price
        y += 7
      }

      // Total
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Total:', 140, y)
      doc.text(`₲${total.toLocaleString('es-PY')}`, 190, y, { align: 'right' })

      // Footer
      y += 20
      doc.setDrawColor(200, 200, 200)
      doc.line(20, y, 190, y)

      y += 10
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('Esta propuesta tiene validez de 30 días', 20, y)
      y += 5
      doc.text(`Generado el: ${today}`, 20, y)

      // Save
      const fileName = `propuesta-${companyName ?? 'cliente'}-${dateStr}.pdf`
      doc.save(fileName)

      // Create activity
      await createActivity({
        type: 'proposal_sent',
        description: 'Propuesta PDF generada',
        opportunity_id: opportunityId,
      })
    } catch (err) {
      console.error(err)
      alert('Error al generar PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileText className="size-4" />
          Generar PDF
        </>
      )}
    </Button>
  )
}