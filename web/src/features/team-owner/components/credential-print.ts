import type { Player } from '../types'

const CSS = `
body {
  margin: 0;
  padding: 20px;
  font-family: Arial, sans-serif;
  background: white;
}
.credential {
  width: 85.6mm;
  height: 53.98mm;
  border: 2px solid #0066cc;
  border-radius: 8px;
  padding: 8px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.header {
  text-align: center;
  margin-bottom: 4px;
}
.team-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 2px;
}
.team-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
.team-name {
  font-size: 14px;
  font-weight: bold;
  color: #0066cc;
  margin: 0;
  line-height: 1;
}
.content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-height: 90px;
}
.player-photo {
  flex-shrink: 0;
  width: 60px;
  height: 75px;
  background: white;
  border: 2px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.player-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.player-photo-placeholder {
  width: 100%;
  height: 100%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: #64748b;
}
.player-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}
.player-name {
  font-size: 13px;
  font-weight: bold;
  color: #1e293b;
  margin: 0 0 2px 0;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player-position {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}
.jersey-number {
  font-size: 20px;
  font-weight: bold;
  color: #0066cc;
  background: white;
  border: 3px solid #0066cc;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  align-self: flex-start;
}
.qr-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
  padding: 4px;
  border: 2px solid #e2e8f0;
  width: 90px;
  height: 90px;
}
.footer {
  text-align: center;
  margin-top: 4px;
}
.credential-id {
  font-size: 8px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}
.valid-text {
  font-size: 9px;
  color: #0066cc;
  margin: 1px 0 0 0;
  font-weight: bold;
  letter-spacing: 0.5px;
}
@media print {
  body { margin: 0; padding: 10px; }
  .credential { margin: 0; }
}
`

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function getPlayerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Standalone printable credential document. `qrSvg` is the serialized QR <svg>. */
export function buildCredentialPrintHtml(opts: {
  player: Player
  teamName: string
  teamLogo?: string
  qrSvg: string
  /** Staff credentials have no jersey number. */
  showJersey?: boolean
}): string {
  const { player, teamName, teamLogo, qrSvg, showJersey = true } = opts
  const name = escapeHtml(player.name)
  const photoHTML = player.photo
    ? `<img src="${escapeHtml(player.photo)}" alt="${name}" crossorigin="anonymous" />`
    : `<div class="player-photo-placeholder">${escapeHtml(getPlayerInitials(player.name))}</div>`
  const logoHTML = teamLogo
    ? `<img src="${escapeHtml(teamLogo)}" alt="Logo ${escapeHtml(teamName)}" class="team-logo" crossorigin="anonymous" />`
    : ''

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Credencial - ${name}</title>
    <style>${CSS}</style>
  </head>
  <body>
    <div class="credential">
      <div class="header">
        <div class="team-header">
          ${logoHTML}
          <h3 class="team-name">${escapeHtml(teamName.toUpperCase())}</h3>
        </div>
      </div>
      <div class="content">
        <div class="player-photo">${photoHTML}</div>
        <div class="player-info">
          <h4 class="player-name">${name}</h4>
          <p class="player-position">${escapeHtml(player.position)}</p>
          ${showJersey ? `<div class="jersey-number">${player.jersey_number}</div>` : ''}
        </div>
        <div class="qr-container">${qrSvg}</div>
      </div>
      <div class="footer">
        <p class="credential-id">ID: ${escapeHtml(player.id.slice(-8).toUpperCase())}</p>
        <p class="valid-text">CREDENCIAL OFICIAL</p>
      </div>
    </div>
  </body>
</html>`
}
