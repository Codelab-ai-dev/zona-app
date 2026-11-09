import { AlertCircle, Edit, Loader2, ShieldCheck, Trophy, UserCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api/client'

import { useCreateTournament, useUpdateTournament, type TournamentInput } from '../api'
import type { Tournament } from '../types'

type Format = Tournament['tournament_format']

const labelClass = 'text-gray-400 text-[10px] md:text-xs mb-1.5 block'
const inputClass = 'h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm'
const triggerClass = 'h-9 bg-slate-800/50 border-white/10 text-white text-sm'
const hintClass = 'text-[10px] text-gray-500 mt-1'
const formatHint: Record<Format, string> = {
  league: 'Los equipos se enfrentan en formato round-robin',
  knockout: 'Eliminación simple, el perdedor queda eliminado',
  group_knockout: 'Estilo Mundial: fase de grupos seguida de eliminatorias',
}

const str = (n: number | undefined) => (n === undefined || n === null ? '' : String(n))
const num = (s: string) => (s.trim() === '' ? undefined : Number(s))

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-400 mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

export function TournamentForm({ leagueId, tournament, onClose }: { leagueId: string; tournament?: Tournament; onClose: () => void }) {
  const [form, setForm] = useState({
    name: tournament?.name ?? '',
    start_date: tournament?.start_date.slice(0, 10) ?? '',
    end_date: tournament?.end_date.slice(0, 10) ?? '',
    max_players: str(tournament?.max_players),
    max_coaching_staff: tournament ? str(tournament.max_coaching_staff) || '10' : '10',
    tournament_format: tournament?.tournament_format ?? ('league' as Format),
    rounds_per_season: tournament?.rounds_per_season ?? 2,
    number_of_groups: str(tournament?.number_of_groups) || '4',
    teams_advancing_per_group: str(tournament?.teams_advancing_per_group) || '2',
    has_third_place_match: tournament?.has_third_place_match ?? false,
    age_validation_enabled: tournament?.age_validation_enabled ?? false,
    min_age: str(tournament?.min_age),
    max_age: str(tournament?.max_age),
    age_reference_date: tournament?.age_reference_date?.slice(0, 10) ?? '',
    age_exception_count: str(tournament?.age_exception_count) || '0',
    age_exception_min_age: str(tournament?.age_exception_min_age),
    age_exception_max_age: str(tournament?.age_exception_max_age),
    id_document_required: tournament?.id_document_required ?? false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))
  const text = (key: 'name' | 'max_players' | 'max_coaching_staff' | 'min_age' | 'max_age' | 'age_exception_count' | 'age_exception_min_age' | 'age_exception_max_age' | 'start_date' | 'end_date' | 'age_reference_date') => ({
    id: key,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value),
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
    disabled: isPending,
  })

  const create = useCreateTournament()
  const update = useUpdateTournament(tournament?.id ?? '')
  const isPending = create.isPending || update.isPending
  const isKnockout = form.tournament_format !== 'league'

  const payload = (): TournamentInput => {
    const data: TournamentInput = {
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      tournament_format: form.tournament_format,
      rounds_per_season: form.rounds_per_season,
      is_active: tournament?.is_active ?? true,
    }
    const optional: TournamentInput = {
      max_players: num(form.max_players),
      max_coaching_staff: num(form.max_coaching_staff),
    }
    if (form.tournament_format === 'group_knockout') {
      optional.number_of_groups = Number(form.number_of_groups)
      optional.teams_advancing_per_group = Number(form.teams_advancing_per_group)
    }
    if (isKnockout && form.has_third_place_match !== (tournament?.has_third_place_match ?? false)) optional.has_third_place_match = form.has_third_place_match
    if (form.age_validation_enabled !== (tournament?.age_validation_enabled ?? false)) optional.age_validation_enabled = form.age_validation_enabled
    if (form.age_validation_enabled) {
      Object.assign(optional, {
        min_age: num(form.min_age),
        max_age: num(form.max_age),
        age_reference_date: form.age_reference_date || undefined,
        age_exception_count: num(form.age_exception_count),
        age_exception_min_age: num(form.age_exception_min_age),
        age_exception_max_age: num(form.age_exception_max_age),
      })
    }
    if (form.id_document_required !== (tournament?.id_document_required ?? false)) optional.id_document_required = form.id_document_required
    return { ...data, ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }
    try {
      if (tournament) await update.mutateAsync(payload())
      else await create.mutateAsync({ ...payload(), league_id: leagueId })
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setErrors(err.fields)
    }
  }

  const failure = create.error ?? update.error
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-lg bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white text-sm md:text-base">
            {tournament ? <Edit className="w-4 h-4 mr-2 text-blue-400" aria-hidden="true" /> : <Trophy className="w-4 h-4 mr-2 text-yellow-400" aria-hidden="true" />}
            {tournament ? 'Editar Torneo' : 'Crear Nuevo Torneo'}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">
            {tournament ? 'Modifica la información del torneo' : 'Completa la información para crear un nuevo torneo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {failure ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{failure instanceof Error ? failure.message : 'Error al guardar'}</AlertDescription>
            </Alert>
          ) : null}
          <Field id="name" label="Nombre del Torneo" error={errors.name}>
            <Input {...text('name')} placeholder="Temporada 2026 - Apertura" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field id="start_date" label="Fecha de Inicio" error={errors.start_date}>
              <Input {...text('start_date')} type="date" className={inputClass} />
            </Field>
            <Field id="end_date" label="Fecha de Fin" error={errors.end_date}>
              <Input {...text('end_date')} type="date" className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field id="max_players" label="Límite Jugadores" error={errors.max_players}>
              <Input {...text('max_players')} type="number" min="1" placeholder="Sin límite" className={inputClass} />
            </Field>
            <Field id="max_coaching_staff" label="Límite Cuerpo Técnico" error={errors.max_coaching_staff}>
              <Input {...text('max_coaching_staff')} type="number" min="1" max="20" placeholder="10" className={inputClass} />
            </Field>
          </div>
          <Field id="tournament_format" label="Formato del Torneo">
            <Select value={form.tournament_format} onValueChange={(v: Format) => set('tournament_format', v)} disabled={isPending}>
              <SelectTrigger id="tournament_format" className={triggerClass}>
                <SelectValue placeholder="Selecciona el formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="league">Liga (Todos contra Todos)</SelectItem>
                <SelectItem value="knockout">Eliminación Directa</SelectItem>
                <SelectItem value="group_knockout">Fase de Grupos + Eliminación</SelectItem>
              </SelectContent>
            </Select>
            <p className={hintClass}>{formatHint[form.tournament_format]}</p>
          </Field>

          {form.tournament_format === 'league' && (
            <Field id="rounds_per_season" label="Vueltas">
              <Select value={String(form.rounds_per_season)} onValueChange={(v) => set('rounds_per_season', parseInt(v, 10))} disabled={isPending}>
                <SelectTrigger id="rounds_per_season" className={triggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Una vuelta (todos vs todos)</SelectItem>
                  <SelectItem value="2">Dos vueltas (ida y vuelta)</SelectItem>
                  <SelectItem value="3">Tres vueltas</SelectItem>
                  <SelectItem value="4">Cuatro vueltas</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.tournament_format === 'group_knockout' && (
            <div className="grid grid-cols-2 gap-2">
              <Field id="number_of_groups" label="Número de Grupos">
                <Select value={form.number_of_groups} onValueChange={(v) => set('number_of_groups', v)} disabled={isPending}>
                  <SelectTrigger id="number_of_groups" className={triggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} grupos</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="teams_advancing_per_group" label="Equipos que avanzan">
                <Select value={form.teams_advancing_per_group} onValueChange={(v) => set('teams_advancing_per_group', v)} disabled={isPending}>
                  <SelectTrigger id="teams_advancing_per_group" className={triggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'equipo' : 'equipos'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {isKnockout && (
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/30">
              <Checkbox id="has_third_place_match" checked={form.has_third_place_match} onCheckedChange={(c) => set('has_third_place_match', c === true)} className="border-white/20" />
              <Label htmlFor="has_third_place_match" className="cursor-pointer text-gray-300 text-xs md:text-sm">
                Incluir partido por el tercer lugar
              </Label>
            </div>
          )}

          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" aria-hidden="true" />
                <Label htmlFor="age_validation_enabled" className="text-gray-300 text-xs md:text-sm font-medium">Validación de Edad</Label>
              </div>
              <Switch id="age_validation_enabled" checked={form.age_validation_enabled} onCheckedChange={(c) => set('age_validation_enabled', c)} />
            </div>
            {form.age_validation_enabled && (
              <div className="space-y-3 pl-6 border-l-2 border-blue-500/30">
                <div className="grid grid-cols-2 gap-2">
                  <Field id="min_age" label="Edad Mínima" error={errors.min_age}>
                    <Input {...text('min_age')} type="number" min="1" max="99" placeholder="Ej: 40" className={inputClass} />
                  </Field>
                  <Field id="max_age" label="Edad Máxima" error={errors.max_age}>
                    <Input {...text('max_age')} type="number" min="1" max="99" placeholder="Sin límite" className={inputClass} />
                  </Field>
                </div>
                <Field id="age_reference_date" label="Fecha de Referencia">
                  <Input {...text('age_reference_date')} type="date" className={inputClass} />
                  <p className={hintClass}>Fecha para calcular la edad de los jugadores (por defecto: inicio del torneo)</p>
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field id="age_exception_count" label="Excepciones">
                    <Input {...text('age_exception_count')} type="number" min="0" max="10" placeholder="0" className={inputClass} />
                  </Field>
                  <Field id="age_exception_min_age" label="Edad Mín. Exc.">
                    <Input {...text('age_exception_min_age')} type="number" min="1" max="99" placeholder="Ej: 37" className={inputClass} />
                  </Field>
                  <Field id="age_exception_max_age" label="Edad Máx. Exc.">
                    <Input {...text('age_exception_max_age')} type="number" min="1" max="99" placeholder="Sin límite" className={inputClass} />
                  </Field>
                </div>
                <p className="text-[10px] text-gray-500">Número de jugadores que pueden registrarse fuera del rango de edad principal</p>
              </div>
            )}
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/30 mt-3">
              <Switch id="id_document_required" checked={form.id_document_required} onCheckedChange={(c) => set('id_document_required', c)} />
              <Label htmlFor="id_document_required" className="cursor-pointer text-gray-300 text-xs md:text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-400" aria-hidden="true" />
                Requerir INE para registro
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full h-10 bg-green-500 hover:bg-green-600 text-white text-sm" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                {tournament ? 'Actualizando…' : 'Creando…'}
              </>
            ) : tournament ? (
              'Actualizar Torneo'
            ) : (
              'Crear Torneo'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
