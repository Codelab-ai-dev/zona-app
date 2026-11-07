import { screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TEAM_ID, listBody, serverError, staffMember } from '../test-fixtures'
import { CoachingStaffPage } from './coaching-staff-page'

const LIST = `GET /teams/${TEAM_ID}/coaching-staff`
const CREATE = `POST /teams/${TEAM_ID}/coaching-staff`

function renderPage() {
  return renderWithProviders(<CoachingStaffPage teamId={TEAM_ID} />)
}

async function fillForm(user: ReturnType<typeof renderPage>['user']) {
  await user.click(await screen.findByRole('button', { name: /Agregar Miembro/i }))
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByLabelText('Nombre'), 'Ana Ruiz')
  await user.click(within(dialog).getByRole('combobox', { name: 'Rol' }))
  await user.click(await screen.findByRole('option', { name: 'Médico' }))
  await user.type(within(dialog).getByLabelText('Cédula'), '12345678')
  await user.type(within(dialog).getByLabelText('Fecha de Nacimiento'), '1985-02-03')
  await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
  return dialog
}

describe('CoachingStaffPage', () => {
  it('lists the coaching staff', async () => {
    mockApi({ [LIST]: listBody([staffMember]) })
    renderPage()

    expect(await screen.findByText('Carlos García')).toBeInTheDocument()
    expect(screen.getByText('Entrenador Principal')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockApi({ [LIST]: listBody([]) })
    renderPage()

    expect(await screen.findByText('Sin cuerpo técnico')).toBeInTheDocument()
  })

  it('shows the API error and reloads on retry', async () => {
    mockApi({ [LIST]: serverError })
    const { user } = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    mockApi({ [LIST]: listBody([staffMember]) })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Carlos García')).toBeInTheDocument()
  })

  it('creates a member for this team with an RFC 3339 birth date, closes the form and reloads', async () => {
    const fetchMock = mockApi({
      [LIST]: listBody([staffMember]),
      [CREATE]: { status: 201, body: { ...staffMember, id: 'staff-2', name: 'ANA RUIZ' } },
    })
    const { user } = renderPage()

    await fillForm(user)

    expect(await screen.findByText('Cuerpo técnico agregado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, CREATE)).toEqual([
      { name: 'ANA RUIZ', role: 'Médico', cedula: '12345678', birth_date: '1985-02-03T00:00:00Z' },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, LIST)).toHaveLength(2)
  })

  it('shows 422 errors on the fields and keeps the typed values', async () => {
    mockApi({
      [LIST]: listBody([]),
      [CREATE]: {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Datos inválidos',
            fields: { cedula: 'cédula inválida', role: 'requerido' },
          },
        },
      },
    })
    const { user } = renderPage()

    const dialog = await fillForm(user)

    const cedula = within(dialog).getByLabelText('Cédula')
    expect(await within(dialog).findByText('cédula inválida')).toBeInTheDocument()
    expect(cedula).toHaveAttribute('aria-invalid', 'true')
    expect(cedula).toHaveAttribute('aria-describedby', 'cedula-error')
    expect(cedula).toHaveValue('12345678')
    expect(within(dialog).getByRole('combobox', { name: 'Rol' })).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('ANA RUIZ')
    expect(screen.queryByText('Cuerpo técnico agregado')).not.toBeInTheDocument()
  })

  it('deactivates a member after confirmation and reloads', async () => {
    const fetchMock = mockApi({
      [LIST]: listBody([staffMember]),
      'POST /coaching-staff/staff-1/deactivate': { status: 204 },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Desactivar a Carlos García' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(requestsTo(fetchMock, 'POST /coaching-staff/staff-1/deactivate')).toEqual([])
    await user.click(within(confirm).getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Cuerpo técnico desactivado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /coaching-staff/staff-1/deactivate')).toHaveLength(1)
    await waitFor(() => expect(requestsTo(fetchMock, LIST)).toHaveLength(2))
  })

  it('shows the API message when deactivating fails', async () => {
    mockApi({
      [LIST]: listBody([staffMember]),
      'POST /coaching-staff/staff-1/deactivate': {
        status: 403,
        body: { error: { code: 'forbidden', message: 'No tienes permiso' } },
      },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Desactivar a Carlos García' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
  })
})
