import type { Ref } from 'react'

import type { MatchWithRelations } from '../types'
import { FONT_BODY, FONT_TITLE, PosterMatchRow } from './poster-match-row'

function formatDayName(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  const year = parts[0] ?? 2024
  const month = (parts[1] ?? 1) - 1
  const day = parts[2] ?? 1
  const date = new Date(year, month, day)
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
  const months = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ]
  return `${days[date.getDay()]} ${day} DE ${months[date.getMonth()]}`
}

interface PosterCanvasProps {
  posterRef: Ref<HTMLDivElement>
  title: string
  tournamentName: string
  matchesByDate: Record<string, MatchWithRelations[]>
  sortedDates: string[]
}

/** The poster markup that gets rasterized to PNG (inline styles on purpose). */
export function PosterCanvas({ posterRef, title: posterTitle, tournamentName, matchesByDate, sortedDates }: PosterCanvasProps) {
  const fontTitle = FONT_TITLE
  const fontBody = FONT_BODY
  return (
    <div
      ref={posterRef}
      style={{
        width: '900px',
        background: '#0B0F1A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top gradient wash */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '400px',
          background: 'linear-gradient(180deg, #14243A 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top gold bar */}
      <div
        style={{
          height: '5px',
          width: '100%',
          background: 'linear-gradient(90deg, #C59B2C, #F5D76E, #C59B2C)',
        }}
      />

      {/* Header */}
      <div style={{ padding: '40px 0 30px', textAlign: 'center', position: 'relative' }}>
        <div
          style={{
            fontFamily: fontTitle,
            fontSize: '56px',
            color: '#FFFFFF',
            letterSpacing: '4px',
            lineHeight: '64px',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          {posterTitle}
        </div>

        <div
          style={{
            fontFamily: fontBody,
            fontSize: '13px',
            color: '#C59B2C',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            lineHeight: '22px',
            marginTop: '6px',
          }}
        >
          {tournamentName}
        </div>

        <div
          style={{
            width: '60px',
            height: '3px',
            margin: '18px auto 0',
            background: '#C59B2C',
            borderRadius: '2px',
          }}
        />
      </div>

      {/* Matches */}
      <div style={{ padding: '0 40px 24px', position: 'relative' }}>
        {sortedDates.map((date) => (
          <div key={date} style={{ marginBottom: '20px' }}>
            <table cellPadding="0" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      verticalAlign: 'middle',
                      padding: '8px 0',
                      fontFamily: fontBody,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#22C55E',
                      letterSpacing: '2px',
                      lineHeight: '20px',
                      borderBottom: '1px solid rgba(34,197,94,0.25)',
                    }}
                  >
                    {formatDayName(date)}
                  </td>
                </tr>
              </tbody>
            </table>

            {matchesByDate[date]!
              .sort((a, b) => (a.match_time || '').localeCompare(b.match_time || ''))
              .map((match, i) => (
                <PosterMatchRow key={match.id} match={match} index={i} />
              ))}
          </div>
        ))}
      </div>

      {/* Bottom gold bar */}
      <div
        style={{
          height: '5px',
          width: '100%',
          background: 'linear-gradient(90deg, #C59B2C, #F5D76E, #C59B2C)',
        }}
      />
    </div>
  )
}
