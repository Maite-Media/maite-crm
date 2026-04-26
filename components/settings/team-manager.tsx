'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getTeamMembers, getInvitations, updateUserRole, inviteUser, cancelInvitation } from '@/lib/actions/users'
import type { TeamMember, Invitation, UserRole } from '@/lib/actions/users'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  commercial: 'Comercial',
  production: 'Producción',
  viewer: 'Visor',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800',
  commercial: 'bg-blue-100 text-blue-800',
  production: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function TeamManager() {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer')
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string } | null>(null)

  // Load data on mount
  useEffect(() => {
    startTransition(async () => {
      console.log('[TeamManager] Loading team data...')
      const [membersResult, invitationsResult] = await Promise.all([
        getTeamMembers(),
        getInvitations(),
      ])
      console.log('[TeamManager] membersResult:', membersResult.success, membersResult.data?.length)
      console.log('[TeamManager] invitationsResult:', invitationsResult.success, invitationsResult.data?.length)
      if (membersResult.success) setMembers(membersResult.data ?? [])
      if (invitationsResult.success) setInvitations(invitationsResult.data ?? [])
      setIsLoading(false)
    })
  }, [])

  function handleRoleChange(memberId: string, newRole: UserRole) {
    startTransition(async () => {
      const result = await updateUserRole(memberId, newRole)
      if (result.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        )
      } else {
        alert(result.error ?? 'Error al cambiar rol')
      }
    })
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteResult(null)
    startTransition(async () => {
      const result = await inviteUser(inviteEmail, inviteRole)
      if (result.success && result.data) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const registerUrl = `${baseUrl}/register?token=${result.data.token}`
        setInviteResult({
          success: true,
          message: `Invitación creada. Link para compartir:\n${registerUrl}`,
        })
        setInviteEmail('')
        // Refresh invitations
        const invitationsResult = await getInvitations()
        if (invitationsResult.success) setInvitations(invitationsResult.data ?? [])
      } else {
        setInviteResult({ success: false, message: result.error ?? 'Error al invitar' })
      }
    })
  }

  function handleCancelInvitation(id: string) {
    if (!confirm('¿Cancelar esta invitación?')) return
    startTransition(async () => {
      const result = await cancelInvitation(id)
      if (result.success) {
        setInvitations((prev) => prev.filter((i) => i.id !== id))
      } else {
        alert(result.error ?? 'Error al cancelar')
      }
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando equipo...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros del equipo</CardTitle>
          <CardDescription>
            Gestiona los usuarios del sistema y sus roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                    Sin miembros registrados
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name || '-'}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                        disabled={isPending}
                        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      >
                        <option value="admin">Administrador</option>
                        <option value="commercial">Comercial</option>
                        <option value="production">Producción</option>
                        <option value="viewer">Visor</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Invitaciones pendientes</CardTitle>
          <CardDescription>
            Invitaciones que aún no fueron aceptadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin invitaciones pendientes
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[invitation.role]}>
                        {ROLE_LABELS[invitation.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invitation.expires_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={isPending}
                      >
                        Cancelar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger>
          <Button>Invitar usuario</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar nuevo usuario</DialogTitle>
            <DialogDescription>
              Se creará un link de invitación único que podrás compartir
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="viewer">Visor</option>
                  <option value="production">Producción</option>
                  <option value="commercial">Comercial</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {inviteResult && (
                <div className={`p-3 rounded-lg text-sm ${inviteResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {inviteResult.message.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creando...' : 'Crear invitación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}