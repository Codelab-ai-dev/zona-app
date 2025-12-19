// =====================================================
// IDENTITY SERVICE
// =====================================================
// Maneja la identidad del usuario y el contexto multi-tenant
// Resuelve: WhatsApp phone → User → League → Tournament
// =====================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  UserIdentity,
  WhatsAppUserLink,
  UserRole,
  Channel,
} from '@/lib/types/agent.types';

export class IdentityService {
  /**
   * Resuelve la identidad del usuario desde su identificador
   *
   * Flujo:
   * 1. Si es WhatsApp → busca en whatsapp_user_links
   * 2. Si es web/mobile → usa auth.uid() y busca en users
   * 3. Retorna UserIdentity con contexto multi-tenant
   *
   * @param userIdentifier - Phone number para WhatsApp, user_id para web/mobile
   * @param channel - Canal de comunicación
   * @returns UserIdentity con todo el contexto
   */
  static async resolveIdentity(
    userIdentifier: string,
    channel: Channel
  ): Promise<UserIdentity> {
    const supabase = await createServerSupabaseClient();

    // Si es WhatsApp, buscar vinculación
    if (channel === 'whatsapp') {
      return await this.resolveWhatsAppIdentity(userIdentifier);
    }

    // Si es web o mobile, buscar usuario autenticado
    if (channel === 'web' || channel === 'mobile') {
      return await this.resolveAuthenticatedIdentity(userIdentifier);
    }

    // Canal desconocido
    throw new Error(`Unknown channel: ${channel}`);
  }

  /**
   * Resuelve identidad desde número de WhatsApp
   */
  private static async resolveWhatsAppIdentity(
    phoneNumber: string
  ): Promise<UserIdentity> {
    const supabase = await createServerSupabaseClient();

    // Normalizar número de teléfono (eliminar espacios, guiones, etc.)
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Buscar vinculación activa con información de liga y torneo
    const { data: link, error } = await supabase
      .from('whatsapp_user_links')
      .select(`
        id,
        phone_number,
        user_id,
        league_id,
        tournament_id,
        role,
        display_name,
        preferred_language,
        is_active,
        league:leagues(id, name),
        tournament:tournaments(id, name)
      `)
      .eq('phone_number', normalizedPhone)
      .eq('is_active', true)
      .single();

    // Si no está vinculado, retornar identidad sin contexto
    if (error || !link) {
      console.log(`📱 WhatsApp ${normalizedPhone} not linked`);
      return {
        userIdentifier: normalizedPhone,
        channel: 'whatsapp',
        isLinked: false,
      };
    }

    // Añadir type assertion para resolver tipo 'never'
    const linkData = link as any;

    // Extraer nombres de liga y torneo
    const leagueName = linkData.league?.name || undefined;
    const tournamentName = linkData.tournament?.name || undefined;

    // Si está vinculado, retornar identidad completa
    console.log(`✅ WhatsApp ${normalizedPhone} linked to user ${linkData.user_id}, league ${linkData.league_id} (${leagueName}), tournament ${linkData.tournament_id} (${tournamentName})`);

    return {
      userIdentifier: normalizedPhone,
      channel: 'whatsapp',
      userId: linkData.user_id || undefined,
      role: linkData.role as UserRole,
      leagueId: linkData.league_id || undefined,
      leagueName: leagueName,
      tournamentId: linkData.tournament_id || undefined,
      tournamentName: tournamentName,
      displayName: linkData.display_name || undefined,
      preferredLanguage: linkData.preferred_language || 'es',
      isLinked: true,
    };
  }

  /**
   * Resuelve identidad desde usuario autenticado (web/mobile)
   */
  private static async resolveAuthenticatedIdentity(
    userId: string
  ): Promise<UserIdentity> {
    const supabase = await createServerSupabaseClient();

    // Buscar usuario en la tabla users con información de liga
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        league_id,
        team_id,
        league:leagues(id, name)
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Añadir type assertion para resolver tipo 'never'
    const userData = user as any;

    // Si es league_admin, obtener tournament activo con nombre
    let tournamentId: string | undefined;
    let tournamentName: string | undefined;
    if (userData.role === 'league_admin' && userData.league_id) {
      const tournament = await this.getActiveTournamentWithName(userData.league_id);
      tournamentId = tournament?.id;
      tournamentName = tournament?.name;
    }

    const leagueName = userData.league?.name || undefined;

    console.log(`✅ User ${userId} authenticated, league ${userData.league_id} (${leagueName}), tournament ${tournamentId} (${tournamentName})`);

    return {
      userIdentifier: userId,
      channel: 'web', // O 'mobile' dependiendo del request
      userId: userData.id,
      role: userData.role as UserRole,
      leagueId: userData.league_id || undefined,
      leagueName: leagueName,
      tournamentId: tournamentId,
      tournamentName: tournamentName,
      displayName: userData.name,
      preferredLanguage: 'es',
      isLinked: true,
    };
  }

