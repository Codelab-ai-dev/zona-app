import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/failure_mapper.dart';
import '../../core/network/json.dart';
import '../../domain/entities/coaching_staff_entity.dart';
import '../../domain/repositories/coaching_staff_repository.dart';
import '../mappers/coaching_staff_mapper.dart';

/// Coaching staff repository backed by the Zona Gol API
/// (`/teams/{id}/coaching-staff`, `/coaching-staff/{id}`).
class CoachingStaffRepositoryImpl implements CoachingStaffRepository {
  final ApiClient api;

  CoachingStaffRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, List<CoachingStaffEntity>>> getStaffByTeamId(
    String teamId, {
    bool onlyActive = false,
  }) async {
    try {
      // The API lists the active members only (public fields).
      final rows = await api.getAll('/teams/$teamId/coaching-staff');
      final staff = rows.map(CoachingStaffMapper.fromJson).toList()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      return Right(onlyActive ? staff.where((s) => s.isActive).toList() : staff);
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener el cuerpo técnico'));
    }
  }

  @override
  Future<Either<Failure, CoachingStaffEntity>> createStaff({
    required String name,
    required String teamId,
    required String role,
    String? photo,
    DateTime? birthDate,
    String? cedula,
  }) async {
    try {
      final json = await api.post('/teams/$teamId/coaching-staff', {
        'name': name,
        'role': role,
        if (photo != null && photo.isNotEmpty) 'photo': photo,
        if (birthDate != null) 'birth_date': apiDate(birthDate),
        if (cedula != null && cedula.isNotEmpty) 'cedula': cedula,
      });
      return Right(CoachingStaffMapper.fromJson((json as Map).cast<String, dynamic>()));
    } catch (e) {
      return Left(failureFrom(e, 'Error al agregar al miembro'));
    }
  }

  @override
  Future<Either<Failure, CoachingStaffEntity>> updateStaff({
    required String staffId,
    String? name,
    String? role,
    String? photo,
    DateTime? birthDate,
    String? cedula,
    bool? isActive,
  }) async {
    try {
      final json = await api.patch('/coaching-staff/$staffId', {
        if (name != null) 'name': name,
        if (role != null) 'role': role,
        if (photo != null) 'photo': photo,
        if (birthDate != null) 'birth_date': apiDate(birthDate),
        if (cedula != null) 'cedula': cedula,
        if (isActive != null) 'is_active': isActive,
      });
      return Right(CoachingStaffMapper.fromJson((json as Map).cast<String, dynamic>()));
    } catch (e) {
      return Left(failureFrom(e, 'Error al actualizar al miembro'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteStaff(String staffId) async {
    try {
      await api.post('/coaching-staff/$staffId/deactivate');
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al dar de baja al miembro'));
    }
  }
}
