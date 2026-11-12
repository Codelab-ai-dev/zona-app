import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../repositories/finance_repository.dart';

class GenerateFinesFromMatchParams extends Equatable {
  final String matchId;
  final String leagueId;

  const GenerateFinesFromMatchParams({
    required this.matchId,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [matchId, leagueId];
}

class GenerateFinesFromMatchUseCase {
  final FinanceRepository repository;

  GenerateFinesFromMatchUseCase(this.repository);

  /// Returns how many fines were created.
  Future<Either<Failure, int>> call(GenerateFinesFromMatchParams params) {
    return repository.generateFinesFromMatch(
      matchId: params.matchId,
      leagueId: params.leagueId,
    );
  }
}
