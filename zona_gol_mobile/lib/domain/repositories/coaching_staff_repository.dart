import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/coaching_staff_entity.dart';

/// Coaching Staff Repository
/// Defines the contract for coaching staff data operations
abstract class CoachingStaffRepository {
  /// Get all coaching staff for a team
  Future<Either<Failure, List<CoachingStaffEntity>>> getStaffByTeamId(
    String teamId, {
    bool onlyActive = false,
  });

  /// Get a coaching staff member by ID
  Future<Either<Failure, CoachingStaffEntity>> getStaffById(String staffId);

  /// Create a new coaching staff member
  Future<Either<Failure, CoachingStaffEntity>> createStaff({
    required String name,
    required String teamId,
    required String role,
    String? photo,
    DateTime? birthDate,
    String? cedula,
  });

  /// Update a coaching staff member
  Future<Either<Failure, CoachingStaffEntity>> updateStaff({
    required String staffId,
    String? name,
    String? role,
    String? photo,
    DateTime? birthDate,
    String? cedula,
    bool? isActive,
  });

  /// Delete a coaching staff member
  Future<Either<Failure, void>> deleteStaff(String staffId);
}
