export const metadata = {
  title: 'Dashboard - Zona-Gol',
  description: 'Panel de administración de Zona-Gol',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-layout">
      {children}
    </div>
  )
}
