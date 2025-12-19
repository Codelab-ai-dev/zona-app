// =====================================================
// ACTIONS SERVICE
// =====================================================
// Maneja acciones estructuradas que el agente puede ejecutar
// n8n procesa estas acciones después de enviar la respuesta
// =====================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  SystemAction,
  SystemActionType,
  UserIdentity,
  Intent
} from '@/lib/types/agent.types';

/**
 * Payload específico por tipo de acción
 */
interface SystemActionPayload {
  send_whatsapp_template: {
    phoneNumber: string;
    templateName: string;
    parameters?: string[];
  };
  open_24h_window: {
    phoneNumber: string;
    triggeredBy: string;
  };
  create_notification: {
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
  };
  log_conversation: {
    conversationId: string;
    userMessage: string;
    agentResponse: string;
    intent: Intent;
  };
  update_user_context: {
    userId: string;
    lastInteraction: string;
    preferredTopics?: string[];
  };
  trigger_webhook: {
    url: string;
    method: 'GET' | 'POST';
    payload?: Record<string, any>;
  };
  schedule_reminder: {
    userId: string;
    message: string;
    scheduleFor: string; // ISO timestamp
  };
}

/**
 * Resultado de ejecución de acción
 */
interface ActionExecutionResult {
  actionId: string;
  status: 'success' | 'failed' | 'pending';
  executedAt?: Date;
  error?: string;
}

export class ActionsService {
  /**
   * Crea una acción estructurada
   *
   * @param type - Tipo de acción
   * @param payload - Datos de la acción
   * @param conversationId - ID de la conversación (opcional)
   * @returns Acción creada
   */
  static createAction<T extends SystemActionType>(
    type: T,
    payload: SystemActionPayload[T],
    conversationId?: string
  ): SystemAction {
    const action: SystemAction = {
      type,
      payload: payload as Record<string, any>,
      status: 'pending',
      conversationId,
    };

    // Validar acción
    const validation = this.validateAction(action);
    if (!validation.isValid) {
      throw new Error(`Invalid action: ${validation.errors?.join(', ')}`);
    }

    return action;
  }

  /**
   * Valida una acción antes de crearla
   *
   * @param action - Acción a validar
   * @returns Resultado de validación
   */
  static validateAction(action: SystemAction): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Validar que tenga tipo
    if (!action.type) {
      errors.push('Action type is required');
    }

