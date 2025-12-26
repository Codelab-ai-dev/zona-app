import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/league_entity.dart';
import '../../domain/repositories/league_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/league_mapper.dart';
import '../models/league_model.dart';

/// League Repository Implementation
/// Implements league data operations using Supabase
class LeagueRepositoryImpl implements LeagueRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  LeagueRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<LeagueEntity>>> getAllLeagues({
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching all leagues (onlyActive: $onlyActive)...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query
      var query = supabaseService.client.from('leagues').select();

      // Filter by active status if needed
      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await query.order('created_at', ascending: false);

      // Parse response
      final leagues = (response as List)
          .map((json) => LeagueMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${leagues.length} leagues');
      return Right(leagues);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching leagues: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching leagues: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch leagues: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> getLeagueById(String leagueId) async {
    try {
      print('🔍 Fetching league with ID: $leagueId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Fetch league
      final response = await supabaseService.client
          .from('leagues')
          .select()
          .eq('id', leagueId)
          .maybeSingle();

      if (response == null) {
        print('❌ League not found: $leagueId');
        return Left(NotFoundFailure('League not found'));
      }

      final league = LeagueMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully fetched league: ${league.name}');
      return Right(league);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching league: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> getLeagueBySlug(String slug) async {
    try {
      print('🔍 Fetching league with slug: $slug...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Fetch league
      final response = await supabaseService.client
          .from('leagues')
          .select()
          .eq('slug', slug)
          .maybeSingle();

      if (response == null) {
        print('❌ League not found: $slug');
        return Left(NotFoundFailure('League not found'));
      }

      final league = LeagueMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully fetched league: ${league.name}');
      return Right(league);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching league: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<LeagueEntity>>> getLeaguesByAdminId(
    String adminId, {
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching leagues for admin: $adminId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query
      var query = supabaseService.client
          .from('leagues')
          .select()
          .eq('admin_id', adminId);

      // Filter by active status if needed
      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await query.order('created_at', ascending: false);

      // Parse response
      final leagues = (response as List)
          .map((json) => LeagueMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${leagues.length} leagues for admin');
      return Right(leagues);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching admin leagues: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching admin leagues: $e');
      print('Stack trace: $stackTrace');
      return Left(
        ServerFailure('Failed to fetch admin leagues: ${e.toString()}'),
      );
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> createLeague({
    required String name,
    required String slug,
    required String description,
    required String adminId,
    String? logo,
    String productMode = 'full',
  }) async {
    try {
      print('➕ Creating league: $name (mode: $productMode)...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Prepare data
      final data = {
        'name': name,
        'slug': slug,
        'description': description,
        'admin_id': adminId,
        'product_mode': productMode,
        if (logo != null) 'logo': logo,
        'is_active': true,
      };

      // Insert league
      final response = await supabaseService.client
          .from('leagues')
          .insert(data)
          .select()
          .single();

      final league = LeagueMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully created league: ${league.name}');

      // Update the admin's user profile with the league_id
      try {
        await supabaseService.client
            .from('users')
            .update({
              'league_id': league.id,
              'updated_at': DateTime.now().toIso8601String(),
            })
            .eq('id', adminId);
        print('✅ Admin league_id assigned successfully');
      } catch (e) {
        print('⚠️ Warning: Could not assign league_id to admin: $e');
        // Don't fail the league creation if this fails
      }

      return Right(league);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error creating league: ${e.message}');

      // Handle unique constraint violation (duplicate slug)
      if (e.code == '23505') {
        return Left(ValidationFailure('El slug ya está en uso'));
      }

      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error creating league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to create league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> updateLeague({
    required String leagueId,
    String? name,
    String? slug,
    String? description,
    String? adminId,
    String? logo,
    bool? isActive,
  }) async {
    try {
      print('✏️ Updating league: $leagueId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Prepare data (only include non-null values)
      final data = <String, dynamic>{};
      if (name != null) data['name'] = name;
      if (slug != null) data['slug'] = slug;
      if (description != null) data['description'] = description;
      if (adminId != null) data['admin_id'] = adminId;
      if (logo != null) data['logo'] = logo;
      if (isActive != null) data['is_active'] = isActive;
      data['updated_at'] = DateTime.now().toIso8601String();

      // Update league
      final response = await supabaseService.client
          .from('leagues')
          .update(data)
          .eq('id', leagueId)
          .select()
          .single();

      final league = LeagueMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully updated league: ${league.name}');
      return Right(league);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error updating league: ${e.message}');

      // Handle unique constraint violation (duplicate slug)
      if (e.code == '23505') {
        return Left(ValidationFailure('El slug ya está en uso'));
      }

      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error updating league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to update league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteLeague(String leagueId) async {
    try {
      print('🗑️ Deleting league: $leagueId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Soft delete by setting is_active to false
      await supabaseService.client
          .from('leagues')
          .update({
            'is_active': false,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', leagueId);

      print('✅ Successfully deleted league');
      return const Right(null);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error deleting league: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error deleting league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to delete league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<LeagueEntity>>> searchLeagues(
    String query, {
    bool onlyActive = true,
  }) async {
    try {
      print('🔍 Searching leagues with query: $query...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query - search in name and description
      var supaQuery = supabaseService.client.from('leagues').select().or(
            'name.ilike.%$query%,description.ilike.%$query%',
          );

      // Filter by active status if needed
      if (onlyActive) {
        supaQuery = supaQuery.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await supaQuery.order('created_at', ascending: false);

      // Parse response
      final leagues = (response as List)
          .map((json) => LeagueMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Found ${leagues.length} leagues matching query');
      return Right(leagues);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error searching leagues: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error searching leagues: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to search leagues: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, bool>> isSlugAvailable(
    String slug, {
    String? excludeLeagueId,
  }) async {
    try {
      print('🔍 Checking slug availability: $slug...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query
      var query = supabaseService.client
          .from('leagues')
          .select('id')
          .eq('slug', slug);

      // Exclude specific league ID if provided (for update operations)
      if (excludeLeagueId != null) {
        query = query.neq('id', excludeLeagueId);
      }

      final response = await query.maybeSingle();

      final isAvailable = response == null;
      print('✅ Slug available: $isAvailable');
      return Right(isAvailable);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error checking slug: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error checking slug: $e');
      print('Stack trace: $stackTrace');
      return Left(
        ServerFailure('Failed to check slug availability: ${e.toString()}'),
      );
    }
  }
}
