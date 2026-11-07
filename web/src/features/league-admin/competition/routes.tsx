import { lazy } from 'react'

import type { Area } from '@/app/area'

/** Lazy-loaded pages for better performance. */
const HomePage = lazy(() => import('./pages/home').then((m) => ({ default: m.HomePage })))
const TournamentsPage = lazy(() => import('./pages/tournaments').then((m) => ({ default: m.TournamentsPage })))
const StandingsPageC = lazy(() => import('./pages/standings').then((m) => ({ default: m.StandingsPageComponent })))
const TopScorersPageC = lazy(() => import('./pages/top-scorers').then((m) => ({ default: m.TopScorersPageComponent })))
const SuspensionsPageC = lazy(() => import('./pages/suspensions').then((m) => ({ default: m.SuspensionsPageComponent })))
const FinancePageC = lazy(() => import('./pages/finance').then((m) => ({ default: m.FinancePageComponent })))
const WhatsAppPageC = lazy(() => import('./pages/whatsapp').then((m) => ({ default: m.WhatsAppPageComponent })))
const SettingsPageC = lazy(() => import('./pages/settings').then((m) => ({ default: m.SettingsPageComponent })))

export const area: Area = {
  dashboardRoutes: {
    roles: ['league_admin', 'super_admin'],
    routes: [
      {
        path: 'liga-admin',
        element: <HomePage />,
      },
      {
        path: 'liga-admin/torneos',
        element: <TournamentsPage />,
      },
      {
        path: 'liga-admin/tabla',
        element: <StandingsPageC />,
      },
      {
        path: 'liga-admin/goleadores',
        element: <TopScorersPageC />,
      },
      {
        path: 'liga-admin/suspensiones',
        element: <SuspensionsPageC />,
      },
      {
        path: 'liga-admin/finanzas',
        element: <FinancePageC />,
      },
      {
        path: 'liga-admin/whatsapp',
        element: <WhatsAppPageC />,
      },
      {
        path: 'liga-admin/ajustes',
        element: <SettingsPageC />,
      },
    ],
  },
  nav: [
    {
      to: '/liga-admin',
      label: 'Mi Liga',
      roles: ['league_admin'],
    },
  ],
}
