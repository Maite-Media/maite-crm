# MAITE CRM Core — instructions.md
> Documento maestro para OpenCode / Claude Code. Leer completo antes de escribir cualquier línea de código.

---

## 0. Instrucción inicial para el agente

Antes de comenzar cualquier tarea:
1. Tomar contexto desde Engram si está disponible.
2. Usar agentes y subagentes para distribuir el trabajo — no ejecutar todo en el agente orquestador principal.
3. Nunca saturar el contexto con tareas largas en un solo hilo. Delegar módulos a subagentes.
4. Después de cada módulo completado, correr `npx tsc --noEmit` y verificar 0 errores antes de continuar.
5. Al finalizar toda la fase, correr `npm run build` y solo si pasa hacer `git add . && git commit -m "..." && git push`.

---

## 1. Descripción del proyecto

**MAITE CRM Core** es un sistema profesional de gestión comercial diseñado para negocios de servicios. La primera instancia es para **Maite Media**, una agencia de servicios digitales. El sistema está construido de forma modular para poder adaptarse a otros rubros (inmobiliarias, clínicas, academias, etc.) cambiando configuración, no código.

**Estado actual:** Fase 1 completada y deployada en Vercel (maite-crm.vercel.app). Ahora ejecutar Fase 2.

---

## 2. Stack tecnológico — NO negociable

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) |
| Base de datos + Auth + Storage | Supabase |
| Estilos | Tailwind CSS |
| Componentes UI | shadcn/ui |
| Deployment | Vercel |
| Lenguaje | TypeScript |

**Regla crítica de Supabase:** Cuando hay dos FKs a la misma tabla, SIEMPRE usar notación explícita: `profiles!tabla_columna_fkey(campo)`. Nunca usar `profiles(campo)` a secas cuando hay más de una relación a profiles.

---

## 9. Fases de construcción

### FASE 1 — COMPLETADA ✅
Módulos base: Login, Dashboard, Leads, Empresas, Pipeline Kanban, Tareas, Proyectos, Configuración.

---

### FASE 2 — Ejecutar ahora en este orden exacto

---

#### PASO 1 — Historial de actividades en Leads

**Qué hacer:** Conectar el tab "Actividad" en el panel de detalle de leads. La tabla `activities` ya existe y tiene datos.

**Archivos a modificar:**
- `lib/actions/activities.ts` — verificar que exista `getActivitiesByContact(contactId: string)`. Si no existe, crearla:
```typescript
export async function getActivitiesByContact(contactId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select('*, profiles!activities_created_by_fkey(full_name)')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
```

- `components/leads/lead-detail-panel.tsx` — en el tab "Actividad":
  1. Llamar a `getActivitiesByContact(lead.id)` al abrir el panel
  2. Mostrar lista de actividades: icono por tipo + descripción + fecha relativa
  3. Al final de la lista: textarea + botón "Agregar nota"
  4. Al guardar: llamar a `createActivity({ type: 'note', description, contact_id: lead.id })`
  5. Actualizar la lista sin recargar la página

**Iconos por tipo de actividad:**
- note → 📝, call → 📞, email → ✉️, whatsapp → 💬, meeting → 👥, stage_change → 🔄, system → ⚙️, default → 📌

**Verificar TypeScript antes de continuar.**

---

#### PASO 2 — Historial de actividades en Empresas

**Qué hacer:** Mismo patrón que Paso 1, pero para empresas.

**Archivos a modificar:**
- `lib/actions/activities.ts` — agregar `getActivitiesByCompany(companyId: string)` con `eq('company_id', companyId)`
- `components/companies/company-detail-panel.tsx` — mismo componente de activity feed

**Verificar TypeScript antes de continuar.**

---

#### PASO 3 — Historial de actividades en Oportunidades

**Qué hacer:** Mismo patrón, para el panel de oportunidades en Pipeline.

**Archivos a modificar:**
- `components/pipeline/opportunity-detail-panel.tsx` — agregar tab Actividad usando `getActivitiesByOpportunity(opportunityId)` que ya existe

**Verificar TypeScript antes de continuar.**

---

#### PASO 4 — Gestión de usuarios en Configuración

**Qué hacer:** La sección "Equipo" en /settings debe permitir ver usuarios, cambiar roles e invitar nuevos.

**PRIMERO ejecutar este SQL en Supabase SQL Editor:**
```sql
create table if not exists public.invitations (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  role text default 'viewer' check (role in ('admin', 'commercial', 'production', 'viewer')),
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references public.profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);
alter table public.invitations enable row level security;
create policy "invitations_select" on public.invitations for select using (auth.role() = 'authenticated');
create policy "invitations_insert" on public.invitations for insert with check (auth.role() = 'authenticated');
create policy "invitations_update" on public.invitations for update using (auth.role() = 'authenticated');
```

**Archivos a crear/modificar:**
- `lib/actions/users.ts` — crear con estas funciones:
  - `getTeamMembers()` → select de profiles ordenado por created_at
  - `updateUserRole(userId, role)` → update profiles set role
  - `inviteUser(email, role)` → insert en invitations
  - `getInvitations()` → select invitations donde accepted_at is null y expires_at > now()
  - `cancelInvitation(id)` → delete invitation

- `app/(dashboard)/settings/page.tsx` — agregar sección Equipo que llame a getTeamMembers() y getInvitations()

