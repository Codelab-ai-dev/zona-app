"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { queryKeys } from "./query-keys"
import type {
  FinanceConfig,
  FinanceConfigInsert,
  FinanceConfigUpdate,
  FinanceTransaction,
  FinanceTransactionInsert,
  FinanceTransactionUpdate,
  FinanceTransactionWithRelations,
  FinanceTeamBalance,
  FinanceLeagueSummary,
  FinanceTransactionStatus,
  FinancePaymentMethod,
  FinanceFilters,
} from "@/lib/types/finance"

// =====================================================
// CONFIGURATION QUERIES
// =====================================================

/**
 * Hook para obtener la configuración financiera de una liga
 */
export function useFinanceConfig(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.finance.config(leagueId || ""),
    queryFn: async (): Promise<FinanceConfig | null> => {
      if (!leagueId) return null

      const { data, error } = await supabase
        .from("finance_config")
        .select("*")
        .eq("league_id", leagueId)
        .is("tournament_id", null) // Config de liga (no torneo específico)
        .eq("is_active", true)
        .single()

      if (error) {
        // Si no existe, retornar null (no es error)
        if (error.code === "PGRST116") return null
        throw error
      }
      return data as FinanceConfig
    },
    enabled: !!leagueId,
    staleTime: 10 * 60 * 1000, // 10 minutos - config no cambia frecuentemente
  })
}

/**
 * Hook para obtener la configuración financiera de un torneo específico
 */
export function useFinanceConfigByTournament(leagueId: string | undefined, tournamentId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.finance.configByTournament(leagueId || "", tournamentId || ""),
    queryFn: async (): Promise<FinanceConfig | null> => {
      if (!leagueId) return null

      // Buscar config específica del torneo, o la de la liga como fallback
      const { data, error } = await supabase
        .from("finance_config")
        .select("*")
        .eq("league_id", leagueId)
        .eq("is_active", true)
        .or(tournamentId ? `tournament_id.eq.${tournamentId},tournament_id.is.null` : "tournament_id.is.null")
        .order("tournament_id", { ascending: false, nullsFirst: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }
      return data as FinanceConfig
    },
    enabled: !!leagueId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Mutation para crear configuración financiera
 */
export function useCreateFinanceConfig() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async (config: FinanceConfigInsert) => {
      const { data, error } = await supabase
        .from("finance_config")
        .insert(config)
        .select()
        .single()

      if (error) throw error
      return data as FinanceConfig
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.config(data.league_id) })
    },
  })
}

/**
 * Mutation para actualizar configuración financiera
 */
export function useUpdateFinanceConfig() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ configId, updates, leagueId }: {
      configId: string
      updates: FinanceConfigUpdate
      leagueId: string
    }) => {
      const { data, error } = await supabase
        .from("finance_config")
        .update(updates)
        .eq("id", configId)
        .select()
        .single()

      if (error) throw error
      return { ...data, leagueId } as FinanceConfig & { leagueId: string }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.config(data.leagueId) })
    },
  })
}

// =====================================================
// TRANSACTION QUERIES
// =====================================================

/**
 * Hook para obtener transacciones de una liga con filtros
 */
