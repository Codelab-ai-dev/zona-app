import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/whatsapp_link_entity.dart';
import '../../domain/repositories/whatsapp_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/whatsapp_mapper.dart';

/// WhatsApp Repository Implementation
/// Handles all WhatsApp link data operations with Supabase
class WhatsAppRepositoryImpl implements WhatsAppRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  static const _tableName = 'whatsapp_user_links';
  static const _selectFields = '''
    id, phone_number, user_id, role, is_active, display_name,
    preferred_language, last_interaction_at, league_id, created_at, updated_at
  ''';

  WhatsAppRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<WhatsAppLinkEntity>>> getLinks(
    String leagueId,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final response = await supabaseService.client
          .from(_tableName)
          .select(_selectFields)
          .eq('league_id', leagueId)
          .order('created_at', ascending: false);

      final links = (response as List)
          .map((json) => WhatsAppMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      return Right(links);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener enlaces de WhatsApp'));
    }
  }

  @override
  Future<Either<Failure, WhatsAppLinkEntity>> createLink({
    required String phoneNumber,
    String? userId,
    String? role,
    String? displayName,
    required String leagueId,
    String? preferredLanguage,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final linkData = {
        'phone_number': phoneNumber,
        'league_id': leagueId,
        if (userId != null) 'user_id': userId,
        if (role != null) 'role': role,
        if (displayName != null) 'display_name': displayName,
        if (preferredLanguage != null)
          'preferred_language': preferredLanguage,
      };

      final response = await supabaseService.client
          .from(_tableName)
          .insert(linkData)
          .select(_selectFields)
          .single();

      final link = WhatsAppMapper.fromJson(response);
      return Right(link);
    } on PostgrestException catch (e) {
      if (e.code == '23505') {
        return Left(
            ServerFailure('Este número de teléfono ya está registrado'));
      }
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al crear enlace de WhatsApp'));
    }
  }

  @override
  Future<Either<Failure, WhatsAppLinkEntity>> updateLink({
    required String id,
    String? phoneNumber,
    String? role,
    String? displayName,
    String? preferredLanguage,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final updateData = <String, dynamic>{};
      if (phoneNumber != null) updateData['phone_number'] = phoneNumber;
      if (role != null) updateData['role'] = role;
      if (displayName != null) updateData['display_name'] = displayName;
      if (preferredLanguage != null) {
        updateData['preferred_language'] = preferredLanguage;
      }

      final response = await supabaseService.client
          .from(_tableName)
          .update(updateData)
          .eq('id', id)
          .select(_selectFields)
          .single();

      final link = WhatsAppMapper.fromJson(response);
      return Right(link);
    } on PostgrestException catch (e) {
      if (e.code == '23505') {
        return Left(
            ServerFailure('Este número de teléfono ya está registrado'));
      }
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al actualizar enlace de WhatsApp'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteLink(String id) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      await supabaseService.client
          .from(_tableName)
          .delete()
          .eq('id', id);

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al eliminar enlace de WhatsApp'));
    }
  }

  @override
  Future<Either<Failure, WhatsAppLinkEntity>> toggleActive({
    required String id,
    required bool isActive,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No hay conexión a internet'));
      }

      final response = await supabaseService.client
          .from(_tableName)
          .update({'is_active': isActive})
          .eq('id', id)
          .select(_selectFields)
          .single();

      final link = WhatsAppMapper.fromJson(response);
      return Right(link);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al cambiar estado del enlace'));
    }
  }
}
