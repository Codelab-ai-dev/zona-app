import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/coaching_staff_entity.dart';
import '../../domain/repositories/coaching_staff_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/coaching_staff_mapper.dart';

/// Coaching Staff Repository Implementation
class CoachingStaffRepositoryImpl implements CoachingStaffRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  static const _selectFields = '''
    id, team_id, name, role, photo, birth_date,
    cedula, is_active, created_at, updated_at
  ''';

  CoachingStaffRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<CoachingStaffEntity>>> getStaffByTeamId(
    String teamId, {
    bool onlyActive = false,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      var query = supabaseService.client
          .from('coaching_staff')
          .select(_selectFields)
          .eq('team_id', teamId);

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      final response = await query.order('role', ascending: true);

      final staff = (response as List)
          .map((json) =>
              CoachingStaffMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      return Right(staff);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener cuerpo técnico'));
    }
  }

  @override
  Future<Either<Failure, CoachingStaffEntity>> getStaffById(
      String staffId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final response = await supabaseService.client
          .from('coaching_staff')
          .select(_selectFields)
          .eq('id', staffId)
          .single();

      final staff = CoachingStaffMapper.fromJson(response);
      return Right(staff);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener miembro del cuerpo técnico'));
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
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final data = {
        'name': name,
        'team_id': teamId,
        'role': role,
        if (photo != null) 'photo': photo,
        if (birthDate != null)
          'birth_date': birthDate.toIso8601String().split('T')[0],
        if (cedula != null) 'cedula': cedula,
      };

      final response = await supabaseService.client
          .from('coaching_staff')
          .insert(data)
          .select(_selectFields)
          .single();

      final staff = CoachingStaffMapper.fromJson(response);
      return Right(staff);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al crear miembro del cuerpo técnico'));
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
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final updateData = <String, dynamic>{};
      if (name != null) updateData['name'] = name;
      if (role != null) updateData['role'] = role;
      if (photo != null) updateData['photo'] = photo;
      if (birthDate != null) {
        updateData['birth_date'] = birthDate.toIso8601String().split('T')[0];
      }
      if (cedula != null) updateData['cedula'] = cedula;
      if (isActive != null) updateData['is_active'] = isActive;

      final response = await supabaseService.client
          .from('coaching_staff')
          .update(updateData)
          .eq('id', staffId)
          .select(_selectFields)
          .single();

      final staff = CoachingStaffMapper.fromJson(response);
      return Right(staff);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al actualizar miembro del cuerpo técnico'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteStaff(String staffId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      await supabaseService.client
          .from('coaching_staff')
          .delete()
          .eq('id', staffId);

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al eliminar miembro del cuerpo técnico'));
    }
  }
}
