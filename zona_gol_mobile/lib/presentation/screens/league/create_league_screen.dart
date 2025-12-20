import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../../core/config/theme.dart';
import '../../../core/di/injection.dart';
import '../../bloc/league/league_bloc.dart';
import '../../bloc/league/league_event.dart';
import '../../bloc/league/league_state.dart';

/// Create League Screen
/// Form to create a new league with its administrator
class CreateLeagueScreen extends StatefulWidget {
  const CreateLeagueScreen({super.key});

  @override
  State<CreateLeagueScreen> createState() => _CreateLeagueScreenState();
}

class _CreateLeagueScreenState extends State<CreateLeagueScreen> {
  final _formKey = GlobalKey<FormState>();

  // League fields
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  final _descriptionController = TextEditingController();

  // Admin fields
  final _adminNameController = TextEditingController();
  final _adminEmailController = TextEditingController();
  final _adminPhoneController = TextEditingController();

  bool _isLoading = false;
  bool _autoGenerateSlug = true;
  String? _createdAdminId;
  String? _generatedPassword;

  @override
  void initState() {
    super.initState();
    _nameController.addListener(_onNameChanged);
  }

  @override
  void dispose() {
    _nameController.removeListener(_onNameChanged);
    _nameController.dispose();
    _slugController.dispose();
    _descriptionController.dispose();
    _adminNameController.dispose();
    _adminEmailController.dispose();
    _adminPhoneController.dispose();
    super.dispose();
  }

  void _onNameChanged() {
    if (_autoGenerateSlug) {
      _slugController.text = _generateSlug(_nameController.text);
    }
  }

  String _generateSlug(String name) {
    return name
        .toLowerCase()
        .replaceAll(RegExp(r'[áàäâã]'), 'a')
        .replaceAll(RegExp(r'[éèëê]'), 'e')
        .replaceAll(RegExp(r'[íìïî]'), 'i')
        .replaceAll(RegExp(r'[óòöôõ]'), 'o')
        .replaceAll(RegExp(r'[úùüû]'), 'u')
        .replaceAll(RegExp(r'[ñ]'), 'n')
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
  }

