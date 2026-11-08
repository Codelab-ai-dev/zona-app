import { Trash2 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { glassCard } from '../glass'
import type { CoachingStaff } from '../types'
import { initials } from '../utils'

function age(birthDate: string): number {
  const born = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - born.getUTCFullYear()
  if (now.getMonth() < born.getUTCMonth() || (now.getMonth() === born.getUTCMonth() && now.getDate() < born.getUTCDate())) years--
  return years
}

/** One staff member of the Cuerpo Técnico tab, in the original glass card. */
export function CoachingStaffRow({ staff, onDeactivate }: { staff: CoachingStaff; onDeactivate: () => void }) {
  return (
    <Card className={glassCard}>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            {staff.photo && <AvatarImage src={staff.photo} alt={staff.name} />}
            <AvatarFallback className="bg-blue-500/30 text-blue-300 font-bold border border-blue-300/50">{initials(staff.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base sm:text-lg text-white drop-shadow-lg">{staff.name}</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">{staff.role}</CardDescription>
          </div>
        </div>
        <Badge className={`w-fit backdrop-blur-md border-0 text-white ${staff.is_active ? 'bg-green-500/80' : 'bg-gray-500/80'}`}>
          {staff.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {staff.cedula && <p className="text-sm text-white/80 drop-shadow">Cédula: {staff.cedula}</p>}
          {staff.birth_date && <p className="text-sm text-white/80 drop-shadow">Edad: {age(staff.birth_date)} años</p>}
          {staff.created_at && (
            <p className="text-sm text-white/70 drop-shadow">Registrado: {new Date(staff.created_at).toLocaleDateString('es-ES')}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDeactivate}
              aria-label={`Desactivar a ${staff.name}`}
              className="backdrop-blur-md bg-red-500/30 border-red-300/50 text-red-300 hover:bg-red-500/40"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
