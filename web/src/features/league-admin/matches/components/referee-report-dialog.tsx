import { useState } from 'react'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QueryState } from '@/components/states'
import { ApiError } from '@/lib/api/client'

import { useMatchRefereeReport, usePostRefereeReport } from '../api'
import type { MatchWithRelations, PostRefereeReportRequest } from '../types'
import { REPORT_FIELDS, RefereeReportForm } from './referee-report-form'

interface RefereeReportDialogProps {
  match: MatchWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Shows the referee report and lets the admin create or edit it. A 404 means "no report yet". */
export function RefereeReportDialog({ match, open, onOpenChange }: RefereeReportDialogProps) {
  const report = useMatchRefereeReport(match.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informe del Árbitro</DialogTitle>
          <DialogDescription>
            {match.home_team_name} vs {match.away_team_name}
          </DialogDescription>
        </DialogHeader>

        <QueryState query={report} loadingLabel="Cargando informe…">
          {(existing) => <ReportBody matchId={match.id} existing={existing} onDone={() => onOpenChange(false)} />}
        </QueryState>
      </DialogContent>
    </Dialog>
  )
}

function ReportBody({ matchId, existing, onDone }: { matchId: string; existing: PostRefereeReportRequest | null; onDone: () => void }) {
  const postReport = usePostRefereeReport()
  const [values, setValues] = useState<PostRefereeReportRequest>(existing ?? {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  // No report yet: go straight to the form.
  const [isEditing, setIsEditing] = useState(existing === null)

  const handleSave = async () => {
    setErrors({})
    const data: PostRefereeReportRequest = {}
    for (const f of REPORT_FIELDS) data[f.key] = values[f.key] || undefined
    try {
      await postReport.mutateAsync({ matchId, data })
      toast.success('Informe del árbitro guardado exitosamente')
      onDone()
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fields).length > 0) setErrors(err.fields)
        toast.error(err.message)
      } else {
        toast.error('Error al guardar informe')
      }
    }
  }

  if (isEditing) {
    return (
      <RefereeReportForm
        values={values}
        errors={errors}
        pending={postReport.isPending}
        onChange={(key, value) => setValues((v) => ({ ...v, [key]: value }))}
        onSave={() => void handleSave()}
        onCancel={existing ? () => setIsEditing(false) : undefined}
      />
    )
  }

  return (
    <div className="space-y-4">
      <dl className="space-y-3 text-sm">
        {REPORT_FIELDS.filter((f) => values[f.key]).map((f) => (
          <div key={f.key}>
            <dt className="font-medium text-muted-foreground">{f.label}</dt>
            <dd>{values[f.key]}</dd>
          </div>
        ))}
      </dl>
      <Button onClick={() => setIsEditing(true)}>Editar Informe</Button>
    </div>
  )
}
