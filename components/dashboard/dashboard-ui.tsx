'use client'

// Shared UI components for dashboard (no server logic)

interface SectionLabelProps {
  children: React.ReactNode
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">{children}</p>
  )
}

export function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{children}</p>
  )
}

interface WidgetContainerProps {
  children: React.ReactNode
  className?: string
}

export function CardContainer({ children, className = '' }: WidgetContainerProps) {
  return (
    <div className={`relative bg-[#111111] border border-white/5 rounded-sm p-5 overflow-hidden hover:border-white/10 transition-colors ${className}`}>
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/50" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/50" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/50" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/50" />
      {children}
    </div>
  )
}

export function LoadingCard() {
  return (
    <div className="relative bg-[#111111] border border-white/5 rounded-sm p-4 animate-pulse h-24 overflow-hidden">
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/30" />
    </div>
  )
}

export function LoadingChart() {
  return (
    <div className="relative bg-[#111111] border border-white/5 rounded-sm p-5 animate-pulse h-52 overflow-hidden">
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/30" />
    </div>
  )
}