import 'package:equatable/equatable.dart';

/// WhatsApp Events
abstract class WhatsAppEvent extends Equatable {
  const WhatsAppEvent();

  @override
  List<Object?> get props => [];
}

/// Load WhatsApp Links for a league
class LoadWhatsAppLinks extends WhatsAppEvent {
  final String leagueId;

  const LoadWhatsAppLinks({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}

/// Create a new WhatsApp link
class CreateWhatsAppLink extends WhatsAppEvent {
  final String phoneNumber;
  final String? userId;
  final String? role;
  final String? displayName;
  final String leagueId;
  final String? preferredLanguage;

  const CreateWhatsAppLink({
    required this.phoneNumber,
    this.userId,
    this.role,
    this.displayName,
    required this.leagueId,
    this.preferredLanguage,
  });

  @override
  List<Object?> get props => [
        phoneNumber,
        userId,
        role,
        displayName,
        leagueId,
        preferredLanguage,
      ];
}

/// Update an existing WhatsApp link
class UpdateWhatsAppLink extends WhatsAppEvent {
  final String id;
  final String? phoneNumber;
  final String? role;
  final String? displayName;
  final String? preferredLanguage;

  const UpdateWhatsAppLink({
    required this.id,
    this.phoneNumber,
    this.role,
    this.displayName,
    this.preferredLanguage,
  });

  @override
  List<Object?> get props => [id, phoneNumber, role, displayName, preferredLanguage];
}

/// Delete a WhatsApp link
class DeleteWhatsAppLink extends WhatsAppEvent {
  final String id;

  const DeleteWhatsAppLink({required this.id});

  @override
  List<Object?> get props => [id];
}

/// Toggle active status of a WhatsApp link
class ToggleWhatsAppLink extends WhatsAppEvent {
  final String id;
  final bool isActive;

  const ToggleWhatsAppLink({
    required this.id,
    required this.isActive,
  });

  @override
  List<Object?> get props => [id, isActive];
}
