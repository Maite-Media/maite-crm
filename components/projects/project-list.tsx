'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProjectCard } from './project-card'
import { ProjectForm } from './project-form'
import { ProjectDetailPanel } from './project-detail-panel'
import { getProjects } from '@/lib/actions/projects'
import type { ProjectWithRelations } from '@/lib/actions/projects'

interface ProjectListProps {
  initialProjects: ProjectWithRelations[]
  profiles?: Array<{ id: string; full_name: string }>
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
}

export function ProjectList({ initialProjects, profiles = [], contacts = [], companies = [] }: ProjectListProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [, startTransition] = useTransition()

  function handleProjectClick(project: ProjectWithRelations) {
    setSelectedProject(project)
    setDetailPanelOpen(true)
  }

  async function handleProjectCreated() {
    setCreateDialogOpen(false)
    startTransition(async () => {
      const result = await getProjects()
      if (result.success && result.data) {
        setProjects(result.data)
      }
    })
  }

  function handleProjectUpdated(updatedProject: ProjectWithRelations) {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
    setSelectedProject(updatedProject)
  }

  function handleProjectDeleted(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
    setDetailPanelOpen(false)
    setSelectedProject(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground">Gestión de proyectos en curso</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>Nuevo proyecto</Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay proyectos aún
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Proyecto</DialogTitle>
          </DialogHeader>
          <ProjectForm
            profiles={profiles}
            contacts={contacts}
            companies={companies}
            onSuccess={handleProjectCreated}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      <ProjectDetailPanel
        project={selectedProject}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        profiles={profiles}
        contacts={contacts}
        companies={companies}
        onUpdated={handleProjectUpdated}
        onDeleted={handleProjectDeleted}
      />
    </div>
  )
}