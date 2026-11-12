import type { CoachingStaff, Player, Team, TeamPlayerStats } from '../types'

/** Escape every user-provided string before it goes into print HTML. */
export function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

/** Only http(s) and data images may be printed. */
function safeUrl(url: string | undefined): string {
  return url && /^(https?:|data:image\/|\/)/i.test(url) ? escapeHtml(url) : ''
}

const cell = 'padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:12px;'

function avatar(name: string, photo: string | undefined, bg: string, fg: string): string {
  const src = safeUrl(photo)
  const base = 'width:32px;height:32px;border-radius:50%;border:1px solid #e2e8f0;'
  return src
    ? `<img src="${src}" alt="${escapeHtml(name)}" style="${base}object-fit:cover;" crossorigin="anonymous" />`
    : `<div style="${base}background:${bg};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:${fg};">${escapeHtml(initialsOf(name))}</div>`
}

const ROSTER_CSS = `
@page { size: A4; margin: 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; background: white; color: #1e293b; padding: 20px; }
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0066cc; }
.header h1 { font-size: 22px; color: #0066cc; }
.header p { font-size: 12px; color: #64748b; margin-top: 2px; }
.section { margin-bottom: 24px; }
.section-title { font-size: 15px; font-weight: bold; margin-bottom: 10px; padding: 6px 12px; background: #f1f5f9; border-left: 4px solid #0066cc; }
.section-title.staff { border-left-color: #9333ea; }
table { width: 100%; border-collapse: collapse; }
th { padding: 8px; text-align: center; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; background: #f8fafc; }
th:nth-child(2) { text-align: left; }
.summary { margin-top: 4px; font-size: 11px; color: #64748b; }
.summary span { font-weight: 600; color: #1e293b; }
.footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
@media print { body { padding: 0; } .section { break-inside: avoid; } }
`

/** Printable roster: players with stats and coaching staff. */
export function buildRosterHtml(opts: {
  team: Team
  players: TeamPlayerStats[]
  staff: CoachingStaff[]
  date?: Date
}): string {
  const { team, players, staff } = opts
  const date = (opts.date ?? new Date()).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  const logo = safeUrl(team.logo)
  const sum = (key: 'goals' | 'assists' | 'yellow_cards' | 'red_cards') => players.reduce((t, p) => t + p[key], 0)

  const playerRows = players
    .map(
      (p, i) => `<tr>
<td style="${cell}color:#64748b;">${i + 1}</td>
<td style="${cell}text-align:left;"><div style="display:flex;align-items:center;gap:8px;">${avatar(p.name, p.photo, '#f1f5f9', '#64748b')}<span style="font-size:13px;font-weight:500;">${escapeHtml(p.name)}</span></div></td>
<td style="${cell}font-size:13px;font-weight:bold;color:#0066cc;">${escapeHtml(p.jersey_number)}</td>
<td style="${cell}color:#64748b;">${escapeHtml(p.position || '-')}</td>
<td style="${cell}">${p.matches_played}</td>
<td style="${cell}color:#16a34a;font-weight:600;">${p.goals}</td>
<td style="${cell}color:#2563eb;font-weight:600;">${p.assists}</td>
<td style="${cell}color:#eab308;">${p.yellow_cards}</td>
<td style="${cell}color:#dc2626;">${p.red_cards}</td>
</tr>`,
    )
    .join('')

  const staffRows = staff
    .map(
      (s, i) => `<tr>
<td style="${cell}color:#64748b;">${i + 1}</td>
<td style="${cell}text-align:left;"><div style="display:flex;align-items:center;gap:8px;">${avatar(s.name, s.photo, '#f5f3ff', '#7c3aed')}<span style="font-size:13px;font-weight:500;">${escapeHtml(s.name)}</span></div></td>
<td style="${cell}color:#7c3aed;font-weight:600;">${escapeHtml(s.role || 'Staff')}</td>
</tr>`,
    )
    .join('')

  const playersSection = players.length
    ? `<div class="section"><div class="section-title">Jugadores (${players.length})</div>
<table><thead><tr><th style="width:30px;">#</th><th>Jugador</th><th style="width:50px;">No.</th><th style="width:80px;">Posición</th><th style="width:40px;">PJ</th><th style="width:40px;">G</th><th style="width:40px;">A</th><th style="width:40px;">TA</th><th style="width:40px;">TR</th></tr></thead><tbody>${playerRows}</tbody></table>
<div class="summary">Total goles: <span>${sum('goals')}</span> | Total asistencias: <span>${sum('assists')}</span> | Total TA: <span>${sum('yellow_cards')}</span> | Total TR: <span>${sum('red_cards')}</span></div></div>`
    : ''
  const staffSection = staff.length
    ? `<div class="section"><div class="section-title staff">Cuerpo Técnico (${staff.length})</div>
<table><thead><tr><th style="width:30px;">#</th><th>Nombre</th><th>Cargo</th></tr></thead><tbody>${staffRows}</tbody></table></div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Plantilla - ${escapeHtml(team.name)}</title><style>${ROSTER_CSS}</style></head><body>
<div class="header">${logo ? `<img src="${logo}" alt="Logo ${escapeHtml(team.name)}" style="width:40px;height:40px;object-fit:contain;" crossorigin="anonymous" />` : ''}<div><h1>${escapeHtml(team.name)}</h1><p>Plantilla de equipo - ${escapeHtml(date)}</p></div></div>
${playersSection}${staffSection}
<div class="footer">Zona Gol</div></body></html>`
}

