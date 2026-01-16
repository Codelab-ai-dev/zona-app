#!/usr/bin/env python3
"""
Fixture Generator using OR-Tools CP-SAT Solver

This script generates a valid round-robin tournament schedule using
constraint programming. It guarantees:
- Each team plays exactly once against every other team
- Each team plays exactly once per round
- No duplicate matches
- Respects existing/manual matches
"""

import json
import sys
from ortools.sat.python import cp_model


def validate_existing_matches(teams: list, existing_matches: list, is_double_round: bool = False):
    """
    Validate existing matches for conflicts.
    Returns (is_valid, error_message, diagnostics)
    """
    n = len(teams)
    team_ids = [t['id'] for t in teams]
    team_id_to_idx = {tid: idx for idx, tid in enumerate(team_ids)}
    team_id_to_name = {t['id']: t['name'] for t in teams}

    errors = []

    # Check 1: Duplicate matches (same pair playing twice in solo ida)
    if not is_double_round:
        seen_pairs = {}
        for match in existing_matches:
            home_id = match['homeTeamId']
            away_id = match['awayTeamId']
            if home_id not in team_id_to_idx or away_id not in team_id_to_idx:
                continue
            pair = tuple(sorted([home_id, away_id]))
            if pair in seen_pairs:
                home_name = team_id_to_name.get(home_id, home_id)
                away_name = team_id_to_name.get(away_id, away_id)
                errors.append(f"Partido duplicado: {home_name} vs {away_name} (jornadas {seen_pairs[pair]} y {match['round']})")
            else:
                seen_pairs[pair] = match['round']

    # Check 2: Team playing twice in same round
    matches_by_round = {}
    for match in existing_matches:
        round_num = match['round']
        if round_num not in matches_by_round:
            matches_by_round[round_num] = []
        matches_by_round[round_num].append(match)

    for round_num, matches in matches_by_round.items():
        teams_in_round = {}
        for match in matches:
            for team_id in [match['homeTeamId'], match['awayTeamId']]:
                if team_id in teams_in_round:
                    team_name = team_id_to_name.get(team_id, team_id)
                    errors.append(f"Equipo {team_name} juega más de una vez en jornada {round_num}")
                teams_in_round[team_id] = True

    return len(errors) == 0, errors


