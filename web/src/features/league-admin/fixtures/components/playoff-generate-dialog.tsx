import { Clock, Trophy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tournament } from '@/features/leagues/types'
import { ApiError } from '@/lib/api/client'

import { useGeneratePlayoffs } from '../api'
import type { GeneratePlayoffsRequest } from '../types'

interface PlayoffGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournaments: Tournament[]
  tournamentId: string
  onTournamentChange: (id: string) => void
  title: string
  description: string
}

/** Form that asks the API to generate the playoff bracket. */
export function PlayoffGenerateDialog({
  open,
  onOpenChange,
  tournaments,
  tournamentId,
  onTournamentChange,
  title,
  description,
}: PlayoffGenerateDialogProps) {
  const [numTeams, setNumTeams] = useState<'4' | '8'>('8')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [fieldNumber, setFieldNumber] = useState('1')
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(true)
  const [homeAndAway, setHomeAndAway] = useState(false)

  const generatePlayoffs = useGeneratePlayoffs()

  const [errors, setErrors] = useState<Record<string, string>>({})
  const clearError = (field: string) =>
    setErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  const errorProps = (field: string) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })
  const errorText = (field: string) =>
    errors[field] ? (
      <p id={`${field}-error`} className="text-xs text-red-300">
        {errors[field]}
      </p>
    ) : null

  const handleGenerate = async () => {
    if (!tournamentId) return

    const req: GeneratePlayoffsRequest = {
      tournament_id: tournamentId,
      num_teams: parseInt(numTeams, 10) as 4 | 8,
      start_date: startDate,
      start_time: startTime,
      field_number: parseInt(fieldNumber, 10) || 0,
      third_place_match: thirdPlaceMatch,
      home_and_away: homeAndAway,
    }

    try {
      await generatePlayoffs.mutateAsync(req)
      setErrors({})
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) setErrors(err.fields)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-white/20 bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white drop-shadow-lg">
            <Trophy className="h-6 w-6 text-yellow-300" aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-white/80 drop-shadow">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tournament-select" className="text-white/90 drop-shadow">
              Torneo
            </Label>
            <Select value={tournamentId} onValueChange={onTournamentChange}>
              <SelectTrigger
                id="tournament-select"
                className="w-full border-white/30 bg-white/10 text-white backdrop-blur-md"
                {...errorProps('tournament_id')}
              >
                <SelectValue placeholder="Elige un torneo" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorText('tournament_id')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="num-teams" className="text-white/90 drop-shadow">
                Equipos
              </Label>
              <Select value={numTeams} onValueChange={(v) => setNumTeams(v as '4' | '8')}>
                <SelectTrigger
                  id="num-teams"
                  className="w-full border-white/30 bg-white/10 text-white backdrop-blur-md"
                  {...errorProps('num_teams')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 equipos</SelectItem>
                  <SelectItem value="8">8 equipos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-white/90 drop-shadow">
                Inicio
              </Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  clearError('start_date')
                }}
                className="border-white/30 bg-white/10 text-white backdrop-blur-md"
                {...errorProps('start_date')}
              />
              {errorText('start_date')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_time" className="flex items-center gap-1 text-white/90 drop-shadow">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Hora
              </Label>
              <Input
                id="start_time"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  clearError('start_time')
                }}
                className="border-white/30 bg-white/10 text-white backdrop-blur-md"
                {...errorProps('start_time')}
              />
              {errorText('start_time')}
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_number" className="text-white/90 drop-shadow">
                Cancha
              </Label>
              <Input
                id="field_number"
                type="number"
                min="1"
                value={fieldNumber}
                onChange={(e) => {
                  setFieldNumber(e.target.value)
                  clearError('field_number')
                }}
                className="border-white/30 bg-white/10 text-white backdrop-blur-md"
                {...errorProps('field_number')}
              />
              {errorText('field_number')}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="third-place"
                checked={thirdPlaceMatch}
                onCheckedChange={(checked) => setThirdPlaceMatch(Boolean(checked))}
              />
              <Label htmlFor="third-place" className="cursor-pointer font-normal text-white/90">
                Partido por tercer lugar
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="home-away"
                checked={homeAndAway}
                onCheckedChange={(checked) => setHomeAndAway(Boolean(checked))}
              />
              <Label htmlFor="home-away" className="cursor-pointer font-normal text-white/90">
                Ida y vuelta
              </Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generatePlayoffs.isPending || !tournamentId || !startDate}
              className="flex-1 bg-green-500 text-white hover:bg-green-600"
            >
              {generatePlayoffs.isPending ? 'Generando…' : 'Generar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