const CREDENTIAL_CSS = `
body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
.credential { width: 85.6mm; height: 53.98mm; border: 2px solid #0066cc; border-radius: 8px; padding: 8px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); margin: 0 auto 12px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
.team-header { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 2px; }
.team-logo { width: 24px; height: 24px; object-fit: contain; }
.team-name { font-size: 14px; font-weight: bold; color: #0066cc; margin: 0; line-height: 1; }
.content { display: flex; align-items: center; gap: 6px; flex: 1; min-height: 90px; }
.player-photo { flex-shrink: 0; width: 60px; height: 75px; background: white; border: 2px solid #cbd5e1; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.player-photo img { width: 100%; height: 100%; object-fit: cover; }
.player-photo-placeholder { width: 100%; height: 100%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #64748b; }
.player-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; height: 100%; }
.player-name { font-size: 13px; font-weight: bold; color: #1e293b; margin: 0 0 2px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.player-position { font-size: 12px; color: #64748b; margin: 0 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.jersey-number { font-size: 20px; font-weight: bold; color: #0066cc; background: white; border: 3px solid #0066cc; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.qr-container { flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 4px; border: 2px solid #e2e8f0; width: 90px; height: 90px; }
.footer { text-align: center; margin-top: 4px; }
.credential-id { font-size: 8px; color: #64748b; margin: 0; font-weight: 500; }
.valid-text { font-size: 9px; color: #0066cc; margin: 1px 0 0; font-weight: bold; letter-spacing: 0.5px; }
@media print { body { margin: 0; padding: 10px; } }
`

/** Uppercase and strip accents, like the mobile apps' credential screen. */
function normalizeQrName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
}

/** Same JSON the mobile apps generate and parse for player verification. */
export function buildPlayerQrPayload(player: Player, leagueId: string | undefined, now: Date = new Date()): string {
  return JSON.stringify({
    type: 'player_verification',
    player_id: player.id,
    player_name: normalizeQrName(player.name),
    team_id: player.team_id,
    jersey_number: player.jersey_number,
    ...(leagueId ? { league_id: leagueId } : {}),
    timestamp: now.toISOString(),
    version: '1.0',
  })
}

/** One printable document with every player's credential. `qrSvgs` is parallel to `players`. */
export function buildCredentialsHtml(opts: { team: Team; players: Player[]; qrSvgs: string[] }): string {
  const { team, players, qrSvgs } = opts
  const logo = safeUrl(team.logo)
  const cards = players
    .map((p, i) => {
      const photo = safeUrl(p.photo)
      const photoHtml = photo
        ? `<img src="${photo}" alt="${escapeHtml(p.name)}" crossorigin="anonymous" />`
        : `<div class="player-photo-placeholder">${escapeHtml(initialsOf(p.name))}</div>`
      return `<div class="credential">
<div class="team-header">${logo ? `<img src="${logo}" alt="Logo ${escapeHtml(team.name)}" class="team-logo" crossorigin="anonymous" />` : ''}<h3 class="team-name">${escapeHtml(team.name.toUpperCase())}</h3></div>
<div class="content"><div class="player-photo">${photoHtml}</div>
<div class="player-info"><h4 class="player-name">${escapeHtml(p.name)}</h4><p class="player-position">${escapeHtml(p.position)}</p><div class="jersey-number">${escapeHtml(p.jersey_number)}</div></div>
<div class="qr-container">${qrSvgs[i] ?? ''}</div></div>
<div class="footer"><p class="credential-id">ID: ${escapeHtml(p.id.slice(-8).toUpperCase())}</p><p class="valid-text">CREDENCIAL OFICIAL</p></div>
</div>`
    })
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Credenciales - ${escapeHtml(team.name)}</title><style>${CREDENTIAL_CSS}</style></head><body>${cards}</body></html>`
}

/** Opens a print window with `html` and prints once loaded. Returns false if blocked. */
export function printHtml(html: string): boolean {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  w.onload = () => {
    w.print()
    w.close()
  }
  return true
}
