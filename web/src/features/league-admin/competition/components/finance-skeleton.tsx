import { Card, CardContent, CardHeader } from '@/components/ui/card'

/** Placeholder of the finance dashboard while the first numbers load. */
export function FinanceSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando datos financieros">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Gestión Financiera</h2>
        <p className="text-white/80 drop-shadow">Cargando datos...</p>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <div className="h-4 bg-white/20 rounded animate-pulse motion-reduce:animate-none" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-white/20 rounded animate-pulse motion-reduce:animate-none" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
