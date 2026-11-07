import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

import type { CoachingStaff } from '../types'

interface CoachingStaffRowProps {
  staff: CoachingStaff
}

export function CoachingStaffRow({ staff }: CoachingStaffRowProps) {
  const initials = staff.name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-4">
      <Avatar>
        {staff.photo && <AvatarImage src={staff.photo} alt={staff.name} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-semibold">{staff.name}</p>
        <p className="text-sm text-muted-foreground">{staff.role}</p>
      </div>
      {staff.is_active ? (
        <Badge>Activo</Badge>
      ) : (
        <Badge variant="secondary">Inactivo</Badge>
      )}
    </div>
  )
}