    // Validar payload según el tipo
    switch (action.type) {
      case 'send_whatsapp_template':
        const templatePayload = action.payload as SystemActionPayload['send_whatsapp_template'];
        if (!templatePayload.phoneNumber) {
          errors.push('phoneNumber is required for send_whatsapp_template');
        }
        if (!templatePayload.templateName) {
          errors.push('templateName is required for send_whatsapp_template');
        }
        break;

      case 'open_24h_window':
        const windowPayload = action.payload as SystemActionPayload['open_24h_window'];
        if (!windowPayload.phoneNumber) {
          errors.push('phoneNumber is required for open_24h_window');
        }
        if (!windowPayload.triggeredBy) {
          errors.push('triggeredBy is required for open_24h_window');
        }
        break;

      case 'create_notification':
        const notifPayload = action.payload as SystemActionPayload['create_notification'];
        if (!notifPayload.userId) {
          errors.push('userId is required for create_notification');
        }
        if (!notifPayload.message) {
          errors.push('message is required for create_notification');
        }
        break;

      case 'log_conversation':
        const logPayload = action.payload as SystemActionPayload['log_conversation'];
        if (!logPayload.conversationId) {
          errors.push('conversationId is required for log_conversation');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Persiste una acción en la base de datos
   *
   * @param action - Acción a persistir
   * @param conversationId - ID de la conversación
   * @returns ID de la acción creada
   */
  static async persistAction(
    action: SystemAction,
    conversationId: string
  ): Promise<string> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('agent_actions')
      .insert({
        conversation_id: conversationId,
        action_type: action.type,
        payload: action.payload,
        status: 'pending',
      } as any)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to persist action: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    console.log(`✅ Action persisted: ${action.type} (${(data as any).id})`);

    return (data as any).id;
  }

  /**
   * Marca una acción como ejecutada
   *
   * @param actionId - ID de la acción
   * @param status - Estado de ejecución
   * @param errorMessage - Error si falló
   */
  static async markActionExecuted(
    actionId: string,
    status: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const supabase = await createServerSupabaseClient();

    const result = await supabase
      .from('agent_actions')
      // @ts-expect-error - Supabase type inference issue without generated types
      .update({
        status,
        executed_at: new Date().toISOString(),
        error: errorMessage,
      })
      .eq('id', actionId);

    const { error: updateError } = result;

    if (updateError) {
      throw new Error(`Failed to mark action as executed: ${updateError.message}`);
    }

    console.log(`✅ Action marked as ${status}: ${actionId}`);
  }

  /**
   * Determina acciones necesarias basadas en el intent
   *
   * @param intent - Intención del usuario
   * @param identity - Identidad del usuario
   * @param withinWindow - Si está dentro de ventana 24h
   * @returns Lista de acciones sugeridas
   */
  static suggestActions(
    intent: Intent,
    identity: UserIdentity,
    withinWindow: boolean
  ): SystemAction[] {
    const actions: SystemAction[] = [];

    // Si es WhatsApp y NO está dentro de ventana 24h
    if (identity.channel === 'whatsapp' && !withinWindow) {
      // Sugerir abrir ventana si el usuario envió mensaje
      actions.push(
        this.createAction('open_24h_window', {
          phoneNumber: identity.userIdentifier,
          triggeredBy: 'user_message',
        })
      );
    }

    // Según el intent, sugerir acciones específicas
    switch (intent) {
      case 'proximos_partidos':
        // Si pregunta por próximos partidos, podría querer recordatorio
        if (identity.userId) {
          // Esta acción la procesaría n8n y crearía un recordatorio
          // Por ahora solo la sugerimos, no la ejecutamos
        }
        break;

      case 'suspensiones':
        // Si hay suspensiones, notificar
        if (identity.role === 'team_owner' && identity.userId) {
          // Crear notificación para el team owner
          // (esto lo ejecutaría n8n después de verificar si hay suspensiones)
        }
        break;
    }

    return actions;
  }

  /**
   * Obtiene acciones pendientes para una conversación
   *
   * @param conversationId - ID de la conversación
   * @returns Lista de acciones pendientes
   */
  static async getPendingActions(
    conversationId: string
  ): Promise<SystemAction[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get pending actions: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      type: row.action_type as SystemActionType,
      payload: row.payload,
      status: row.status,
      conversationId: row.conversation_id,
    }));
  }

  /**
   * Obtiene historial de acciones ejecutadas
   *
   * @param userId - ID del usuario
   * @param limit - Número máximo de acciones
   * @returns Historial de acciones
   */
  static async getActionHistory(
    userId: string,
    limit: number = 50
  ): Promise<ActionExecutionResult[]> {
    const supabase = await createServerSupabaseClient();

    // Obtener conversaciones del usuario
    const { data: conversations } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('user_identifier', userId)
      .limit(limit);

    if (!conversations || conversations.length === 0) {
      return [];
    }

    const conversationIds = conversations.map((c: any) => c.id);

    // Obtener acciones de esas conversaciones
    const { data, error } = await supabase
      .from('agent_actions')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get action history: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      actionId: row.id,
      status: row.status,
      executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
      error: row.error,
    }));
  }

  /**
   * Crea acción para enviar template de WhatsApp
   *
   * @param phoneNumber - Número de teléfono
   * @param templateName - Nombre del template
   * @param parameters - Parámetros del template
   * @returns Acción creada
   */
  static createWhatsAppTemplateAction(
    phoneNumber: string,
    templateName: string,
    parameters?: string[]
  ): SystemAction {
    return this.createAction('send_whatsapp_template', {
      phoneNumber,
      templateName,
      parameters,
    });
  }

  /**
   * Crea acción para abrir ventana 24h de WhatsApp
   *
   * @param phoneNumber - Número de teléfono
   * @returns Acción creada
   */
  static createOpen24hWindowAction(phoneNumber: string): SystemAction {
    return this.createAction('open_24h_window', {
      phoneNumber,
      triggeredBy: 'agent_response',
    });
  }

  /**
   * Crea acción para crear notificación
   *
   * @param userId - ID del usuario
   * @param title - Título de la notificación
   * @param message - Mensaje
   * @param type - Tipo de notificación
   * @returns Acción creada
   */
  static createNotificationAction(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'success' = 'info'
  ): SystemAction {
    return this.createAction('create_notification', {
      userId,
      title,
      message,
      type,
    });
  }

  /**
   * Formatea acciones para incluir en la respuesta
   *
   * @param actions - Lista de acciones
   * @returns Acciones formateadas
   */
  static formatActionsForResponse(actions: SystemAction[]): SystemAction[] {
    return actions.map((action) => ({
      type: action.type,
      payload: action.payload,
      status: action.status || 'pending',
      conversationId: action.conversationId,
    }));
  }

  /**
   * Obtiene estadísticas de acciones
   *
   * @param leagueId - ID de la liga
   * @param startDate - Fecha inicial
   * @param endDate - Fecha final
   * @returns Estadísticas
   */
  static async getActionStats(
    leagueId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalActions: number;
    byType: Record<SystemActionType, number>;
    successRate: number;
  }> {
    const supabase = await createServerSupabaseClient();

    // Obtener todas las acciones en el rango de fechas
    const { data, error } = await supabase
      .from('agent_actions')
      .select('action_type, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      throw new Error(`Failed to get action stats: ${error.message}`);
    }

    const actions = data || [];
    const totalActions = actions.length;

    // Contar por tipo
    const byType: Record<string, number> = {};
    let successCount = 0;

    actions.forEach((action: any) => {
      byType[action.action_type] = (byType[action.action_type] || 0) + 1;
      if (action.status === 'success') {
        successCount++;
      }
    });

    const successRate = totalActions > 0 ? successCount / totalActions : 0;

    return {
      totalActions,
      byType: byType as Record<SystemActionType, number>,
      successRate,
    };
  }
}