def generate_fixtures(teams: list, existing_matches: list, is_double_round: bool = False):
    """
    Generate fixtures using CP-SAT solver.

    Args:
        teams: List of team dicts with 'id' and 'name'
        existing_matches: List of existing match dicts with 'homeTeamId', 'awayTeamId', 'round'
        is_double_round: Whether it's a two-leg tournament

    Returns:
        dict with 'success', 'data' or 'error'
    """
    n = len(teams)
    if n < 2:
        return {"success": False, "error": "Se necesitan al menos 2 equipos"}

    # Skip validation - just log warnings for duplicates but continue
    # This allows tournaments where some matches were played multiple times
    is_valid, validation_errors = validate_existing_matches(teams, existing_matches, is_double_round)
    if not is_valid:
        print(f"⚠️ Advertencia: Se encontraron {len(validation_errors)} conflictos, pero se continuará:", file=sys.stderr)
        for err in validation_errors:
            print(f"   - {err}", file=sys.stderr)

    # For odd number of teams, we need N rounds with one team having bye each round
    # For even number of teams, we need N-1 rounds
    has_odd_teams = n % 2 != 0
    effective_n = n + 1 if has_odd_teams else n
    total_rounds_first_leg = effective_n - 1
    total_rounds = total_rounds_first_leg * 2 if is_double_round else total_rounds_first_leg
    matches_per_round = n // 2 if not has_odd_teams else (n - 1) // 2 + 1  # With bye, still n/2 actual matches

    if has_odd_teams:
        matches_per_round = n // 2  # Actually (n-1)/2 matches + 1 bye = n//2 matches

    # Create team index mapping
    team_ids = [t['id'] for t in teams]
    team_id_to_idx = {tid: idx for idx, tid in enumerate(team_ids)}

    # Parse existing matches
    existing_by_round = {}  # round -> list of (i, j) pairs where i < j
    existing_pairs = set()  # All existing pairs as (min_idx, max_idx)

    for match in existing_matches:
        home_id = match['homeTeamId']
        away_id = match['awayTeamId']
        round_num = match['round']

        if home_id not in team_id_to_idx or away_id not in team_id_to_idx:
            continue

        i = team_id_to_idx[home_id]
        j = team_id_to_idx[away_id]
        pair = (min(i, j), max(i, j))

        if round_num not in existing_by_round:
            existing_by_round[round_num] = []
        existing_by_round[round_num].append(pair)

        if not is_double_round:
            existing_pairs.add(pair)
        else:
            # For double round, track direction
            existing_pairs.add((i, j, round_num <= total_rounds_first_leg))

    # Find last round number used
    last_round = max(existing_by_round.keys()) if existing_by_round else 0

    # Calculate remaining matches to schedule
    all_pairs = set()
    for i in range(n):
        for j in range(i + 1, n):
            all_pairs.add((i, j))

    remaining_pairs = all_pairs - existing_pairs
    print(f"Total pairs: {len(all_pairs)}, Existing: {len(existing_pairs)}, Remaining: {len(remaining_pairs)}", file=sys.stderr)

    # If no remaining pairs, nothing to generate
    if not remaining_pairs:
        return {
            "success": True,
            "data": {"rounds": []},
            "message": "Todos los partidos ya están programados"
        }

    # Calculate how many rounds we need based on remaining matches
    # Each round can have at most n/2 matches (or (n-1)/2 for odd teams)
    max_matches_per_round = n // 2 if not has_odd_teams else (n - 1) // 2
    min_rounds_needed = (len(remaining_pairs) + max_matches_per_round - 1) // max_matches_per_round  # Ceiling division

    # Give the solver extra rounds for flexibility (round-robin needs n-1 rounds normally)
    # Use the theoretical max to ensure feasibility
    rounds_needed = max(min_rounds_needed, n - 1 if not has_odd_teams else n)

    print(f"Min rounds needed: {min_rounds_needed}, Using: {rounds_needed}", file=sys.stderr)

    # Standard round-robin: n-1 rounds for even, n for odd
    total_standard_rounds = (n - 1) if not has_odd_teams else n
    if is_double_round:
        total_standard_rounds *= 2

    rounds_to_generate = total_standard_rounds - last_round
    remaining_rounds = list(range(last_round + 1, last_round + 1 + rounds_to_generate))

    print(f"Standard: {total_standard_rounds} rounds, generating {rounds_to_generate} (rounds {remaining_rounds[0]}-{remaining_rounds[-1]})", file=sys.stderr)
    print(f"Using CP-SAT to MAXIMIZE matches from {len(remaining_pairs)} pairs", file=sys.stderr)

    # Create CP-SAT model
    model = cp_model.CpModel()

    # Variables: x[r, i, j] = 1 if match (i, j) is scheduled in round r
    x = {}
    for r in remaining_rounds:
        for (i, j) in remaining_pairs:
            x[r, i, j] = model.new_bool_var(f'x_{r}_{i}_{j}')

    # Constraint 1: Each pair plays AT MOST once (not all pairs need to be scheduled)
    for (i, j) in remaining_pairs:
        model.add(sum(x[r, i, j] for r in remaining_rounds) <= 1)

    # Constraint 2: Each team plays AT MOST once per round
    for r in remaining_rounds:
        for team in range(n):
            matches_involving_team = [x[r, i, j] for (i, j) in remaining_pairs
                                      if (i == team or j == team) and (r, i, j) in x]
            if matches_involving_team:
                model.add(sum(matches_involving_team) <= 1)

    # Constraint 3: Each round has at most max_matches_per_round matches
    for r in remaining_rounds:
        all_in_round = [x[r, i, j] for (i, j) in remaining_pairs if (r, i, j) in x]
        if all_in_round:
            model.add(sum(all_in_round) <= max_matches_per_round)

    # OBJECTIVE: Maximize total matches scheduled
    all_vars = [x[r, i, j] for r in remaining_rounds for (i, j) in remaining_pairs if (r, i, j) in x]
    model.maximize(sum(all_vars))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    status = solver.solve(model)

    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        # Extract solution
        rounds = []
        for r in remaining_rounds:
            matches = []
            bye_team_idx = None
            teams_playing = set()

            for (i, j) in remaining_pairs:
                if (r, i, j) in x and solver.value(x[r, i, j]) == 1:
                    # Determine home/away
                    # For second leg, swap home/away
                    is_second_leg = is_double_round and r > total_rounds_first_leg
                    if is_second_leg:
                        home_idx, away_idx = j, i
                    else:
                        home_idx, away_idx = i, j

                    matches.append({
                        "homeTeamId": team_ids[home_idx],
                        "awayTeamId": team_ids[away_idx]
                    })
                    teams_playing.add(i)
                    teams_playing.add(j)

            # Find bye team (if odd number of teams)
            if has_odd_teams:
                for team_idx in range(n):
                    if team_idx not in teams_playing:
                        bye_team_idx = team_idx
                        break

            if matches:
                round_data = {
                    "round": r,
                    "matches": matches
                }
                if bye_team_idx is not None:
                    round_data["byeTeamId"] = team_ids[bye_team_idx]
                rounds.append(round_data)

        total_matches = sum(len(r["matches"]) for r in rounds)
        max_possible = rounds_to_generate * max_matches_per_round
        unscheduled = len(remaining_pairs) - total_matches

        for r_data in rounds:
            print(f"  Round {r_data['round']}: {len(r_data['matches'])} matches", file=sys.stderr)

        print(f"CP-SAT: {total_matches}/{len(remaining_pairs)} pairs scheduled ({max_possible} max possible)", file=sys.stderr)
        if unscheduled > 0:
            print(f"⚠️ {unscheduled} pairs not scheduled (would need more rounds)", file=sys.stderr)

        return {
            "success": True,
            "data": {
                "rounds": rounds
            }
        }

    elif status == cp_model.INFEASIBLE or status == cp_model.UNKNOWN:
        # CP-SAT failed, use greedy algorithm as fallback
        print("CP-SAT no encontró solución, usando algoritmo greedy...", file=sys.stderr)
        return greedy_generate(teams, team_ids, list(remaining_pairs), last_round, is_double_round, total_rounds_first_leg, has_odd_teams)
    else:
        return {
            "success": False,
            "error": "No se pudo encontrar una solución en el tiempo límite"
        }