export function useFinanceTransactions(
  leagueId: string | undefined,
  filters?: FinanceFilters
) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: [...queryKeys.finance.transactionsByLeague(leagueId || ""), filters],
    queryFn: async (): Promise<FinanceTransactionWithRelations[]> => {
      if (!leagueId) return []

      let query = supabase
        .from("finance_transactions")
        .select(`
          *,
          team:teams(id, name, slug, logo),
          player:players(id, name, jersey_number),
          match:matches(
            id,
            match_date,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          ),
          created_by_user:users!finance_transactions_created_by_fkey(id, full_name)
        `)
        .eq("league_id", leagueId)

      // Aplicar filtros
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status)
      }
      if (filters?.transaction_type && filters.transaction_type !== "all") {
        query = query.eq("transaction_type", filters.transaction_type)
      }
      if (filters?.team_id) {
        query = query.eq("team_id", filters.team_id)
      }
      if (filters?.date_from) {
        query = query.gte("transaction_date", filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte("transaction_date", filters.date_to)
      }
      if (filters?.is_income !== undefined) {
        query = query.eq("is_income", filters.is_income)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      return (data || []) as FinanceTransactionWithRelations[]
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para obtener transacciones de un equipo específico
 */
export function useFinanceTransactionsByTeam(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.finance.transactionsByTeam(teamId || ""),
    queryFn: async (): Promise<FinanceTransactionWithRelations[]> => {
      if (!teamId) return []

      const { data, error } = await supabase
        .from("finance_transactions")
        .select(`
          *,
          team:teams(id, name, slug, logo),
          player:players(id, name, jersey_number),
          match:matches(
            id,
            match_date,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          )
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data || []) as FinanceTransactionWithRelations[]
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook para obtener transacciones de un partido
 */
export function useFinanceTransactionsByMatch(matchId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.finance.transactionsByMatch(matchId || ""),
    queryFn: async (): Promise<FinanceTransaction[]> => {
      if (!matchId) return []

      const { data, error } = await supabase
        .from("finance_transactions")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data || []) as FinanceTransaction[]
    },
    enabled: !!matchId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook para obtener detalle de una transacción
 */
export function useFinanceTransactionDetail(transactionId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.finance.transactionDetail(transactionId || ""),
    queryFn: async (): Promise<FinanceTransactionWithRelations | null> => {
      if (!transactionId) return null

      const { data, error } = await supabase
        .from("finance_transactions")
        .select(`
          *,
          team:teams(id, name, slug, logo),
          player:players(id, name, jersey_number),
          match:matches(
            id,
            match_date,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          ),
          created_by_user:users!finance_transactions_created_by_fkey(id, full_name)
        `)
        .eq("id", transactionId)
        .single()

      if (error) throw error
      return data as FinanceTransactionWithRelations
    },
    enabled: !!transactionId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Mutation para crear transacción
 */
export function useCreateFinanceTransaction() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async (transaction: FinanceTransactionInsert) => {
      const { data, error } = await supabase
        .from("finance_transactions")
        .insert(transaction)
        .select()
        .single()

      if (error) throw error
      return data as FinanceTransaction
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByLeague(data.league_id) })
      if (data.team_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByTeam(data.team_id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalance(data.team_id) })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalances(data.league_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.leagueSummary(data.league_id) })
    },
  })
}

/**
 * Mutation para actualizar transacción
 */
export function useUpdateFinanceTransaction() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ transactionId, updates, leagueId, teamId }: {
      transactionId: string
      updates: FinanceTransactionUpdate
      leagueId: string
      teamId?: string | null
    }) => {
      const { data, error } = await supabase
        .from("finance_transactions")
        .update(updates)
        .eq("id", transactionId)
        .select()
        .single()

      if (error) throw error
      return { ...data, leagueId, teamId } as FinanceTransaction & { leagueId: string; teamId?: string | null }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByLeague(data.leagueId) })
      if (data.teamId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByTeam(data.teamId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalance(data.teamId) })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalances(data.leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.leagueSummary(data.leagueId) })
    },
  })
}

/**
 * Mutation para cancelar transacción
 */
export function useCancelFinanceTransaction() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ transactionId, reason, cancelledBy, leagueId, teamId }: {
      transactionId: string
      reason: string
      cancelledBy: string
      leagueId: string
      teamId?: string | null
    }) => {
      const { data, error } = await supabase
        .from("finance_transactions")
        .update({
          status: "cancelled" as FinanceTransactionStatus,
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          cancellation_reason: reason,
        })
        .eq("id", transactionId)
        .select()
        .single()

      if (error) throw error
      return { ...data, leagueId, teamId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByLeague(data.leagueId) })
      if (data.teamId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByTeam(data.teamId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalance(data.teamId) })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalances(data.leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.leagueSummary(data.leagueId) })
    },
  })
}

/**
 * Mutation para registrar un pago
 */
export function useRegisterPayment() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({
      transactionId,
      amount,
      paymentMethod,
      paymentReference,
      paidBy,
      leagueId,
      teamId,
    }: {
      transactionId: string
      amount: number
      paymentMethod: FinancePaymentMethod
      paymentReference?: string
      paidBy: string
      leagueId: string
      teamId?: string | null
    }) => {
      // Llamar a la función de base de datos
      const { data, error } = await supabase.rpc("register_payment", {
        p_transaction_id: transactionId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference || null,
        p_paid_by: paidBy,
      })

      if (error) throw error
      return { ...data, leagueId, teamId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByLeague(data.leagueId) })
      if (data.teamId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByTeam(data.teamId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalance(data.teamId) })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalances(data.leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.leagueSummary(data.leagueId) })
    },
  })
}

// =====================================================
// BALANCE QUERIES
// =====================================================

/**
 * Hook para obtener balances de todos los equipos de una liga
 */
export function useFinanceTeamBalances(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.finance.teamBalances(leagueId || ""),
    queryFn: async (): Promise<FinanceTeamBalance[]> => {
      if (!leagueId) return []

      const { data, error } = await supabase
        .from("finance_team_balances")
        .select("*")
        .eq("league_id", leagueId)
        .order("pending_balance", { ascending: false })

      if (error) throw error
      return (data || []) as FinanceTeamBalance[]
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook para obtener balance de un equipo específico
 */
export function useFinanceTeamBalance(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.finance.teamBalance(teamId || ""),
    queryFn: async (): Promise<FinanceTeamBalance | null> => {
      if (!teamId) return null

      const { data, error } = await supabase
        .from("finance_team_balances")
        .select("*")
        .eq("team_id", teamId)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }
      return data as FinanceTeamBalance
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
  })
}

// =====================================================
// SUMMARY QUERIES
// =====================================================

/**
 * Hook para obtener resumen financiero de una liga
 */
export function useFinanceLeagueSummary(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.finance.leagueSummary(leagueId || ""),
    queryFn: async (): Promise<FinanceLeagueSummary | null> => {
      if (!leagueId) return null

      const { data, error } = await supabase
        .from("finance_league_summary")
        .select("*")
        .eq("league_id", leagueId)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }
      return data as FinanceLeagueSummary
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000,
  })
}

// =====================================================
// AUTO-GENERATION MUTATIONS
// =====================================================

/**
 * Mutation para generar multas automáticamente desde un partido
 */
export function useGenerateFinesFromMatch() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ matchId, createdBy, leagueId }: {
      matchId: string
      createdBy: string
      leagueId: string
    }) => {
      const { data, error } = await supabase.rpc("generate_fines_from_match", {
        p_match_id: matchId,
        p_created_by: createdBy,
      })

      if (error) throw error
      return { ...data, leagueId, matchId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByLeague(data.leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByMatch(data.matchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalances(data.leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.leagueSummary(data.leagueId) })
    },
  })
}

/**
 * Mutation para crear cargos de inscripción para un equipo
 */
export function useCreateRegistrationCharges() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({
      leagueId,
      teamId,
      tournamentId,
      playerCount,
      createdBy,
    }: {
      leagueId: string
      teamId: string
      tournamentId?: string
      playerCount: number
      createdBy: string
    }) => {
      // Obtener configuración
      const { data: config } = await supabase
        .from("finance_config")
        .select("*")
        .eq("league_id", leagueId)
        .eq("is_active", true)
        .or(tournamentId ? `tournament_id.eq.${tournamentId},tournament_id.is.null` : "tournament_id.is.null")
        .order("tournament_id", { ascending: false, nullsFirst: false })
        .limit(1)
        .single()

      if (!config) throw new Error("No finance configuration found")

      const transactions: FinanceTransactionInsert[] = []
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + (config.payment_due_days || 7))

      // Cargo por inscripción de equipo
      if (config.team_registration_fee > 0) {
        transactions.push({
          league_id: leagueId,
          tournament_id: tournamentId || null,
          team_id: teamId,
          player_id: null,
          match_id: null,
          transaction_type: "team_registration",
          description: "Cuota de inscripción de equipo",
          amount: config.team_registration_fee,
          is_income: false,
          transaction_date: new Date().toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          notes: null,
          payment_method: null,
          payment_reference: null,
          receipt_number: null,
          external_payment_id: null,
          external_payment_status: null,
          external_payment_data: null,
          auto_generated: true,
          source_stat_id: null,
          parent_transaction_id: null,
          created_by: createdBy,
          updated_by: null,
          cancelled_by: null,
          cancelled_at: null,
          cancellation_reason: null,
        })
      }

      // Cargos por inscripción de jugadores
      if (config.player_registration_fee > 0 && playerCount > 0) {
        transactions.push({
          league_id: leagueId,
          tournament_id: tournamentId || null,
          team_id: teamId,
          player_id: null,
          match_id: null,
          transaction_type: "player_registration",
          description: `Cuota de inscripción de ${playerCount} jugador(es)`,
          amount: config.player_registration_fee * playerCount,
          is_income: false,
          transaction_date: new Date().toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          notes: `${playerCount} jugadores x $${config.player_registration_fee}`,
          payment_method: null,
          payment_reference: null,
          receipt_number: null,
          external_payment_id: null,
          external_payment_status: null,
          external_payment_data: null,
          auto_generated: true,
          source_stat_id: null,
          parent_transaction_id: null,
          created_by: createdBy,
          updated_by: null,
          cancelled_by: null,
          cancelled_at: null,
          cancellation_reason: null,
        })
      }

      if (transactions.length === 0) {
        return { created: 0, leagueId, teamId }
      }

      const { data, error } = await supabase
        .from("finance_transactions")
        .insert(transactions)
        .select()

      if (error) throw error
      return { created: data.length, leagueId, teamId, transactions: data }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByLeague(data.leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByTeam(data.teamId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalance(data.teamId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalances(data.leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.leagueSummary(data.leagueId) })
    },
  })
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Hook para invalidar todo el caché de finanzas
 */
export function useInvalidateFinanceCache() {
  const queryClient = useQueryClient()

  return {
    invalidateByLeague: (leagueId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByLeague(leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalances(leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.leagueSummary(leagueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.config(leagueId) })
    },
    invalidateByTeam: (teamId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactionsByTeam(teamId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.teamBalance(teamId) })
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all })
    },
  }
}

/**
 * Hook para obtener transacciones pendientes/vencidas (para notificaciones)
 */
export function usePendingFinanceTransactions(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: [...queryKeys.finance.transactionsByLeague(leagueId || ""), "pending"],
    queryFn: async () => {
      if (!leagueId) return { pending: [], overdue: [] }

      const [pendingResult, overdueResult] = await Promise.all([
        supabase
          .from("finance_transactions")
          .select(`
            id, description, amount, amount_paid, due_date, status,
            team:teams(id, name)
          `)
          .eq("league_id", leagueId)
          .eq("status", "pending")
          .order("due_date", { ascending: true })
          .limit(10),
        supabase
          .from("finance_transactions")
          .select(`
            id, description, amount, amount_paid, due_date, status,
            team:teams(id, name)
          `)
          .eq("league_id", leagueId)
          .eq("status", "overdue")
          .order("due_date", { ascending: true })
          .limit(10),
      ])

      return {
        pending: pendingResult.data || [],
        overdue: overdueResult.data || [],
      }
    },
    enabled: !!leagueId,
    staleTime: 5 * 60 * 1000,
  })
}
