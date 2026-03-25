import 'package:equatable/equatable.dart';
import '../../../domain/entities/whatsapp_link_entity.dart';

/// WhatsApp States
abstract class WhatsAppState extends Equatable {
  const WhatsAppState();

  @override
  List<Object?> get props => [];
}

/// Initial State
class WhatsAppInitial extends WhatsAppState {
  const WhatsAppInitial();
}

/// Loading State
class WhatsAppLoading extends WhatsAppState {
  const WhatsAppLoading();
}

/// Links Loaded State (List)
class WhatsAppLinksLoaded extends WhatsAppState {
  final List<WhatsAppLinkEntity> links;

  const WhatsAppLinksLoaded(this.links);

  @override
  List<Object?> get props => [links];
}

/// Link Created State
class WhatsAppLinkCreated extends WhatsAppState {
  final WhatsAppLinkEntity link;

  const WhatsAppLinkCreated(this.link);

  @override
  List<Object?> get props => [link];
}

/// Link Updated State
class WhatsAppLinkUpdated extends WhatsAppState {
  final WhatsAppLinkEntity link;

  const WhatsAppLinkUpdated(this.link);

  @override
  List<Object?> get props => [link];
}

/// Link Deleted State
class WhatsAppLinkDeleted extends WhatsAppState {
  final String id;

  const WhatsAppLinkDeleted(this.id);

  @override
  List<Object?> get props => [id];
}

/// Link Toggled State
class WhatsAppLinkToggled extends WhatsAppState {
  final WhatsAppLinkEntity link;

  const WhatsAppLinkToggled(this.link);

  @override
  List<Object?> get props => [link];
}

/// Error State
class WhatsAppError extends WhatsAppState {
  final String message;

  const WhatsAppError(this.message);

  @override
  List<Object?> get props => [message];
}
