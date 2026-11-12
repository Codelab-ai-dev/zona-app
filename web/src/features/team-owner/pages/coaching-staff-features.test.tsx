import { screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TEAM_ID, TOURNAMENT_ID, leagueWithQr, listBody, staffMember, team, tournament } from '../test-fixtures'
import { CoachingStaffPage } from './coaching-staff-page'

// Capture what the QR encodes instead of decoding an SVG.
vi.mock('react-qr-code', () => ({ default: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} /> }))

const LIST = `GET /teams/${TEAM_ID}/coaching-staff`
const CREATE = `POST /teams/${TEAM_ID}/coaching-staff`
const base = { [`GET /teams/${TEAM_ID}`]: { body: team }, [`GET /tournaments/${TOURNAMENT_ID}`]: { body: tournament } }
const inactive = { ...staffMember, id: 'staff-2', name: 'Rosa Díaz', is_active: false }

function renderPage() {
  return renderWithProviders(<CoachingStaffPage teamId={TEAM_ID} />)
}

describe('CoachingStaffPage edit', () => {
  it('prefills the member and PATCHes the changes to /coaching-staff/{id}', async () => {
    const fetchMock = mockApi({ ...base, [LIST]: listBody([{ ...staffMember, cedula: '555', birth_date: '1980-03-04T00:00:00Z' }]), 'PATCH /coaching-staff/staff-1': { body: staffMember } })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Editar a Carlos García' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Nombre Completo')).toHaveValue('Carlos García')
    expect(within(dialog).getByLabelText('Cédula / DNI (opcional)')).toHaveValue('555')
    expect(within(dialog).getByLabelText('Fecha de Nacimiento (opcional)')).toHaveValue('1980-03-04')
    await user.clear(within(dialog).getByLabelText('Cédula / DNI (opcional)'))
    await user.type(within(dialog).getByLabelText('Cédula / DNI (opcional)'), '999')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('Cuerpo técnico actualizado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /coaching-staff/staff-1')).toEqual([
      { name: 'Carlos García', role: 'Entrenador Principal', cedula: '999', birth_date: '1980-03-04T00:00:00Z' },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uploads a replacement photo to the team scope and sends its URL', async () => {
    const fetchMock = mockApi({
      ...base,
      [LIST]: listBody([staffMember]),
      'POST /storage/objects': { status: 201, body: { key: 'team/x', url: 'https://cdn.example.com/staff.png', is_public: true } },
      'PATCH /coaching-staff/staff-1': { body: staffMember },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Editar a Carlos García' }))
    const dialog = await screen.findByRole('dialog')
    await user.upload(within(dialog).getByLabelText('Foto'), new File(['x'], 'staff.png', { type: 'image/png' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    await screen.findByText('Cuerpo técnico actualizado')
    const [form] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(form?.get('scope')).toBe('team')
    expect(form?.get('scope_id')).toBe(TEAM_ID)
    expect(requestsTo(fetchMock, 'PATCH /coaching-staff/staff-1')).toEqual([expect.objectContaining({ photo: 'https://cdn.example.com/staff.png' })])
  })

  it('shows the 422 field error and keeps the dialog and typed values', async () => {
    mockApi({
      ...base,
      [LIST]: listBody([staffMember]),
      'PATCH /coaching-staff/staff-1': {
        status: 422,
        body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { cedula: 'cédula inválida' } } },
      },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Editar a Carlos García' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Cédula / DNI (opcional)'), 'abc')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    const cedula = within(dialog).getByLabelText('Cédula / DNI (opcional)')
    expect(await within(dialog).findByText('cédula inválida')).toBeInTheDocument()
    expect(cedula).toHaveAttribute('aria-invalid', 'true')
    expect(cedula).toHaveValue('ABC')
  })
})

describe('CoachingStaffPage reactivate', () => {
  it('PATCHes {is_active:true} for an inactive member and reloads', async () => {
    const fetchMock = mockApi({ ...base, [LIST]: listBody([inactive]), 'PATCH /coaching-staff/staff-2': { body: { ...inactive, is_active: true } } })
    const { user } = renderPage()

    expect(screen.queryByRole('button', { name: 'Desactivar a Rosa Díaz' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Activar a Rosa Díaz' }))

    expect(await screen.findByText('Cuerpo técnico actualizado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /coaching-staff/staff-2')).toEqual([{ is_active: true }])
    await waitFor(() => expect(requestsTo(fetchMock, LIST)).toHaveLength(2))
  })

  it('toasts the API message when the staff limit blocks the reactivation (422)', async () => {
    mockApi({
      ...base,
      [LIST]: listBody([inactive]),
      'PATCH /coaching-staff/staff-2': {
        status: 422,
        body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { team_id: 'límite de 1 integrantes del cuerpo técnico alcanzado' } } },
      },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Activar a Rosa Díaz' }))

    expect(await screen.findByText('límite de 1 integrantes del cuerpo técnico alcanzado')).toBeInTheDocument()
  })
})

describe('CoachingStaffPage limit and creation', () => {
  it('shows the free spaces and the limit-reached state counting only active members', async () => {
    const withLimit = { ...base, [`GET /tournaments/${TOURNAMENT_ID}`]: { body: { ...tournament, max_coaching_staff: 3 } } }
    mockApi({ ...withLimit, [LIST]: listBody([staffMember, inactive]) })
    const first = renderPage()
    expect(await screen.findByText('Tienes 2 espacios disponibles de 3 miembros permitidos.')).toBeInTheDocument()
    first.unmount()

    mockApi({ ...base, [`GET /tournaments/${TOURNAMENT_ID}`]: { body: { ...tournament, max_coaching_staff: 1 } }, [LIST]: listBody([staffMember]) })
    renderPage()
    expect(await screen.findByText('Límite de cuerpo técnico alcanzado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Límite Alcanzado' })).toBeDisabled()
  })

  it('uploads the picked photo to the team scope before creating the member', async () => {
    const fetchMock = mockApi({
      ...base,
      [LIST]: listBody([]),
      'POST /storage/objects': { status: 201, body: { key: 'team/x', url: 'https://cdn.example.com/new.png', is_public: true } },
      [CREATE]: { status: 201, body: staffMember },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: /Nuevo Miembro/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByLabelText('Foto URL')).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Nombre Completo'), 'Ana Ruiz')
    await user.click(within(dialog).getByRole('combobox', { name: 'Rol / Cargo' }))
    await user.click(await screen.findByRole('option', { name: 'Médico' }))
    await user.upload(within(dialog).getByLabelText('Foto'), new File(['x'], 'new.png', { type: 'image/png' }))
    await user.click(within(dialog).getByRole('button', { name: 'Registrar Miembro' }))

    expect(await screen.findByText('Cuerpo técnico agregado')).toBeInTheDocument()
    const [form] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(form?.get('scope')).toBe('team')
    expect(form?.get('scope_id')).toBe(TEAM_ID)
    expect(requestsTo(fetchMock, CREATE)).toEqual([{ name: 'ANA RUIZ', role: 'Médico', photo: 'https://cdn.example.com/new.png' }])
  })
})

describe('CoachingStaffPage QR credential', () => {
  it('hides the QR button unless the league enabled qr_codes', async () => {
    mockApi({ ...base, [LIST]: listBody([staffMember]), 'GET /leagues/league-1': { body: { id: 'league-1', features: { qr_codes: false } } } })
    renderPage()

    await screen.findByText('Carlos García')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Credencial de Carlos García' })).not.toBeInTheDocument())
  })

  it("encodes {t:'s', i, n, r, tm} in the staff credential QR", async () => {
    mockApi({ ...base, [LIST]: listBody([staffMember]), 'GET /leagues/league-1': { body: leagueWithQr } })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Credencial de Carlos García' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Credencial de Cuerpo Técnico')).toBeInTheDocument()
    expect(JSON.parse(within(dialog).getByTestId('qr').getAttribute('data-value') ?? '')).toEqual({
      t: 's',
      i: 'staff-1',
      n: 'Carlos García',
      r: 'Entrenador Principal',
      tm: TEAM_ID,
    })
    expect(within(dialog).queryByText('Número:')).not.toBeInTheDocument()
  })
})
