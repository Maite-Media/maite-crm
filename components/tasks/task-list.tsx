'use client'

import { useState, useTransition, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PriorityBadge } from './priority-badge'
import { TaskDetailPanel } from './task-detail-panel'
import { TaskForm } from './task-form'
import { completeTask, getTasks } from '@/lib/actions/tasks'
import type { Task } from '@/lib/actions/tasks'
import { getProfiles } from '@/lib/actions/profile'
import { getContacts } from '@/lib/actions/leads'
import { getCompanies } from '@/lib/actions/companies'
import { getOpportunitiesList } from '@/lib/actions/opportunities'

type TaskWithRelations = Task & {
  profiles?: { full_name: string } | null
  contacts?: { first_name: string; last_name: string } | null
  companies?: { name: string } | null
  opportunities?: { title: string } | null
}

interface TaskListProps {
  initialTasks: TaskWithRelations[]
  currentUserId?: string
  profiles?: Array<{ id: string; full_name: string }>
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  opportunities?: Array<{ id: string; title: string }>
}

type TabValue = 'pending' | 'today' | 'week' | 'all'

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'done') return false
  return new Date(task.due_date) < new Date()
}

function isToday(dateString: string | null): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isThisWeek(dateString: string | null): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 7)
  return date >= today && date <= endOfWeek
}

function formatDueDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana'
  return date.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })
}

export function TaskList({ initialTasks, currentUserId, profiles = [], contacts = [], companies = [], opportunities = [] }: TaskListProps) {
  const [isPending, startTransition] = useTransition()
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTab, setActiveTab] = useState<TabValue>('pending')
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('')
  const [formProfiles, setFormProfiles] = useState(profiles)
  const [formContacts, setFormContacts] = useState(contacts)
  const [formCompanies, setFormCompanies] = useState(companies)
  const [formOpportunities, setFormOpportunities] = useState(opportunities)

  const filteredTasks = tasks.filter((task) => {
    // Filter by assigned_to
    if (filterAssignedTo && task.assigned_to !== filterAssignedTo) return false

    switch (activeTab) {
      case 'pending':
        return task.status === 'pending' || task.status === 'in_progress'
      case 'today':
        return isToday(task.due_date) && task.status !== 'done'
      case 'week':
        return isThisWeek(task.due_date) && task.status !== 'done'
      case 'all':
        return true
      default:
        return true
    }
  })

  const handleTabChange = useCallback((tab: TabValue) => {
    setActiveTab(tab)
  }, [])

  function handleComplete(taskId: string, e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      const result = await completeTask(taskId)
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'done' } : t))
        )
      }
    })
  }

  function handleTaskClick(task: TaskWithRelations) {
    setSelectedTask(task)
    setDetailPanelOpen(true)
  }

  function handleTaskCreated() {
    setCreateDialogOpen(false)
    startTransition(async () => {
      const result = await getTasks()
      if (result.success) {
        setTasks((result.data as TaskWithRelations[]) ?? [])
      }
    })
  }

  function handleTaskUpdated() {
    setDetailPanelOpen(false)
    startTransition(async () => {
      const result = await getTasks()
      if (result.success) {
        setTasks((result.data as TaskWithRelations[]) ?? [])
      }
    })
  }

  function handleTaskDeleted() {
    setDetailPanelOpen(false)
    startTransition(async () => {
      const result = await getTasks()
      if (result.success) {
        setTasks((result.data as TaskWithRelations[]) ?? [])
      }
    })
  }

  const pendingCount = tasks.filter(
    (t) => (t.status === 'pending' || t.status === 'in_progress') && t.assigned_to === currentUserId
  ).length
  const todayCount = tasks.filter(
    (t) => isToday(t.due_date) && t.status !== 'done'
  ).length
  const weekCount = tasks.filter(
    (t) => isThisWeek(t.due_date) && t.status !== 'done'
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTabChange('pending')}
          >
            Pendientes {pendingCount > 0 && `(${pendingCount})`}
          </Button>
          <Button
            variant={activeTab === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTabChange('today')}
          >
            Hoy {todayCount > 0 && `(${todayCount})`}
          </Button>
          <Button
            variant={activeTab === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTabChange('week')}
          >
            Esta semana {weekCount > 0 && `(${weekCount})`}
          </Button>
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTabChange('all')}
          >
            Todas
          </Button>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} size="sm">
          Nueva tarea
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No hay tareas en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card text-card-foreground hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => handleTaskClick(task)}
            >
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                {task.status === 'done' ? (
                  <Checkbox checked disabled />
                ) : (
                  <Checkbox
                    checked={false}
                    onClick={(e) => handleComplete(task.id, e)}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                  <PriorityBadge priority={task.priority} />
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                  {task.due_date && (
                    <span className={isOverdue(task) ? 'text-destructive font-medium' : ''}>
                      {formatDueDate(task.due_date)}
                      {isOverdue(task) && ' (Vencida)'}
                    </span>
                  )}

                  {task.contacts && (
                    <>
                      <span>•</span>
                      <span>{task.contacts.first_name} {task.contacts.last_name}</span>
                    </>
                  )}

                  {task.companies && (
                    <>
                      <span>•</span>
                      <span>{task.companies.name}</span>
                    </>
                  )}

                  {task.opportunities && (
                    <>
                      <span>•</span>
                      <span>{task.opportunities.title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Tarea</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <TaskForm
              profiles={formProfiles}
              contacts={formContacts}
              companies={formCompanies}
              opportunities={formOpportunities}
              onSuccess={handleTaskCreated}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          activities={[]}
          profiles={formProfiles}
          contacts={formContacts}
          companies={formCompanies}
          opportunities={formOpportunities}
          open={detailPanelOpen}
          onOpenChange={setDetailPanelOpen}
          onDeleted={handleTaskDeleted}
          onUpdated={handleTaskUpdated}
        />
      )}
    </div>
  )
}
