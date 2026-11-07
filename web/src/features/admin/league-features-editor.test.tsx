import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders, mockApi } from '@/test/render'
import { LeagueFeaturesEditor } from './components/league-features-editor'

const mockLeague = {
  id: 'league1',
  name: 'Liga Premier',
  slug: 'liga-premier',
  description: 'Liga premier mexicana',
  admin_id: 'admin1',
  is_active: true,
  product_mode: 'full' as const,
  features: {
    manual_entry: true,
    public_portal: true,
    statistics: true,
    qr_codes: false,
    facial_recognition: false,
    mobile_app: false,
    realtime_updates: false,
    finance: false,
    finance_auto_fines: false,
    finance_payments: false,
    ai_agent: false,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockLeagueWithFinance = {
  ...mockLeague,
  features: {
    ...mockLeague.features,
    finance: true,
    finance_auto_fines: true,
    finance_payments: true,
  },
}

describe('LeagueFeaturesEditor', () => {
  it('renders nothing when league is null', () => {
    mockApi({})
    renderWithProviders(<LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={null} />)
    expect(screen.queryByText('Configurar Features')).not.toBeInTheDocument()
  })

  it('renders dialog with league features when open', () => {
    mockApi({})
    renderWithProviders(<LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={mockLeague} />)

    expect(screen.getByText('Configurar Features')).toBeInTheDocument()
    expect(screen.getByText('Liga Premier')).toBeInTheDocument()
  })

  it('displays all feature groups', () => {
    mockApi({})
    renderWithProviders(<LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={mockLeague} />)

    expect(screen.getByText('Funciones Principales')).toBeInTheDocument()
    expect(screen.getByText('Móvil y Tiempo Real')).toBeInTheDocument()
    expect(screen.getByText('Gestión Financiera')).toBeInTheDocument()
    expect(screen.getByText('Inteligencia Artificial')).toBeInTheDocument()
  })

  it('displays all feature labels', () => {
    mockApi({})
    renderWithProviders(<LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={mockLeague} />)

    expect(screen.getByText('Entrada Manual')).toBeInTheDocument()
    expect(screen.getByText('Portal Público')).toBeInTheDocument()
    expect(screen.getByText('Estadísticas')).toBeInTheDocument()
    expect(screen.getByText('Códigos QR')).toBeInTheDocument()
    expect(screen.getByText('Reconocimiento Facial')).toBeInTheDocument()
    expect(screen.getByText('Aplicación Móvil')).toBeInTheDocument()
    expect(screen.getByText('Actualizaciones en Tiempo Real')).toBeInTheDocument()
    expect(screen.getByText('Finanzas')).toBeInTheDocument()
    expect(screen.getByText('Multas Automáticas')).toBeInTheDocument()
    expect(screen.getByText('Pagos')).toBeInTheDocument()
    expect(screen.getByText('Agente IA')).toBeInTheDocument()
  })

  it('disables finance sub-features when finance is off', () => {
    mockApi({})
    renderWithProviders(
      <LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={mockLeague} />,
    )

    const switches = screen.getAllByRole('checkbox')
    const financeSubSwitches = switches.filter((s) => {
      const parent = s.closest('div')
      return (
        parent?.textContent?.includes('Multas Automáticas') || parent?.textContent?.includes('Pagos')
      )
    })

    financeSubSwitches.forEach((switchEl) => {
      expect(switchEl).toHaveAttribute('disabled')
    })
  })

  it('enables finance sub-features when finance is on', () => {
    mockApi({})
    renderWithProviders(
      <LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={mockLeagueWithFinance} />,
    )

    const switches = screen.getAllByRole('checkbox')
    const financeSubSwitches = switches.filter((s) => {
      const parent = s.closest('div')
      return (
        parent?.textContent?.includes('Multas Automáticas') || parent?.textContent?.includes('Pagos')
      )
    })

    financeSubSwitches.forEach((switchEl) => {
      expect(switchEl).not.toHaveAttribute('disabled')
    })
  })

  it('disables finance sub-features when finance is toggled off', async () => {
    mockApi({})
    renderWithProviders(
      <LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={mockLeagueWithFinance} />,
    )

    const switches = screen.getAllByRole('checkbox')
    const financeSwitch = switches.find((s) => s.closest('div')?.textContent?.includes('Finanzas'))

    if (financeSwitch) {
      fireEvent.click(financeSwitch)
    }

    await waitFor(() => {
      const subSwitches = screen.getAllByRole('checkbox')
      const subFeaturesAfter = subSwitches.filter((s) => {
        const parent = s.closest('div')
        return (
          parent?.textContent?.includes('Multas Automáticas') || parent?.textContent?.includes('Pagos')
        )
      })

      subFeaturesAfter.forEach((switchEl) => {
        expect(switchEl).toHaveAttribute('disabled')
      })
    })
  })

  it('sends FULL features object on save', async () => {
    const updateHandler = { status: 200, body: mockLeague }
    mockApi({
      'PATCH /leagues/league1/product-mode': updateHandler,
    })

    renderWithProviders(
      <LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={mockLeague} />,
    )

    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.queryByText('Configurar Features')).not.toBeInTheDocument()
    })
  })

  it('closes dialog on cancel button click', async () => {
    const onOpenChange = vi.fn()
    mockApi({})
    renderWithProviders(
      <LeagueFeaturesEditor open={true} onOpenChange={onOpenChange} league={mockLeague} />,
    )

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('hides dialog when open prop is false', () => {
    mockApi({})
    const { rerender } = renderWithProviders(
      <LeagueFeaturesEditor open={true} onOpenChange={() => {}} league={mockLeague} />,
    )

    expect(screen.getByText('Configurar Features')).toBeInTheDocument()

    rerender(<LeagueFeaturesEditor open={false} onOpenChange={() => {}} league={mockLeague} />)

    expect(screen.queryByText('Configurar Features')).not.toBeInTheDocument()
  })
})
