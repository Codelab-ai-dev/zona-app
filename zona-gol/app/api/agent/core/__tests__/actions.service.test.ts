// =====================================================
// ACTIONS SERVICE TESTS
// =====================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionsService } from '../actions.service';
import { AgentAction, UserIdentity } from '@/lib/types/agent.types';

// Mock de Supabase
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('ActionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAction', () => {
    it('should create valid send_whatsapp_template action', () => {
      const action = ActionsService.createAction('send_whatsapp_template', {
        phoneNumber: '+5215512345678',
        templateName: 'welcome_message',
        parameters: ['Juan'],
      });

      expect(action.type).toBe('send_whatsapp_template');
      expect(action.payload.phoneNumber).toBe('+5215512345678');
      expect(action.status).toBe('pending');
    });

    it('should create valid open_24h_window action', () => {
      const action = ActionsService.createAction('open_24h_window', {
        phoneNumber: '+5215512345678',
        triggeredBy: 'user_message',
      });

      expect(action.type).toBe('open_24h_window');
      expect(action.payload.triggeredBy).toBe('user_message');
    });

    it('should create valid create_notification action', () => {
      const action = ActionsService.createAction('create_notification', {
        userId: 'user-123',
        title: 'Partido próximo',
        message: 'Tu equipo juega mañana',
        type: 'info',
      });

      expect(action.type).toBe('create_notification');
      expect(action.payload.title).toBe('Partido próximo');
    });

    it('should throw error for invalid action', () => {
      expect(() => {
        ActionsService.createAction('send_whatsapp_template', {
          phoneNumber: '', // Invalid: empty
          templateName: 'test',
        } as any);
      }).toThrow('Invalid action');
    });
  });

  describe('validateAction', () => {
    it('should validate send_whatsapp_template action', () => {
      const validAction: AgentAction = {
        type: 'send_whatsapp_template',
        payload: {
          phoneNumber: '+5215512345678',
          templateName: 'welcome',
        },
        status: 'pending',
      };

      const validation = ActionsService.validateAction(validAction);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should reject action without phoneNumber', () => {
      const invalidAction: AgentAction = {
        type: 'send_whatsapp_template',
        payload: {
          templateName: 'welcome',
        },
        status: 'pending',
      };

      const validation = ActionsService.validateAction(invalidAction);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'phoneNumber is required for send_whatsapp_template'
      );
    });

    it('should reject action without templateName', () => {
      const invalidAction: AgentAction = {
        type: 'send_whatsapp_template',
        payload: {
          phoneNumber: '+5215512345678',
        },
        status: 'pending',
      };

      const validation = ActionsService.validateAction(invalidAction);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'templateName is required for send_whatsapp_template'
      );
    });

    it('should validate open_24h_window action', () => {
      const validAction: AgentAction = {
        type: 'open_24h_window',
        payload: {
          phoneNumber: '+5215512345678',
          triggeredBy: 'user_message',
        },
        status: 'pending',
      };

      const validation = ActionsService.validateAction(validAction);
      expect(validation.isValid).toBe(true);
    });

    it('should validate create_notification action', () => {
      const validAction: AgentAction = {
        type: 'create_notification',
        payload: {
          userId: 'user-123',
          title: 'Test',
          message: 'Test message',
          type: 'info',
        },
        status: 'pending',
      };

      const validation = ActionsService.validateAction(validAction);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('persistAction', () => {
    it('should persist action to database', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'action-123' },
              error: null,
            }),
          }),
        }),
      });

      const action = ActionsService.createAction('open_24h_window', {
        phoneNumber: '+5215512345678',
        triggeredBy: 'agent_response',
      });

      const actionId = await ActionsService.persistAction(
        action,
        'conversation-123'
      );

      expect(actionId).toBe('action-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_actions');
    });

    it('should throw error if persistence fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const action = ActionsService.createAction('open_24h_window', {
        phoneNumber: '+5215512345678',
        triggeredBy: 'agent_response',
      });

      await expect(
        ActionsService.persistAction(action, 'conversation-123')
      ).rejects.toThrow('Failed to persist action');
    });
  });

  describe('markActionExecuted', () => {
    it('should mark action as success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      await ActionsService.markActionExecuted('action-123', 'success');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_actions');
    });

    it('should mark action as failed with error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      await ActionsService.markActionExecuted(
        'action-123',
        'failed',
        'Network timeout'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_actions');
    });
  });

  describe('suggestActions', () => {
    it('should suggest opening 24h window for WhatsApp outside window', () => {
      const identity: UserIdentity = {
        userIdentifier: '+5215512345678',
        channel: 'whatsapp',
        isLinked: true,
      };

      const actions = ActionsService.suggestActions(
        'calendario',
        identity,
        false // not within window
      );

      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].type).toBe('open_24h_window');
    });

    it('should not suggest window action if already within window', () => {
      const identity: UserIdentity = {
        userIdentifier: '+5215512345678',
        channel: 'whatsapp',
        isLinked: true,
      };

      const actions = ActionsService.suggestActions(
        'calendario',
        identity,
        true // within window
      );

      expect(actions.length).toBe(0);
    });

    it('should not suggest window action for web channel', () => {
      const identity: UserIdentity = {
        userIdentifier: 'user-123',
        channel: 'web',
        isLinked: true,
      };

      const actions = ActionsService.suggestActions(
        'calendario',
        identity,
        false
      );

      expect(actions.length).toBe(0);
    });
  });

  describe('getPendingActions', () => {
    it('should fetch pending actions for conversation', async () => {
      const mockActions = [
        {
          id: 'action-1',
          action_type: 'send_whatsapp_template',
          payload: { phoneNumber: '+5215512345678', templateName: 'test' },
          status: 'pending',
          conversation_id: 'conv-123',
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockActions,
                error: null,
              }),
            }),
          }),
        }),
      });

      const actions = await ActionsService.getPendingActions('conv-123');

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('send_whatsapp_template');
    });

    it('should return empty array if no pending actions', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const actions = await ActionsService.getPendingActions('conv-123');

      expect(actions).toEqual([]);
    });
  });

  describe('createWhatsAppTemplateAction', () => {
    it('should create WhatsApp template action', () => {
      const action = ActionsService.createWhatsAppTemplateAction(
        '+5215512345678',
        'welcome_message',
        ['Juan', 'Tigres']
      );

      expect(action.type).toBe('send_whatsapp_template');
      expect(action.payload.phoneNumber).toBe('+5215512345678');
      expect(action.payload.templateName).toBe('welcome_message');
      expect(action.payload.parameters).toEqual(['Juan', 'Tigres']);
    });
  });

  describe('createOpen24hWindowAction', () => {
    it('should create open 24h window action', () => {
      const action = ActionsService.createOpen24hWindowAction('+5215512345678');

      expect(action.type).toBe('open_24h_window');
      expect(action.payload.phoneNumber).toBe('+5215512345678');
      expect(action.payload.triggeredBy).toBe('agent_response');
    });
  });

  describe('createNotificationAction', () => {
    it('should create notification action', () => {
      const action = ActionsService.createNotificationAction(
        'user-123',
        'Nuevo partido',
        'Tu equipo juega mañana',
        'info'
      );

      expect(action.type).toBe('create_notification');
      expect(action.payload.userId).toBe('user-123');
      expect(action.payload.title).toBe('Nuevo partido');
      expect(action.payload.type).toBe('info');
    });

    it('should default to info type', () => {
      const action = ActionsService.createNotificationAction(
        'user-123',
        'Test',
        'Test message'
      );

      expect(action.payload.type).toBe('info');
    });
  });

  describe('formatActionsForResponse', () => {
    it('should format actions for response', () => {
      const actions: AgentAction[] = [
        {
          type: 'open_24h_window',
          payload: { phoneNumber: '+5215512345678', triggeredBy: 'agent' },
          status: 'pending',
        },
        {
          type: 'create_notification',
          payload: {
            userId: 'user-123',
            title: 'Test',
            message: 'Test',
            type: 'info',
          },
          status: 'pending',
        },
      ];

      const formatted = ActionsService.formatActionsForResponse(actions);

      expect(formatted).toHaveLength(2);
      expect(formatted[0].type).toBe('open_24h_window');
      expect(formatted[1].type).toBe('create_notification');
    });
  });

  describe('getActionStats', () => {
    it('should calculate action statistics', async () => {
      const mockActions = [
        { action_type: 'send_whatsapp_template', status: 'success' },
        { action_type: 'send_whatsapp_template', status: 'success' },
        { action_type: 'open_24h_window', status: 'success' },
        { action_type: 'open_24h_window', status: 'failed' },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({
              data: mockActions,
              error: null,
            }),
          }),
        }),
      });

      const stats = await ActionsService.getActionStats(
        'league-123',
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      expect(stats.totalActions).toBe(4);
      expect(stats.byType.send_whatsapp_template).toBe(2);
      expect(stats.byType.open_24h_window).toBe(2);
      expect(stats.successRate).toBe(0.75); // 3/4
    });

    it('should handle empty results', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const stats = await ActionsService.getActionStats(
        'league-123',
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      expect(stats.totalActions).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });
});

