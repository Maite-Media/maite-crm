'use client'

import { useState, useTransition, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { registerWithInvitation, getInvitationByToken } from '@/lib/actions/auth'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false)

  // Fetch invitation on mount to get invitee's email
  useEffect(() => {
    if (!token) return

    setIsLoadingInvitation(true)
    getInvitationByToken(token)
      .then((result) => {
        console.log('[RegisterForm] getInvitationByToken result:', result)
        if (result.success && result.data) {
          setInviteEmail(result.data.email)
        } else {
          setError(result.error ?? 'Invitación no válida')
        }
      })
      .catch((err) => {
        console.error('[RegisterForm] getInvitationByToken error:', err)
        setError('Error al validar invitación')
      })
      .finally(() => {
        setIsLoadingInvitation(false)
      })
  }, [token])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!token) {
      setError('Token de invitación requerido')
      return
    }

    if (!fullName || fullName.length < 2) {
      setError('Nombre completo es requerido')
      return
    }

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    startTransition(async () => {
      const result = await registerWithInvitation(token, fullName, password)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error ?? 'Error al registrar')
      }
    })
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link inválido</CardTitle>
            <CardDescription>
              No se proporcionó token de invitación
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <Loader2 className="size-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Validando invitación...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !inviteEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitación no válida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear tu cuenta</CardTitle>
          <CardDescription>
            Completá tus datos para unirte al equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail ?? ''}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El email fue configurado por el administrador
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Juan Pérez"
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repetí la contraseña"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="size-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            Cargando...
          </CardContent>
        </Card>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}