  /**
   * Vincula un número de WhatsApp a un usuario
   *
   * @param phoneNumber - Número de WhatsApp a vincular
   * @param userId - ID del usuario en la base de datos
   * @param leagueId - ID de la liga a la que pertenece
   * @param tournamentId - ID del torneo activo (opcional)
   * @param role - Rol del usuario
   * @returns WhatsAppUserLink creado
   */
  static async linkWhatsAppUser(
    phoneNumber: string,
    userId: string,
    leagueId: string,
    tournamentId: string | null,
    role: UserRole
  ): Promise<WhatsAppUserLink> {
    const supabase = await createServerSupabaseClient();

    // Normalizar número
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    const userData = user as any;

    // Verificar que la liga existe
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      throw new Error(`League not found: ${leagueId}`);
    }

    // Verificar si ya existe una vinculación activa para este teléfono
    const { data: existingLink } = await supabase
      .from('whatsapp_user_links')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('is_active', true)
      .single();

    if (existingLink) {
      throw new Error(`Phone ${normalizedPhone} already linked to another user`);
    }

    // Crear vinculación
    const { data: link, error: linkError } = await supabase
      .from('whatsapp_user_links')
      // @ts-expect-error - Supabase type inference issue without generated types
      .insert({
        phone_number: normalizedPhone,
        user_id: userId,
        league_id: leagueId,
        tournament_id: tournamentId,
        role,
        display_name: userData.name,
        is_active: true,
        linked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (linkError || !link) {
      throw new Error(`Failed to link WhatsApp: ${linkError?.message}`);
    }

    const linkData = link as any;

    console.log(`✅ WhatsApp ${normalizedPhone} linked to user ${userId} in league ${leagueId}`);

    return {
      id: linkData.id,
      phoneNumber: linkData.phone_number,
      userId: linkData.user_id,
      leagueId: linkData.league_id,
      tournamentId: linkData.tournament_id,
      role: linkData.role as UserRole,
      isActive: linkData.is_active,
      linkedAt: new Date(linkData.linked_at),
      lastInteractionAt: linkData.last_interaction_at ? new Date(linkData.last_interaction_at) : undefined,
      displayName: linkData.display_name,
      preferredLanguage: linkData.preferred_language || 'es',
      createdAt: new Date(linkData.created_at),
      updatedAt: new Date(linkData.updated_at),
    };
  }

  /**
   * Desvincula un número de WhatsApp
   *
   * @param phoneNumber - Número a desvincular
   */
  static async unlinkWhatsAppUser(phoneNumber: string): Promise<void> {
    const supabase = await createServerSupabaseClient();

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Marcar como inactivo en lugar de eliminar (soft delete)
    const { error } = await supabase
      .from('whatsapp_user_links')
      // @ts-expect-error - Supabase type inference issue without generated types
      .update({ is_active: false })
      .eq('phone_number', normalizedPhone)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to unlink WhatsApp: ${error.message}`);
    }

    console.log(`✅ WhatsApp ${normalizedPhone} unlinked`);
  }

  /**
   * Actualiza el torneo activo de una vinculación
   *
   * @param phoneNumber - Número de WhatsApp
   * @param tournamentId - Nuevo ID de torneo
   */
  static async updateActiveTournament(
    phoneNumber: string,
    tournamentId: string
  ): Promise<void> {
    const supabase = await createServerSupabaseClient();

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    const { error } = await supabase
      .from('whatsapp_user_links')
      // @ts-expect-error - Supabase type inference issue without generated types
      .update({ tournament_id: tournamentId })
      .eq('phone_number', normalizedPhone)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to update tournament: ${error.message}`);
    }

