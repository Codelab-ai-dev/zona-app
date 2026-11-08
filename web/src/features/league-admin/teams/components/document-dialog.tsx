import { CheckCircle, CreditCard } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorState, LoadingState } from '@/components/states'

import type { LeaguePlayerVerification } from '../types'
import { useDocumentUrl } from '../verification-api'

interface Props {
  row: LeaguePlayerVerification
  onClose: () => void
  onApprove: (row: LeaguePlayerVerification) => void
}

const isPdf = (key: string) => key.toLowerCase().endsWith('.pdf')

/** ID document viewer: image inline, PDF in an iframe (+ link). Uses the presigned URL only. */
export function DocumentDialog({ row, onClose, onApprove }: Props) {
  const key = row.document_key
  const urlQuery = useDocumentUrl(key)
  const url = urlQuery.data?.url

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border-white/10 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CreditCard className="h-5 w-5 text-purple-400" aria-hidden="true" />
            Documento de Identidad
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {row.name} - {row.team_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {urlQuery.isPending && <LoadingState label="Cargando documento…" />}
          {urlQuery.isError && <ErrorState error={urlQuery.error} onRetry={() => void urlQuery.refetch()} />}
          {url && key && (
            <div className="overflow-hidden rounded-lg border border-white/20">
              {isPdf(key) ? (
                <iframe src={url} title={`Documento de ${row.name}`} className="h-96 w-full bg-white" />
              ) : (
                <img src={url} alt={`Documento de identidad de ${row.name}`} className="h-auto max-h-96 w-full bg-black/50 object-contain" />
              )}
            </div>
          )}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 underline">
              Abrir en una pestaña nueva
            </a>
          )}
          <div className="flex justify-end gap-2">
            {row.status === 'pending' && (
              <Button className="border-0 bg-green-500/80 text-white hover:bg-green-500/90" onClick={() => onApprove(row)}>
                <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Aprobar Verificación
              </Button>
            )}
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