  String _generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#\$%&*';
    final random = Random.secure();
    return List.generate(12, (index) => chars[random.nextInt(chars.length)]).join();
  }

  Future<void> _createLeague() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // Step 1: Generate password and create auth user
      _generatedPassword = _generatePassword();

      final userResponse = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/api/auth/create-user'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _adminEmailController.text.trim(),
          'password': _generatedPassword,
          'user_metadata': {
            'name': _adminNameController.text.trim(),
            'phone': _adminPhoneController.text.trim(),
            'role': 'league_admin',
          },
        }),
      );

      if (userResponse.statusCode != 201) {
        final errorData = jsonDecode(userResponse.body);
        throw Exception(errorData['error'] ?? 'Error al crear usuario');
      }

      final userData = jsonDecode(userResponse.body);
      _createdAdminId = userData['user']['id'];

      if (_createdAdminId == null) {
        throw Exception('No se pudo obtener el ID del usuario creado');
      }

      // Step 2: Create the league using the bloc
      if (mounted) {
        context.read<LeagueBloc>().add(CreateLeagueEvent(
          name: _nameController.text.trim(),
          slug: _slugController.text.trim(),
          description: _descriptionController.text.trim(),
          adminId: _createdAdminId!,
        ));
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  void _showCredentialsDialog(String leagueName) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.check_circle, color: AppTheme.success, size: 28),
            const SizedBox(width: 8),
            const Expanded(child: Text('Liga Creada')),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'La liga "$leagueName" ha sido creada exitosamente.',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Credenciales del Administrador:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  _buildCredentialRow('Email:', _adminEmailController.text),
                  const SizedBox(height: 4),
                  _buildCredentialRow('Contraseña:', _generatedPassword ?? ''),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Guarda estas credenciales, no se mostrarán de nuevo.',
              style: TextStyle(
                color: AppTheme.warning,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(
                text: 'Email: ${_adminEmailController.text}\nContraseña: $_generatedPassword',
              ));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Credenciales copiadas')),
              );
            },
            icon: const Icon(Icons.copy),
            label: const Text('Copiar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop(); // Close dialog
              Navigator.of(context).pop(); // Return to dashboard
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Aceptar'),
          ),
        ],
      ),
    );
  }

  Widget _buildCredentialRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
          child: Text(label, style: const TextStyle(color: Colors.grey)),
        ),
        Expanded(
          child: SelectableText(
            value,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<LeagueBloc>(),
      child: BlocConsumer<LeagueBloc, LeagueState>(
        listener: (context, state) {
          if (state is LeagueCreated) {
            setState(() => _isLoading = false);
            _showCredentialsDialog(state.league.name);
          } else if (state is LeagueError) {
            setState(() => _isLoading = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Nueva Liga'),
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
            ),
            body: _isLoading
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Creando liga...'),
                      ],
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // League Section
                          _buildSectionHeader('Información de la Liga'),
                          const SizedBox(height: 16),

                          TextFormField(
                            controller: _nameController,
                            decoration: const InputDecoration(
                              labelText: 'Nombre de la Liga *',
                              hintText: 'Ej: Liga Elite Soccer',
                              prefixIcon: Icon(Icons.emoji_events),
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'El nombre es requerido';
                              }
                              if (value.length < 3) {
                                return 'El nombre debe tener al menos 3 caracteres';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          TextFormField(
                            controller: _slugController,
                            decoration: InputDecoration(
                              labelText: 'Slug (URL) *',
                              hintText: 'Ej: liga-elite-soccer',
                              prefixIcon: const Icon(Icons.link),
                              border: const OutlineInputBorder(),
                              suffix: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Auto',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 12,
                                    ),
                                  ),
                                  Switch(
                                    value: _autoGenerateSlug,
                                    onChanged: (value) {
                                      setState(() => _autoGenerateSlug = value);
                                      if (value) {
                                        _slugController.text = _generateSlug(_nameController.text);
                                      }
                                    },
                                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                ],
                              ),
                            ),
                            enabled: !_autoGenerateSlug,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'El slug es requerido';
                              }
                              if (!RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(value)) {
                                return 'Solo minúsculas, números y guiones';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          TextFormField(
                            controller: _descriptionController,
                            decoration: const InputDecoration(
                              labelText: 'Descripción *',
                              hintText: 'Describe brevemente la liga...',
                              prefixIcon: Icon(Icons.description),
                              border: OutlineInputBorder(),
                            ),
                            maxLines: 3,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'La descripción es requerida';
                              }
                              if (value.length < 10) {
                                return 'La descripción debe tener al menos 10 caracteres';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 32),

                          // Admin Section
                          _buildSectionHeader('Administrador de la Liga'),
                          const SizedBox(height: 8),
                          Text(
                            'Se creará una cuenta para el administrador de esta liga',
                            style: TextStyle(color: Colors.grey[600], fontSize: 13),
                          ),
                          const SizedBox(height: 16),

                          TextFormField(
                            controller: _adminNameController,
                            decoration: const InputDecoration(
                              labelText: 'Nombre del Administrador *',
                              hintText: 'Ej: Juan Pérez',
                              prefixIcon: Icon(Icons.person),
                              border: OutlineInputBorder(),
                            ),
                            textCapitalization: TextCapitalization.words,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'El nombre es requerido';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          TextFormField(
                            controller: _adminEmailController,
                            decoration: const InputDecoration(
                              labelText: 'Email del Administrador *',
                              hintText: 'Ej: admin@liga.com',
                              prefixIcon: Icon(Icons.email),
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'El email es requerido';
                              }
                              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                                return 'Ingresa un email válido';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          TextFormField(
                            controller: _adminPhoneController,
                            decoration: const InputDecoration(
                              labelText: 'Teléfono del Administrador',
                              hintText: 'Ej: +52 123 456 7890',
                              prefixIcon: Icon(Icons.phone),
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.phone,
                          ),

                          const SizedBox(height: 32),

                          // Submit Button
                          SizedBox(
                            height: 50,
                            child: ElevatedButton.icon(
                              onPressed: _createLeague,
                              icon: const Icon(Icons.add_circle),
                              label: const Text(
                                'Crear Liga',
                                style: TextStyle(fontSize: 16),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.success,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 24,
          decoration: BoxDecoration(
            color: AppTheme.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