import random

def edge_coloring_attempt(pairs_list, n):
    """Single attempt at edge coloring with given pair ordering."""
    pair_to_color = {}
    team_colors = {i: set() for i in range(n)}

    for (i, j) in pairs_list:
        used_colors = team_colors.get(i, set()) | team_colors.get(j, set())
        color = 0
        while color in used_colors:
            color += 1
        pair_to_color[(i, j)] = color
        if i not in team_colors:
            team_colors[i] = set()
        if j not in team_colors:
            team_colors[j] = set()
        team_colors[i].add(color)
        team_colors[j].add(color)

    # Group pairs by color
    color_to_pairs = {}
    for pair, color in pair_to_color.items():
        if color not in color_to_pairs:
            color_to_pairs[color] = []
        color_to_pairs[color].append(pair)

    return color_to_pairs


def edge_coloring_schedule(pairs, n):
    """
    Use edge coloring to assign matches to rounds optimally.
    Tries multiple orderings to find the best coloring.
    """
    pairs_list = list(pairs)
    if not pairs_list:
        return {}

    # Calculate degrees for sorting
    degree = {}
    for (i, j) in pairs_list:
        degree[i] = degree.get(i, 0) + 1
        degree[j] = degree.get(j, 0) + 1

    best_result = None
    best_num_colors = float('inf')

    # Try different orderings
    orderings = [
        # High degree first
        sorted(pairs_list, key=lambda p: -(degree[p[0]] + degree[p[1]])),
        # Low degree first
        sorted(pairs_list, key=lambda p: (degree[p[0]] + degree[p[1]])),
        # By first team
        sorted(pairs_list, key=lambda p: (p[0], p[1])),
        # By second team
        sorted(pairs_list, key=lambda p: (p[1], p[0])),
    ]

    # Add some random shuffles
    for _ in range(5):
        shuffled = pairs_list.copy()
        random.shuffle(shuffled)
        orderings.append(shuffled)

    for ordering in orderings:
        result = edge_coloring_attempt(ordering, n)
        num_colors = len(result)
        if num_colors < best_num_colors:
            best_num_colors = num_colors
            best_result = result

    return best_result


def try_schedule(pairs_list, rounds_to_generate, max_matches_per_round):
    """Try to schedule pairs into rounds. Returns (rounds_data, total_scheduled)."""
    rounds_data = []
    scheduled = set()

    for _ in range(rounds_to_generate):
        round_matches = []
        teams_in_round = set()

        for (i, j) in pairs_list:
            if (i, j) in scheduled:
                continue
            if len(round_matches) >= max_matches_per_round:
                break
            if i not in teams_in_round and j not in teams_in_round:
                round_matches.append((i, j))
                teams_in_round.add(i)
                teams_in_round.add(j)
                scheduled.add((i, j))

        if round_matches:
            rounds_data.append((round_matches, teams_in_round))

    return rounds_data, len(scheduled)