describe('ActionsService Integration Tests', () => {
  // Estos tests requieren una base de datos de prueba
  // Se pueden ejecutar con `npm run test:integration`

  it.skip('should persist and retrieve actions', async () => {
    const action = ActionsService.createAction('open_24h_window', {
      phoneNumber: '+5215512345678',
      triggeredBy: 'test',
    });

    const actionId = await ActionsService.persistAction(action, 'conv-123');
    expect(actionId).toBeDefined();

    const pending = await ActionsService.getPendingActions('conv-123');
    expect(pending.length).toBeGreaterThan(0);
  });

  it.skip('should mark actions as executed', async () => {
    const action = ActionsService.createAction('open_24h_window', {
      phoneNumber: '+5215512345678',
      triggeredBy: 'test',
    });

    const actionId = await ActionsService.persistAction(action, 'conv-123');

    await ActionsService.markActionExecuted(actionId, 'success');

    const pending = await ActionsService.getPendingActions('conv-123');
    expect(pending.find((a) => a.conversationId === actionId)).toBeUndefined();
  });
});

describe('ActionsService Real-World Scenarios', () => {
  it('should handle WhatsApp flow outside 24h window', () => {
    const identity: UserIdentity = {
      userIdentifier: '+5215512345678',
      channel: 'whatsapp',
      role: 'team_owner',
      isLinked: true,
    };

    // Usuario pregunta fuera de ventana 24h
    const actions = ActionsService.suggestActions(
      'calendario',
      identity,
      false
    );

    // Debe sugerir abrir ventana
    expect(actions.length).toBeGreaterThan(0);
    const openWindowAction = actions.find((a) => a.type === 'open_24h_window');
    expect(openWindowAction).toBeDefined();
    expect(openWindowAction?.payload.phoneNumber).toBe('+5215512345678');
  });

  it('should handle multiple action types', () => {
    const actions: AgentAction[] = [
      ActionsService.createWhatsAppTemplateAction(
        '+5215512345678',
        'match_reminder',
        ['Tigres', 'América', 'Sábado 19:00']
      ),
      ActionsService.createNotificationAction(
        'user-123',
        'Partido próximo',
        'Tu equipo juega en 24 horas',
        'warning'
      ),
    ];

    const formatted = ActionsService.formatActionsForResponse(actions);

    expect(formatted).toHaveLength(2);
    expect(formatted[0].type).toBe('send_whatsapp_template');
    expect(formatted[1].type).toBe('create_notification');
  });
});
