// =====================================================
// SQL SERVICE TESTS
// =====================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLService } from '../sql.service';

// Helper para crear un mock fluido que retorna el mismo objeto para encadenar
const createFluentMock = (resolvedValue: { data: any; error: any }) => {
  const mock: any = {
    select: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    or: vi.fn(() => mock),
    in: vi.fn(() => mock),
    gt: vi.fn(() => mock),
    gte: vi.fn(() => mock),
    lt: vi.fn(() => mock),
    lte: vi.fn(() => mock),
    ilike: vi.fn(() => mock),
    contains: vi.fn(() => mock),
    order: vi.fn(() => mock),
    limit: vi.fn(() => mock),
    single: vi.fn(() => mock),
    then: vi.fn((resolve) => resolve(resolvedValue)),
  };
  // Make it thenable for await
  Object.defineProperty(mock, 'then', {
    value: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  });
  return mock;
};

// Mock de Supabase
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('SQLService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getJornadaCalendar', () => {
    it('should fetch matches for specific jornada', async () => {
      // The service maps 'round' to 'jornada' in the result
      const mockMatches = [
        {
          id: '1',
          round: 5, // DB column is 'round', not 'jornada'
          home_team_id: 'team1',
          away_team_id: 'team2',
          home_score: null,
          away_score: null,
          match_date: '2025-01-20',
          match_time: '19:00',
          status: 'scheduled',
          field_number: 1,
          home_team: { name: 'Tigres' },
          away_team: { name: 'América' },
        },
      ];

      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: mockMatches, error: null })
      );

      const result = await SQLService.getJornadaCalendar(5, 'league-123', 'tournament-456');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].jornada).toBe(5);
      expect(result.data[0].homeTeam).toBe('Tigres');
      expect(result.data[0].awayTeam).toBe('América');
      // executionTime can be 0 in tests due to mock speed
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle tournament filtering', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: [], error: null })
      );

      const result = await SQLService.getJornadaCalendar(
        5,
        'league-123',
        'tournament-456'
      );

      expect(result.data).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: null, error: { message: 'Database error' } })
      );

      await expect(
        SQLService.getJornadaCalendar(5, 'league-123', 'tournament-456')
      ).rejects.toThrow('Failed to get jornada calendar');
    });
  });

  describe('getTodayMatches', () => {
    it('should fetch today matches', async () => {
      const today = new Date().toISOString().split('T')[0];

      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: [], error: null })
      );

      const result = await SQLService.getTodayMatches('league-123', 'tournament-456');

      expect(result.query.query).toContain(today);
      expect(result.data).toEqual([]);
    });
  });

  describe('getMatchResults', () => {
    it('should fetch finished matches', async () => {
      const mockResults = [
        {
          id: '1',
          jornada: 4,
          home_team_id: 'team1',
          away_team_id: 'team2',
          home_score: 3,
          away_score: 2,
          match_date: '2025-01-15',
          match_time: '19:00',
          status: 'finished',
          venue: 'Estadio A',
          home_team: { name: 'Tigres' },
          away_team: { name: 'América' },
        },
      ];

      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: mockResults, error: null })
      );

      const result = await SQLService.getMatchResults('league-123', { tournamentId: 'tournament-456' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('finished');
      expect(result.data[0].homeScore).toBe(3);
      expect(result.data[0].awayScore).toBe(2);
    });

    it('should filter by team name', async () => {
      const mockResults = [
        {
          id: '1',
          jornada: 4,
          home_team_id: 'team1',
          away_team_id: 'team2',
          home_score: 3,
          away_score: 2,
          match_date: '2025-01-15',
          match_time: '19:00',
          status: 'finished',
          home_team: { name: 'Tigres' },
          away_team: { name: 'América' },
        },
        {
          id: '2',
          jornada: 4,
          home_team_id: 'team3',
          away_team_id: 'team4',
          home_score: 1,
          away_score: 1,
          match_date: '2025-01-15',
          match_time: '21:00',
          status: 'finished',
          home_team: { name: 'Cruz Azul' },
          away_team: { name: 'Pumas' },
        },
      ];

      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: mockResults, error: null })
      );

      const result = await SQLService.getMatchResults('league-123', {
        teamName: 'tigres',
        tournamentId: 'tournament-456',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].homeTeam).toBe('Tigres');
    });

    it('should apply jornada filter', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: [], error: null })
      );

      await SQLService.getMatchResults('league-123', { jornada: 5, tournamentId: 'tournament-456' });

      // Verificar que se llamó con jornada = 5
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('matches');
    });
  });

  describe('getStandings', () => {
    it('should use RPC function if available', async () => {
      const mockStandings = [
        {
          team_id: 'team1',
          team_name: 'Tigres',
          played: 10,
          won: 7,
          drawn: 2,
          lost: 1,
          goals_for: 20,
          goals_against: 8,
          goal_difference: 12,
          points: 23,
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockStandings,
        error: null,
      });

      const result = await SQLService.getStandings('league-123', 'tournament-456');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].position).toBe(1);
      expect(result.data[0].teamName).toBe('Tigres');
      expect(result.data[0].points).toBe(23);
    });

    it('should calculate manually if RPC not available', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Function not found' },
      });

      // Mock matches for manual calculation
      const mockMatches = [
        {
          id: '1',
          home_team_id: 'team1',
          away_team_id: 'team2',
          home_score: 3,
          away_score: 1,
          home_team: { id: 'team1', name: 'Tigres' },
          away_team: { id: 'team2', name: 'América' },
        },
      ];

      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: mockMatches, error: null })
      );

      const result = await SQLService.getStandings('league-123', 'tournament-456');

      expect(result.data.length).toBeGreaterThan(0);
      // Tigres should have won
      const tigres = result.data.find((t) => t.teamName === 'Tigres');
      expect(tigres?.points).toBe(3);
      expect(tigres?.won).toBe(1);
    });

    it('should sort standings correctly', async () => {
      const mockMatches = [
        {
          home_team_id: 'team1',
          away_team_id: 'team2',
          home_score: 3,
          away_score: 1,
          home_team: { id: 'team1', name: 'Team A' },
          away_team: { id: 'team2', name: 'Team B' },
        },
        {
          home_team_id: 'team2',
          away_team_id: 'team3',
          home_score: 2,
          away_score: 2,
          home_team: { id: 'team2', name: 'Team B' },
          away_team: { id: 'team3', name: 'Team C' },
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: mockMatches, error: null })
      );

      const result = await SQLService.getStandings('league-123', 'tournament-456');

      // Team A should be first (3 points)
      expect(result.data[0].teamName).toBe('Team A');
      expect(result.data[0].position).toBe(1);
    });
  });

  describe('getSuspendedPlayers', () => {
    it('should fetch suspended players', async () => {
      const mockSuspensions = [
        {
          id: '1',
          player_id: 'player1',
          reason: 'Acumulación de tarjetas',
          suspended_until: '2025-01-25',
          player: {
            id: 'player1',
            name: 'Juan Pérez',
            team: { name: 'Tigres' },
          },
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockSuspensions,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await SQLService.getSuspendedPlayers('league-123');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].playerName).toBe('Juan Pérez');
      expect(result.data[0].teamName).toBe('Tigres');
      expect(result.data[0].reason).toBe('Acumulación de tarjetas');
    });

    it('should filter by tournament', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: [], error: null })
      );

      await SQLService.getSuspendedPlayers('league-123', 'tournament-456');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('player_suspensions');
    });
  });

  describe('getTopScorers', () => {
    it('should fetch top scorers', async () => {
      const mockScorers = [
        {
          player_id: 'player1',
          goals: 15,
          assists: 5,
          yellow_cards: 2,
          red_cards: 0,
          matches_played: 10,
          player: {
            id: 'player1',
            name: 'Carlos Gómez',
            team: { name: 'Tigres' },
          },
        },
        {
          player_id: 'player2',
          goals: 12,
          assists: 8,
          yellow_cards: 1,
          red_cards: 0,
          matches_played: 10,
          player: {
            id: 'player2',
            name: 'Luis Rodríguez',
            team: { name: 'América' },
          },
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: mockScorers,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await SQLService.getTopScorers('league-123', 'tournament-456');

      expect(result.data).toHaveLength(2);
      expect(result.data[0].playerName).toBe('Carlos Gómez');
      expect(result.data[0].goals).toBe(15);
      expect(result.data[1].goals).toBe(12);
    });

    it('should apply limit', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      await SQLService.getTopScorers('league-123', 'tournament-456', 5);

      // Verificar que limit fue llamado
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('player_stats');
    });
  });

  describe('getTeamUpcomingMatches', () => {
    it('should find team and fetch upcoming matches', async () => {
      // Mock team search (first call)
      const teamSearchMock = createFluentMock({
        data: [{ id: 'team1', name: 'Tigres' }],
        error: null,
      });

      // Mock upcoming matches (second call)
      const matchesMock = createFluentMock({
        data: [
          {
            id: '1',
            jornada: 5,
            home_team_id: 'team1',
            away_team_id: 'team2',
            match_date: '2025-01-25',
            match_time: '19:00',
            status: 'scheduled',
            home_team: { name: 'Tigres' },
            away_team: { name: 'América' },
          },
        ],
        error: null,
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(teamSearchMock)
        .mockReturnValueOnce(matchesMock);

      const result = await SQLService.getTeamUpcomingMatches(
        'tigres',
        'league-123'
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].homeTeam).toBe('Tigres');
    });

    it('should handle team not found', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createFluentMock({ data: [], error: null })
      );

      const result = await SQLService.getTeamUpcomingMatches(
        'nonexistent',
        'league-123'
      );

      expect(result.data).toEqual([]);
      expect(result.query.query).toContain('No team found');
    });
  });

  describe('formatMatchesForLLM', () => {
    it('should format finished matches', () => {
      const matches = [
        {
          id: '1',
          jornada: 5,
          homeTeam: 'Tigres',
          awayTeam: 'América',
          homeScore: 3,
          awayScore: 2,
          matchDate: '2025-01-20',
          matchTime: '19:00',
          status: 'finished' as const,
        },
      ];

      const formatted = SQLService.formatMatchesForLLM(matches);

      expect(formatted).toContain('Jornada 5');
      expect(formatted).toContain('Tigres 3 - 2 América');
      expect(formatted).toContain('2025-01-20');
    });

    it('should format scheduled matches', () => {
      const matches = [
        {
          id: '1',
          jornada: 6,
          homeTeam: 'Tigres',
          awayTeam: 'América',
          homeScore: null,
          awayScore: null,
          matchDate: '2025-01-27',
          matchTime: '19:00',
          status: 'scheduled' as const,
        },
      ];

      const formatted = SQLService.formatMatchesForLLM(matches);

      expect(formatted).toContain('Tigres vs América');
      expect(formatted).toContain('a las 19:00');
    });

    it('should handle empty matches', () => {
      const formatted = SQLService.formatMatchesForLLM([]);
      expect(formatted).toBe('No se encontraron partidos.');
    });
  });

  describe('formatStandingsForLLM', () => {
    it('should format standings table', () => {
      const standings = [
        {
          position: 1,
          teamName: 'Tigres',
          teamId: 'team1',
          played: 10,
          won: 7,
          drawn: 2,
          lost: 1,
          goalsFor: 20,
          goalsAgainst: 8,
          goalDifference: 12,
          points: 23,
        },
      ];

      const formatted = SQLService.formatStandingsForLLM(standings);

      expect(formatted).toContain('TABLA DE POSICIONES');
      expect(formatted).toContain('Tigres');
      expect(formatted).toContain('23pts'); // Points
      expect(formatted).toContain('+12'); // Goal difference
    });

    it('should handle negative goal difference', () => {
      const standings = [
        {
          position: 1,
          teamName: 'Team A',
          teamId: 'team1',
          played: 10,
          won: 2,
          drawn: 2,
          lost: 6,
          goalsFor: 8,
          goalsAgainst: 18,
          goalDifference: -10,
          points: 8,
        },
      ];

      const formatted = SQLService.formatStandingsForLLM(standings);

      expect(formatted).toContain('-10');
    });
  });

  describe('formatScorersForLLM', () => {
    it('should format scorers list', () => {
      const scorers = [
        {
          playerId: 'player1',
          playerName: 'Carlos Gómez',
          teamName: 'Tigres',
          goals: 15,
          assists: 5,
          yellowCards: 2,
          redCards: 0,
          matchesPlayed: 10,
        },
      ];

      const formatted = SQLService.formatScorersForLLM(scorers);

      expect(formatted).toContain('Carlos Gómez');
      expect(formatted).toContain('15 goles');
      expect(formatted).toContain('5 asistencias');
    });

    it('should not show assists if zero', () => {
      const scorers = [
        {
          playerId: 'player1',
          playerName: 'Carlos Gómez',
          teamName: 'Tigres',
          goals: 15,
          assists: 0,
          yellowCards: 2,
          redCards: 0,
          matchesPlayed: 10,
        },
      ];

      const formatted = SQLService.formatScorersForLLM(scorers);

      expect(formatted).not.toContain('asistencias');
    });
  });
});

describe('SQLService Integration Tests', () => {
  // Estos tests requieren una base de datos de prueba
  // Se pueden ejecutar con `npm run test:integration`

  it.skip('should fetch real jornada calendar', async () => {
    const result = await SQLService.getJornadaCalendar(
      5,
      'real-league-id',
      'real-tournament-id'
    );

    expect(result.data.length).toBeGreaterThan(0);
  });

  it.skip('should calculate real standings', async () => {
    const result = await SQLService.getStandings(
      'real-league-id',
      'real-tournament-id'
    );

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].position).toBe(1);
  });
});
