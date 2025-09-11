export const metadata = {
  title: 'Liga - Zona-Gol',
  description: 'Gestión de ligas en Zona-Gol',
}

export default function LigaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="liga-layout">
      {children}
    </div>
  )
}
