import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/suspension_repository.dart';

class UpdateSuspensionParams extends Equatable {
  final String suspensionId;
  final int matchesToServe;

  const UpdateSuspensionParams({
    required this.suspensionId,
    required this.matchesToServe,
  });

  @override
  List<Object?> get props => [suspensionId, matchesToServe];
}

class UpdateSuspensionUseCase {
  final SuspensionRepository repository;

  UpdateSuspensionUseCase(this.repository);

  Future<Either<Failure, void>> call(UpdateSuspensionParams params) {
    return repository.updateSuspension(
      params.suspensionId,
      matchesToServe: params.matchesToServe,
    );
  }
}
