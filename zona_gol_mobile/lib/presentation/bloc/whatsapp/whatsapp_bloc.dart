import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import '../../../domain/usecases/create_whatsapp_link_usecase.dart';
import '../../../domain/usecases/delete_whatsapp_link_usecase.dart';
import '../../../domain/usecases/get_whatsapp_links_usecase.dart';
import '../../../domain/usecases/toggle_whatsapp_link_usecase.dart';
import '../../../domain/usecases/update_whatsapp_link_usecase.dart';
import 'whatsapp_event.dart';
import 'whatsapp_state.dart';

/// WhatsApp BLoC
/// Manages WhatsApp link state for the application
class WhatsAppBloc extends Bloc<WhatsAppEvent, WhatsAppState> {
  final GetWhatsAppLinksUseCase getWhatsAppLinksUseCase;
  final CreateWhatsAppLinkUseCase createWhatsAppLinkUseCase;
  final UpdateWhatsAppLinkUseCase updateWhatsAppLinkUseCase;
  final DeleteWhatsAppLinkUseCase deleteWhatsAppLinkUseCase;
  final ToggleWhatsAppLinkUseCase toggleWhatsAppLinkUseCase;
  final Logger logger = Logger();

  WhatsAppBloc({
    required this.getWhatsAppLinksUseCase,
    required this.createWhatsAppLinkUseCase,
    required this.updateWhatsAppLinkUseCase,
    required this.deleteWhatsAppLinkUseCase,
    required this.toggleWhatsAppLinkUseCase,
  }) : super(const WhatsAppInitial()) {
    on<LoadWhatsAppLinks>(_onLoadLinks);
    on<CreateWhatsAppLink>(_onCreateLink);
    on<UpdateWhatsAppLink>(_onUpdateLink);
    on<DeleteWhatsAppLink>(_onDeleteLink);
    on<ToggleWhatsAppLink>(_onToggleLink);
  }

  Future<void> _onLoadLinks(
    LoadWhatsAppLinks event,
    Emitter<WhatsAppState> emit,
  ) async {
    emit(const WhatsAppLoading());
    logger.i('Loading WhatsApp links for league: ${event.leagueId}');

    final result = await getWhatsAppLinksUseCase(
      GetWhatsAppLinksParams(leagueId: event.leagueId),
    );

    result.fold(
      (failure) {
        logger.e('Error loading WhatsApp links: ${failure.message}');
        emit(WhatsAppError(failure.message));
      },
      (links) {
        logger.i('Successfully loaded ${links.length} WhatsApp links');
        emit(WhatsAppLinksLoaded(links));
      },
    );
  }

  Future<void> _onCreateLink(
    CreateWhatsAppLink event,
    Emitter<WhatsAppState> emit,
  ) async {
    emit(const WhatsAppLoading());
    logger.i('Creating WhatsApp link: ${event.phoneNumber}');

    final result = await createWhatsAppLinkUseCase(
      CreateWhatsAppLinkParams(
        phoneNumber: event.phoneNumber,
        userId: event.userId,
        role: event.role,
        displayName: event.displayName,
        leagueId: event.leagueId,
        preferredLanguage: event.preferredLanguage,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error creating WhatsApp link: ${failure.message}');
        emit(WhatsAppError(failure.message));
      },
      (link) {
        logger.i('Successfully created WhatsApp link: ${link.phoneNumber}');
        emit(WhatsAppLinkCreated(link));
      },
    );
  }

  Future<void> _onUpdateLink(
    UpdateWhatsAppLink event,
    Emitter<WhatsAppState> emit,
  ) async {
    emit(const WhatsAppLoading());
    logger.i('Updating WhatsApp link: ${event.id}');

    final result = await updateWhatsAppLinkUseCase(
      UpdateWhatsAppLinkParams(
        id: event.id,
        phoneNumber: event.phoneNumber,
        role: event.role,
        displayName: event.displayName,
        preferredLanguage: event.preferredLanguage,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error updating WhatsApp link: ${failure.message}');
        emit(WhatsAppError(failure.message));
      },
      (link) {
        logger.i('Successfully updated WhatsApp link: ${link.phoneNumber}');
        emit(WhatsAppLinkUpdated(link));
      },
    );
  }

  Future<void> _onDeleteLink(
    DeleteWhatsAppLink event,
    Emitter<WhatsAppState> emit,
  ) async {
    emit(const WhatsAppLoading());
    logger.i('Deleting WhatsApp link: ${event.id}');

    final result = await deleteWhatsAppLinkUseCase(
      DeleteWhatsAppLinkParams(id: event.id),
    );

    result.fold(
      (failure) {
        logger.e('Error deleting WhatsApp link: ${failure.message}');
        emit(WhatsAppError(failure.message));
      },
      (_) {
        logger.i('Successfully deleted WhatsApp link');
        emit(WhatsAppLinkDeleted(event.id));
      },
    );
  }

  Future<void> _onToggleLink(
    ToggleWhatsAppLink event,
    Emitter<WhatsAppState> emit,
  ) async {
    emit(const WhatsAppLoading());
    logger.i('Toggling WhatsApp link ${event.id}: ${event.isActive}');

    final result = await toggleWhatsAppLinkUseCase(
      ToggleWhatsAppLinkParams(
        id: event.id,
        isActive: event.isActive,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error toggling WhatsApp link: ${failure.message}');
        emit(WhatsAppError(failure.message));
      },
      (link) {
        logger.i('Successfully toggled WhatsApp link: ${link.isActive}');
        emit(WhatsAppLinkToggled(link));
      },
    );
  }
}
