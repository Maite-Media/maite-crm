export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">MAITE CRM</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión comercial inteligente</p>
        </div>
        {children}
      </div>
    </div>
  )
}