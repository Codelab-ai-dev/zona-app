import type { MatchWithRelations } from '../types'

export const FONT_TITLE = "Impact, 'Arial Black', Gadget, sans-serif"
export const FONT_BODY = 'Verdana, Geneva, Tahoma, sans-serif'

function getTeamInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

export function formatTime(time: string | undefined): string {
  if (!time) return '00:00'
  return time.substring(0, 5)
}

/** One match row of the poster (rendered to an image, so inline styles on purpose). */
export function PosterMatchRow({ match, index }: { match: MatchWithRelations; index: number }) {
  const fontTitle = FONT_TITLE
  const fontBody = FONT_BODY
  const i = index
  return (
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
              <td
                style={{
                  width: '280px',
                  verticalAlign: 'middle',
                  textAlign: 'right',
                  padding: '18px 12px 18px 24px',
                  fontFamily: fontBody,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  lineHeight: '22px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {match.home_team_name}
              </td>
    
              <td style={{ width: '56px', verticalAlign: 'middle', textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    lineHeight: '48px',
                    borderRadius: '50%',
                    textAlign: 'center',
                    margin: '0 auto',
                    background: 'rgba(197,155,44,0.15)',
                    border: '2px solid rgba(197,155,44,0.35)',
                    fontFamily: fontBody,
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#C59B2C',
                  }}
                >
                  {getTeamInitials(match.home_team_name)}
                </div>
              </td>
    
              <td
                style={{
                  width: '128px',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  padding: '10px 4px',
                }}
              >
                <div
                  style={{
                    fontFamily: fontBody,
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#0B0F1A',
                    background: '#C59B2C',
                    borderRadius: '12px',
                    height: '24px',
                    lineHeight: '24px',
                    padding: '0 12px',
                    display: 'inline-block',
                    letterSpacing: '0.5px',
                    textAlign: 'center',
                  }}
                >
                  {formatTime(match.match_time)}
                </div>
                <div
                  style={{
                    fontFamily: fontTitle,
                    fontSize: '20px',
                    color: '#FFFFFF',
                    lineHeight: '28px',
                    marginTop: '2px',
                    letterSpacing: '2px',
                    opacity: '0.4',
                  }}
                >
                  VS
                </div>
                <div
                  style={{
                    fontFamily: fontBody,
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.35)',
                    lineHeight: '16px',
                    letterSpacing: '1px',
                  }}
                >
                  CAMPO {match.field_number || '-'}
                </div>
              </td>
    
              <td style={{ width: '56px', verticalAlign: 'middle', textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    lineHeight: '48px',
                    borderRadius: '50%',
                    textAlign: 'center',
                    margin: '0 auto',
                    background: 'rgba(197,155,44,0.15)',
                    border: '2px solid rgba(197,155,44,0.35)',
                    fontFamily: fontBody,
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#C59B2C',
                  }}
                >
                  {getTeamInitials(match.away_team_name)}
                </div>
              </td>
    
              <td
                style={{
                  width: '280px',
                  verticalAlign: 'middle',
                  textAlign: 'left',
                  padding: '18px 24px 18px 12px',
                  fontFamily: fontBody,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  lineHeight: '22px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {match.away_team_name}
              </td>
            </tr>
          </tbody>
        </table>
  )
}
