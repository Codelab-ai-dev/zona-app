import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import type { MatchWithRelations } from '../types'
import { AttendanceMonitor } from './attendance-monitor'

interface AttendanceDialogProps {
  match: MatchWithRelations
  onClose: () => void
}

/** Attendance of one match: counts per team plus who is present, when and how. */
export function AttendanceDialog({ match, onClose }: AttendanceDialogProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle>Asistencia</DialogTitle>
          <DialogDescription className="text-gray-400">
            {match.home_team_name} vs {match.away_team_name}
          </DialogDescription>
        </DialogHeader>
        <AttendanceMonitor match={match} />
      </DialogContent>
    </Dialog>
  )
}