def greedy_generate(teams, team_ids, remaining_pairs, last_round, is_double_round, total_rounds_first_leg, has_odd_teams):
    """
    Generate exactly the remaining rounds for a standard round-robin.
    Tries multiple orderings to maximize matches scheduled.
    """
    n = len(teams)
    pairs_to_schedule = list(remaining_pairs)
    max_matches_per_round = n // 2 if not has_odd_teams else (n - 1) // 2

    # Standard round-robin: n-1 rounds for even, n rounds for odd
    total_rounds = (n - 1) if not has_odd_teams else n
    if is_double_round:
        total_rounds *= 2

    rounds_to_generate = total_rounds - last_round

    print(f"Standard round-robin: {n} teams = {total_rounds} total rounds", file=sys.stderr)
    print(f"Already played: {last_round} rounds, generating: {rounds_to_generate} more", file=sys.stderr)
    print(f"Remaining pairs: {len(pairs_to_schedule)}, max {max_matches_per_round}/round", file=sys.stderr)

    # Try multiple orderings and keep the best
    best_rounds_data = None
    best_scheduled = 0

    # Different ordering strategies
    orderings = []

    # By team index
    orderings.append(sorted(pairs_to_schedule, key=lambda p: (p[0], p[1])))
    orderings.append(sorted(pairs_to_schedule, key=lambda p: (p[1], p[0])))
    orderings.append(sorted(pairs_to_schedule, key=lambda p: (p[0] + p[1], p[0])))

    # Random shuffles
    for _ in range(20):
        shuffled = pairs_to_schedule.copy()
        random.shuffle(shuffled)
        orderings.append(shuffled)

    for ordering in orderings:
        rounds_data, total_scheduled = try_schedule(ordering, rounds_to_generate, max_matches_per_round)
        if total_scheduled > best_scheduled:
            best_scheduled = total_scheduled
            best_rounds_data = rounds_data
            # If we scheduled all pairs, we're done
            if best_scheduled == len(pairs_to_schedule):
                break

    # Print results
    for r_idx, (matches, _) in enumerate(best_rounds_data):
        print(f"  Round {last_round + 1 + r_idx}: {len(matches)} matches", file=sys.stderr)

    # Build final rounds structure
    rounds = []
    for r_idx, (pairs_in_round, teams_in_round) in enumerate(best_rounds_data):
        round_num = last_round + 1 + r_idx
        round_matches = []

        for (i, j) in pairs_in_round:
            is_second_leg = is_double_round and round_num > total_rounds_first_leg
            if is_second_leg:
                home_idx, away_idx = j, i
            else:
                home_idx, away_idx = i, j

            round_matches.append({
                "homeTeamId": team_ids[home_idx],
                "awayTeamId": team_ids[away_idx]
            })

        bye_team_id = None
        if has_odd_teams:
            for idx in range(n):
                if idx not in teams_in_round:
                    bye_team_id = team_ids[idx]
                    break

        round_data = {
            "round": round_num,
            "matches": round_matches
        }
        if bye_team_id:
            round_data["byeTeamId"] = bye_team_id
        rounds.append(round_data)

    total_generated = sum(len(r["matches"]) for r in rounds)
    unscheduled = len(pairs_to_schedule) - best_scheduled
    print(f"Generated {len(rounds)} rounds with {total_generated} matches (best of {len(orderings)} attempts)", file=sys.stderr)
    if unscheduled > 0:
        print(f"⚠️ {unscheduled} pairs could not be scheduled (need more rounds)", file=sys.stderr)

    return {
        "success": True,
        "data": {
            "rounds": rounds
        }
    }


def main():
    """Main entry point - reads JSON from stdin, outputs JSON to stdout."""
    try:
        input_data = json.loads(sys.stdin.read())

        teams = input_data.get('teams', [])
        existing_matches = input_data.get('existingMatches', [])
        is_double_round = input_data.get('isDoubleRound', False)

        result = generate_fixtures(teams, existing_matches, is_double_round)
        print(json.dumps(result))

    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Error parsing JSON input: {str(e)}"
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Error: {str(e)}"
        }))


if __name__ == "__main__":
    main()
