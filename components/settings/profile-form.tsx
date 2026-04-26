'use client'

import { useState } from 'react'
import { updateProfile, getProfile } from '@/lib/actions/profile'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ProfileData = {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

type ProfileFormProps = {
  profile: ProfileData
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await updateProfile(profile.id, { full_name: fullName })
    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Error desconocido')
      return
    }
    setSuccess(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi perfil</CardTitle>
        <CardDescription>Actualiza tu información personal</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email || ''}
              disabled
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El email no puede ser modificado
            </p>
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Badge variant="secondary">{profile.role || 'viewer'}</Badge>
            <p className="text-xs text-muted-foreground">
              El rol se asigna desde el panel de administración
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">Perfil actualizado correctamente</p>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}