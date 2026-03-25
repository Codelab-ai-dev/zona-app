"use client"

import { useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Loader2, ImageDown } from "lucide-react"
import { useLeagueById } from "@/lib/queries"
import { toast } from "sonner"

interface CalendarTeam {
  id: string
  name: string
  slug: string
  logo?: string | null
}

interface CalendarMatch {
  id: string
  round: number | null
  homeTeam: CalendarTeam
  awayTeam: CalendarTeam
  date: string
  time: string
  field: number
  status: string
  homeScore?: number | null
  awayScore?: number | null
  byeTeamId?: string | null
  phase?: 'regular' | 'playoffs'
  playoffRound?: 'quarterfinals' | 'semifinals' | 'final' | 'third_place' | null
  playoffPosition?: number | null
  isPublished?: boolean
}

interface MatchPosterGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matches: CalendarMatch[]
  leagueId: string
  tournamentName: string
}

function getTeamInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

function formatDayName(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
  return `${days[date.getDay()]} ${day} DE ${months[date.getMonth()]}`
}

function formatTime(time: string): string {
  return time.substring(0, 5)
}

export function MatchPosterGenerator({ open, onOpenChange, matches, leagueId, tournamentName }: MatchPosterGeneratorProps) {
  const [downloading, setDownloading] = useState(false)
  const [selectedRound, setSelectedRound] = useState<string>('all')
  const posterRef = useRef<HTMLDivElement>(null)
  const { data: league } = useLeagueById(leagueId)

  const scheduledMatches = matches.filter(m => m.status === 'scheduled')

  const availableRounds = useMemo(() => {
    return Array.from(new Set(scheduledMatches.map(m => m.round).filter((r): r is number => r !== null))).sort((a, b) => a - b)
  }, [scheduledMatches])

  const filteredMatches = useMemo(() => {
    if (selectedRound === 'all') return scheduledMatches
    return scheduledMatches.filter(m => m.round === Number(selectedRound))
  }, [scheduledMatches, selectedRound])

  const matchesByDate = filteredMatches.reduce<Record<string, CalendarMatch[]>>((acc, match) => {
    if (!acc[match.date]) acc[match.date] = []
    acc[match.date].push(match)
    return acc
  }, {})

  const sortedDates = Object.keys(matchesByDate).sort()
  const posterTitle = selectedRound === 'all' ? 'PRÓXIMOS PARTIDOS' : `JORNADA ${selectedRound}`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const el = posterRef.current
      if (!el) throw new Error('Poster element not found')

      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;height:5000px;border:none;'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument!
      iframeDoc.open()
      iframeDoc.write(`<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{-webkit-font-smoothing:antialiased;}
table{border-collapse:collapse;border-spacing:0;}
td,th{vertical-align:middle;}
img{display:block;}
</style></head><body></body></html>`)
      iframeDoc.close()

      const clone = el.cloneNode(true) as HTMLDivElement
      iframeDoc.body.appendChild(clone)

      const imgs = clone.querySelectorAll('img')
      await Promise.all(Array.from(imgs).map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res() })
      ))
      await new Promise(r => setTimeout(r, 300))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: 900,
        ...(({ window: iframe.contentWindow! }) as any),
      })

      document.body.removeChild(iframe)

      const link = document.createElement('a')
      const suffix = selectedRound === 'all' ? 'todos' : `jornada-${selectedRound}`
      link.download = `partidos-${tournamentName.replace(/\s+/g, '_')}-${suffix}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Imagen descargada exitosamente')
    } catch (error) {
      console.error('Error descargando poster:', error)
      toast.error('Error al descargar la imagen')
    } finally {
      setDownloading(false)
    }
  }

  // Font stacks — web-safe only, no Google Fonts dependency
  const fontTitle = "Impact, 'Arial Black', Gadget, sans-serif"
  const fontBody = "Verdana, Geneva, Tahoma, sans-serif"

  const posterContent = (
    <div
      ref={posterRef}
      style={{
        width: '900px',
        background: '#0B0F1A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ====== BG LAYERS ====== */}
      {/* Top gradient wash */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '400px',
        background: 'linear-gradient(180deg, #14243A 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Center radial glow */}
      <div style={{
        position: 'absolute', top: '60px', left: '50%', width: '600px', height: '300px',
        marginLeft: '-300px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(34,197,94,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px',
        background: 'linear-gradient(180deg, transparent 0%, #14243A 100%)',
        pointerEvents: 'none',
      }} />

      {/* ====== TOP GOLD BAR ====== */}
      <div style={{
        height: '5px', width: '100%',
        background: 'linear-gradient(90deg, #C59B2C, #F5D76E, #C59B2C)',
      }} />

      {/* ====== HEADER SECTION ====== */}
      <div style={{ padding: '40px 0 30px', textAlign: 'center', position: 'relative' }}>
        {/* League logo */}
        <div style={{
          width: '96px', height: '96px', margin: '0 auto 20px',
          borderRadius: '50%', overflow: 'hidden',
          border: '3px solid #C59B2C',
          background: '#0B0F1A',
        }}>
          {league?.logo ? (
            <img
              src={league.logo}
              alt={league.name || 'Liga'}
              crossOrigin="anonymous"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              style={{
                width: '90px', height: '90px', objectFit: 'contain',
                display: 'block', margin: '0 auto',
              }}
            />
          ) : (
            <div style={{
              width: '90px', height: '90px', lineHeight: '90px',
              textAlign: 'center', fontSize: '30px', fontWeight: 'bold',
              color: '#C59B2C', fontFamily: fontTitle,
            }}>
              {league?.name ? getTeamInitials(league.name) : 'L'}
            </div>
          )}
        </div>

        {/* JORNADA number */}
        <div style={{
          fontFamily: fontTitle, fontSize: '56px', color: '#FFFFFF',
          letterSpacing: '4px', lineHeight: '64px',
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          {posterTitle}
        </div>

        {/* League name */}
        {league?.name && (
          <div style={{
            fontFamily: fontBody, fontSize: '13px', color: '#C59B2C',
            letterSpacing: '3px', textTransform: 'uppercase',
            lineHeight: '22px', marginTop: '6px',
          }}>
            {league.name}
          </div>
        )}

        {/* Separator line */}
        <div style={{
          width: '60px', height: '3px', margin: '18px auto 0',
          background: '#C59B2C', borderRadius: '2px',
        }} />
      </div>

      {/* ====== MATCHES ====== */}
      <div style={{ padding: '0 40px 24px', position: 'relative' }}>
        {sortedDates.map((date) => (
          <div key={date} style={{ marginBottom: '20px' }}>
            {/* Date header */}
            <table cellPadding="0" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <tbody><tr>
                <td style={{
                  verticalAlign: 'middle', padding: '8px 0',
                  fontFamily: fontBody, fontSize: '12px', fontWeight: 'bold',
                  color: '#22C55E', letterSpacing: '2px', lineHeight: '20px',
                  borderBottom: '1px solid rgba(34,197,94,0.25)',
                }}>
                  {formatDayName(date)}
                </td>
              </tr></tbody>
            </table>

            {/* Match rows */}
            {matchesByDate[date].sort((a, b) => a.time.localeCompare(b.time)).map((match, i) => (
              <table
                key={match.id}
                cellPadding="0"
                cellSpacing="0"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '6px',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  tableLayout: 'fixed',
                  overflow: 'hidden',
                }}
              >
                <tbody>
                  <tr>
                    {/* Home team name */}
                    <td style={{
                      width: '280px', verticalAlign: 'middle',
                      textAlign: 'right', padding: '18px 12px 18px 24px',
                      fontFamily: fontBody, fontSize: '14px', fontWeight: 'bold',
                      color: '#FFFFFF', lineHeight: '22px',
                      letterSpacing: '0.5px', textTransform: 'uppercase',
                    }}>
                      {match.homeTeam.name}
                    </td>

                    {/* Home logo */}
                    <td style={{ width: '56px', verticalAlign: 'middle', textAlign: 'center', padding: '10px 0' }}>
                      {match.homeTeam.logo ? (
                        <img
                          src={match.homeTeam.logo} alt={match.homeTeam.name}
                          crossOrigin="anonymous"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          style={{
                            width: '48px', height: '48px', objectFit: 'contain',
                            borderRadius: '50%', display: 'block', margin: '0 auto',
                            background: 'rgba(255,255,255,0.08)',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '48px', height: '48px', lineHeight: '48px',
                          borderRadius: '50%', textAlign: 'center', margin: '0 auto',
                          background: 'rgba(197,155,44,0.15)', border: '2px solid rgba(197,155,44,0.35)',
                          fontFamily: fontBody, fontSize: '13px', fontWeight: 'bold', color: '#C59B2C',
                        }}>
                          {getTeamInitials(match.homeTeam.name)}
                        </div>
                      )}
                    </td>

                    {/* Center: time + VS */}
                    <td style={{
                      width: '128px', verticalAlign: 'middle',
                      textAlign: 'center', padding: '10px 4px',
                    }}>
                      {/* Time pill */}
                      <div style={{
                        fontFamily: fontBody, fontSize: '11px', fontWeight: 'bold',
                        color: '#0B0F1A',
                        background: '#C59B2C', borderRadius: '12px',
                        height: '24px', lineHeight: '24px',
                        padding: '0 12px', display: 'inline-block',
                        letterSpacing: '0.5px', textAlign: 'center',
                      }}>
                        {formatTime(match.time)}
                      </div>
                      {/* VS */}
                      <div style={{
                        fontFamily: fontTitle, fontSize: '20px',
                        color: '#FFFFFF', lineHeight: '28px',
                        marginTop: '2px', letterSpacing: '2px',
                        opacity: '0.4',
                      }}>
                        VS
                      </div>
                      {/* Field */}
                      <div style={{
                        fontFamily: fontBody, fontSize: '10px',
                        color: 'rgba(255,255,255,0.35)', lineHeight: '16px',
                        letterSpacing: '1px',
                      }}>
                        CAMPO {match.field}
                      </div>
                    </td>

                    {/* Away logo */}
                    <td style={{ width: '56px', verticalAlign: 'middle', textAlign: 'center', padding: '10px 0' }}>
                      {match.awayTeam.logo ? (
                        <img
                          src={match.awayTeam.logo} alt={match.awayTeam.name}
                          crossOrigin="anonymous"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          style={{
                            width: '48px', height: '48px', objectFit: 'contain',
                            borderRadius: '50%', display: 'block', margin: '0 auto',
                            background: 'rgba(255,255,255,0.08)',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '48px', height: '48px', lineHeight: '48px',
                          borderRadius: '50%', textAlign: 'center', margin: '0 auto',
                          background: 'rgba(197,155,44,0.15)', border: '2px solid rgba(197,155,44,0.35)',
                          fontFamily: fontBody, fontSize: '13px', fontWeight: 'bold', color: '#C59B2C',
                        }}>
                          {getTeamInitials(match.awayTeam.name)}
                        </div>
                      )}
                    </td>

                    {/* Away team name */}
                    <td style={{
                      width: '280px', verticalAlign: 'middle',
                      textAlign: 'left', padding: '18px 24px 18px 12px',
                      fontFamily: fontBody, fontSize: '14px', fontWeight: 'bold',
                      color: '#FFFFFF', lineHeight: '22px',
                      letterSpacing: '0.5px', textTransform: 'uppercase',
                    }}>
                      {match.awayTeam.name}
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
        ))}
      </div>

      {/* ====== FOOTER ====== */}
      <div style={{ padding: '12px 0 0', textAlign: 'center', position: 'relative' }}>
        {/* Separator */}
        <div style={{
          width: '100%', height: '1px',
          background: 'linear-gradient(90deg, transparent 10%, rgba(197,155,44,0.3) 50%, transparent 90%)',
        }} />
        <div style={{ padding: '20px 0 32px' }}>
          <div style={{
            fontFamily: fontTitle, fontSize: '18px', color: '#C59B2C',
            letterSpacing: '6px', lineHeight: '28px',
            textTransform: 'uppercase',
          }}>
            {tournamentName}
          </div>
        </div>
      </div>

      {/* ====== BOTTOM GOLD BAR ====== */}
      <div style={{
        height: '5px', width: '100%',
        background: 'linear-gradient(90deg, #C59B2C, #F5D76E, #C59B2C)',
      }} />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col backdrop-blur-xl bg-slate-900/95 border-white/10 text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <ImageDown className="w-5 h-5" />
            Generar Imagen de Partidos
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Selecciona la jornada y descarga el poster
          </DialogDescription>
        </DialogHeader>

        {scheduledMatches.length === 0 ? (
          <div className="text-center py-12 text-white/50 px-5">
            No hay partidos programados para generar imagen.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-5 pb-3 shrink-0">
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Seleccionar jornada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las jornadas</SelectItem>
                  {availableRounds.map(round => (
                    <SelectItem key={round} value={String(round)}>
                      Jornada {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className="bg-white/10 text-white/80 border-white/20">
                {filteredMatches.length} {filteredMatches.length === 1 ? 'partido' : 'partidos'}
              </Badge>
            </div>

            {filteredMatches.length === 0 ? (
              <div className="text-center py-8 text-white/50 px-5">
                No hay partidos programados en esta jornada.
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-3">
                  <div className="rounded-lg overflow-hidden border border-white/10" style={{ zoom: 0.58 }}>
                    {posterContent}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-white/10 shrink-0">
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-700 hover:to-amber-600 text-white font-bold border-0 shadow-lg"
                    size="lg"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando imagen...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar PNG
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