- `components/settings/team-manager.tsx` — componente con:
  - Tabla de miembros: avatar inicial, nombre, email, badge de rol, select para cambiar rol
  - Sección invitaciones pendientes: email, rol, fecha expiración, botón cancelar
  - Botón "Invitar usuario" → Dialog con email + selector de rol
  - Al invitar exitosamente mostrar: "Invitación creada. Link para compartir: [URL]/register?token=[TOKEN]"
  - Solo visible para usuarios con role === 'admin'

**Verificar TypeScript antes de continuar.**

---

#### PASO 5 — Página de registro por invitación

**Qué hacer:** Crear página donde un usuario invitado puede crear su cuenta.

**Archivos a crear:**
- `app/(auth)/register/page.tsx` — página de registro
- `lib/actions/auth.ts` — server action `registerWithInvitation(token, fullName, password)`

**Flujo:**
1. Usuario recibe link `/register?token=XXXX`
2. Página busca la invitación por token en tabla `invitations`
3. Si no existe o `expires_at < now()` → mostrar "Link inválido o vencido"
4. Si existe → mostrar formulario con: email (readonly, del registro), nombre completo, contraseña, confirmar contraseña
5. Al enviar: llamar a `supabase.auth.signUp({ email, password })` con el email de la invitación
6. Crear profile con `full_name` y `role` de la invitación
7. Marcar invitación como aceptada: `update invitations set accepted_at = now()`
8. Redirigir a /dashboard

**Verificar TypeScript antes de continuar.**

---

#### PASO 6 — Generador de propuestas PDF

**Qué hacer:** Botón en el panel de oportunidad que genera un PDF de propuesta comercial.

**Instalar dependencia:**
```bash
npm install jspdf
```
Usar jspdf (NO @react-pdf/renderer — es más simple y no tiene problemas con Next.js).

**Archivos a crear:**
- `lib/actions/proposals.ts` — server action `getProposalData(opportunityId)` que retorna todos los datos necesarios
- `components/pipeline/proposal-button.tsx` — botón client component que genera el PDF en el browser

**Especificación del PDF (generado client-side con jspdf):**
```typescript
// Header
// - Texto "MAITE MEDIA" en rojo (#E31E24), bold, 24px
// - Texto "Propuesta Comercial" en negro, 16px
// - Fecha actual a la derecha

// Línea separadora roja

// Sección "Para:"
// - Nombre del contacto
// - Empresa
// - Email y teléfono si existen

// Sección "Propuesta:"
// - Título de la oportunidad (bold)
// - Tabla de servicios: nombre | tipo | precio
// - Total en negrita

// Footer
// - "Esta propuesta tiene validez de 30 días"
// - Fecha de generación
```

**Integración:**
- Agregar `<ProposalButton opportunityId={id} />` en `opportunity-detail-panel.tsx`
- Al hacer click genera y descarga el PDF como `propuesta-[empresa]-[YYYY-MM-DD].pdf`
- Después de generar, crear actividad: `{ type: 'proposal_sent', description: 'Propuesta PDF generada', opportunity_id: id }`

**Verificar TypeScript antes de continuar.**

---

#### PASO 7 — Búsqueda global funcional

**Qué hacer:** Conectar el input de búsqueda en el topbar.

**Archivos a crear/modificar:**
- `lib/actions/search.ts` — crear:
```typescript
export async function globalSearch(query: string) {
  if (query.length < 3) return { success: true, data: [] }
  const supabase = await createClient()
  const [contacts, companies, opportunities] = await Promise.all([
    supabase.from('contacts').select('id, first_name, last_name, email').or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`).limit(5),
    supabase.from('companies').select('id, name, industry').ilike('name', `%${query}%`).limit(5),
    supabase.from('opportunities').select('id, title, estimated_value').ilike('title', `%${query}%`).limit(5),
  ])
  return {
    success: true,
    data: {
      leads: contacts.data || [],
      empresas: companies.data || [],
      oportunidades: opportunities.data || [],
    }
  }
}
```

- `components/layout/topbar.tsx` — conectar búsqueda:
  - Input existente dispara búsqueda con debounce de 400ms
  - Mostrar dropdown con resultados agrupados por categoría
  - Click en resultado navega a /leads, /companies, o /pipeline según tipo
  - Cerrar dropdown al hacer click fuera o al navegar
  - "Sin resultados" si no hay nada

**Verificar TypeScript antes de continuar.**

---

#### PASO FINAL — Build y deploy

```bash
npx tsc --noEmit
npm run build
git add .
git commit -m "feat: Fase 2 completa - actividades, usuarios, PDF, busqueda"
git push
```

Si `npm run build` falla, corregir SOLO el error que muestra sin tocar el resto.

---

## 10. Reglas de código

- **TypeScript estricto.** 0 errores de TypeScript antes de cada push.
- **FK Supabase:** siempre notación explícita con el nombre del constraint.
- **No tocar** módulos de Fase 1 que ya funcionan salvo para agregar funcionalidad.
- **Un paso a la vez.** Verificar que funciona antes de pasar al siguiente.
- **Build limpio** antes de push.

---

*Versión: 2.0 — MAITE CRM Core*
*Fase 1: ✅ Completada*
*Fase 2: En progreso*