    console.log(`✅ Tournament updated to ${tournamentId} for ${normalizedPhone}`);
  }

  /**
   * Obtiene el permiso requerido para un intent específico
   *
   * @param intent - Intención del usuario
   * @returns Permiso requerido o undefined si no requiere permiso especial
   */
  static getRequiredPermission(intent: string): string | undefined {
    // Mapear intents a permisos requeridos
    const intentPermissionMap: Record<string, string> = {
      'registrar_resultado': 'manage_matches',
      'editar_partido': 'manage_matches',
      'crear_torneo': 'manage_tournaments',
      'editar_torneo': 'manage_tournaments',
      'gestionar_equipos': 'manage_teams',
      'ver_estadisticas_admin': 'view_admin_stats',
    };

    return intentPermissionMap[intent];
  }

  /**
   * Verifica si un usuario tiene permiso para una acción
   *
   * @param identity - Identidad del usuario
   * @param action - Acción a verificar
   * @param resourceLeagueId - ID de la liga del recurso (opcional)
   * @returns true si tiene permiso
   */
  static async checkPermission(
    identity: UserIdentity,
    action: string,
    resourceLeagueId?: string
  ): Promise<boolean> {
    // Super admin tiene acceso a todo
    if (identity.role === 'super_admin') {
      return true;
    }

    // Si no está vinculado, no tiene permisos
    if (!identity.isLinked || !identity.leagueId) {
      return false;
    }

    // League admin solo puede acceder a recursos de su liga
    if (identity.role === 'league_admin') {
      if (resourceLeagueId && resourceLeagueId !== identity.leagueId) {
        return false;
      }
      return true;
    }

    // Team owner tiene acceso limitado
    if (identity.role === 'team_owner') {
      // Definir permisos específicos según la acción
      const allowedActions = ['view_matches', 'view_standings', 'view_team'];
      return allowedActions.includes(action);
    }

    // Usuario público tiene acceso muy limitado
    if (identity.role === 'public' || identity.role === 'user') {
      const allowedActions = ['view_matches', 'view_standings'];
      return allowedActions.includes(action);
    }

    return false;
  }

  /**
   * Obtiene el torneo activo de una liga
   *
   * @param leagueId - ID de la liga
   * @returns ID del torneo activo o undefined
   */
  private static async getActiveTournament(
    leagueId: string
  ): Promise<string | undefined> {
    const supabase = await createServerSupabaseClient();

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id')
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const tournamentData = tournament as any;
    return tournamentData?.id;
  }

  /**
   * Obtiene el torneo activo de una liga con su nombre
   *
   * @param leagueId - ID de la liga
   * @returns Objeto con id y name del torneo activo o undefined
   */
  private static async getActiveTournamentWithName(
    leagueId: string
  ): Promise<{ id: string; name: string } | undefined> {
    const supabase = await createServerSupabaseClient();

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name')
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const tournamentData = tournament as any;
    if (!tournamentData) return undefined;

    return {
      id: tournamentData.id,
      name: tournamentData.name,
    };
  }

  /**
   * Normaliza un número de teléfono
   * Elimina espacios, guiones, paréntesis
   * Asegura formato internacional con +
   *
   * @param phone - Número de teléfono sin procesar
   * @returns Número normalizado
   */
  private static normalizePhoneNumber(phone: string): string {
    // Eliminar todos los caracteres que no sean dígitos o +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Si no empieza con +, agregar + (asumiendo formato internacional)
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  /**
   * Obtiene todas las vinculaciones de WhatsApp para una liga
   *
   * @param leagueId - ID de la liga
   * @returns Lista de vinculaciones
   */
  static async getLeagueWhatsAppLinks(
    leagueId: string
  ): Promise<WhatsAppUserLink[]> {
    const supabase = await createServerSupabaseClient();

    const { data: links, error } = await supabase
      .from('whatsapp_user_links')
      .select('*')
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get league links: ${error.message}`);
    }

    return (links || []).map((link: any) => ({
      id: link.id,
      phoneNumber: link.phone_number,
      userId: link.user_id,
      leagueId: link.league_id,
      tournamentId: link.tournament_id,
      role: link.role as UserRole,
      isActive: link.is_active,
      linkedAt: new Date(link.linked_at),
      lastInteractionAt: link.last_interaction_at ? new Date(link.last_interaction_at) : undefined,
      displayName: link.display_name,
      preferredLanguage: link.preferred_language || 'es',
      createdAt: new Date(link.created_at),
      updatedAt: new Date(link.updated_at),
    }));
  }

  /**
   * Verifica si un número de WhatsApp ya está vinculado
   *
   * @param phoneNumber - Número a verificar
   * @returns true si ya está vinculado
   */
  static async isPhoneLinked(phoneNumber: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient();

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    const { data } = await supabase
      .from('whatsapp_user_links')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('is_active', true)
      .single();

    return !!data;
  }

  /**
   * Genera un código de verificación para vincular WhatsApp
   *
   * @returns Código de 6 dígitos
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
